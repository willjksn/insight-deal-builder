import { FieldValue, Firestore } from "firebase-admin/firestore";
import { stripUndefined, deepCleanForFirestore } from "@/lib/firebase/firestore";
import { BRAND_PROFILES_COLLECTION, IDEA_SESSIONS_COLLECTION } from "@/lib/contentIdeas/collections";
import { briefFromIdeaAndProfile } from "@/lib/contentIdeas/briefFromIdea";
import { ideaToConceptDocument } from "@/lib/contentIdeas/ideaEngineAi";
import {
  BrandProfile,
  ContentIdea,
  IdeaGenerationSession,
} from "@/lib/contentIdeas/types";
import { Project } from "@/lib/types";
import { inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { ScriptWriterMessage } from "@/lib/scriptWriter/types";

export async function createProjectFromIdea(params: {
  db: Firestore;
  uid: string;
  sessionId: string;
  ideaId: string;
  projectName?: string;
}): Promise<{ projectId: string; scriptSessionId: string; idea: ContentIdea }> {
  const { db, uid, sessionId, ideaId, projectName } = params;

  const sessionSnap = await db.collection(IDEA_SESSIONS_COLLECTION).doc(sessionId).get();
  if (!sessionSnap.exists) throw new Error("Idea session not found");
  const session = { id: sessionSnap.id, ...sessionSnap.data() } as IdeaGenerationSession;
  if (session.userId !== uid) throw new Error("Not authorized");

  const idea = session.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea not found in session");

  let profile: BrandProfile | null = null;
  if (session.profileId) {
    const pSnap = await db.collection(BRAND_PROFILES_COLLECTION).doc(session.profileId).get();
    if (pSnap.exists && (pSnap.data() as BrandProfile).userId === uid) {
      profile = { ...(pSnap.data() as BrandProfile), id: pSnap.id };
    }
  }

  const name = projectName?.trim() || idea.title;
  const clientName = profile?.basic.businessOrCreatorName ?? profile?.basic.profileName ?? "";
  const location =
    idea.production?.recommendedLocation ?? profile?.basic.location ?? profile?.creatorIdentity?.preferredLocations ?? "";

  const projectPayload = stripUndefined({
    projectName: name,
    clientId: profile?.linkedClientId ?? "",
    clientName,
    agreementType: "client_project" as const,
    projectType: "Business Brand Package" as Project["projectType"],
    shootType: "Photo + Video" as Project["shootType"],
    totalProjectFee: 0,
    shootDate: "",
    deliveryDate: "",
    location,
    status: "draft" as const,
    ownerUserId: uid,
    sourceIdeaEngine: true,
    sourceIdeaSessionId: sessionId,
    sourceIdeaId: ideaId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const projectRef = await db.collection("projects").add(projectPayload);
  const projectId = projectRef.id;

  const brief = briefFromIdeaAndProfile(idea, session.inputs, profile);
  const conceptDoc = ideaToConceptDocument(idea, profile);

  const userMessage: ScriptWriterMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: `Develop this content idea into a full production-ready script and detailed shot list.\n\n${conceptDoc}`,
    createdAt: new Date().toISOString(),
  };

  const scriptRef = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).add(
    stripUndefined({
      userId: uid,
      title: idea.title,
      initialIdea: conceptDoc,
      brief,
      workflowMode: "text",
      detailLevel: inferScriptDetailLevel(brief),
      status: "interviewing",
      messages: [userMessage],
      script: null,
      linkedProjectId: projectId,
      detailedShotList: true,
      storyboardMode: false,
      trendsResearch: session.trendsResearch ?? null,
      sourceIdeaEngine: true,
      sourceIdeaSessionId: sessionId,
      sourceIdeaId: ideaId,
      refineUsed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  const updatedIdeas = session.ideas.map((i) =>
    i.id === ideaId
      ? {
          ...i,
          projectId,
          scriptSessionId: scriptRef.id,
          status: "converted_to_project" as const,
        }
      : i
  );

  await db.collection(IDEA_SESSIONS_COLLECTION).doc(sessionId).update(
    stripUndefined({
      ideas: deepCleanForFirestore(updatedIdeas),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  return { projectId, scriptSessionId: scriptRef.id, idea: { ...idea, projectId, status: "converted_to_project" } };
}
