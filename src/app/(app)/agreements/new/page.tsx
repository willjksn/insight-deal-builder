"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { WizardSteps, WizardNav } from "@/components/layout/WizardNav";
import { SignaturePad } from "@/components/signatures/SignaturePad";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { useServicePackages } from "@/hooks/useServicePackages";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCreateQuotes,
  canEditQuotes,
  canReadInsightData,
  canManageProjects,
  isPartnerOrgUser,
} from "@/lib/utils/permissions";
import {
  Agreement,
  AgreementParty,
  AgreementRole,
  AgreementType,
  Client,
  Company,
  CrewMember,
  Deliverable,
  GearItem,
  Project,
  CustomPayout,
  Template,
} from "@/lib/types";
import {
  PROJECT_TYPES,
  SHOOT_TYPES,
  CREW_ROLES,
  ROLE_RESPONSIBILITIES,
  DELIVERABLE_OPTIONS,
  GEAR_PACKAGES,
  DELIVERABLE_PRESETS_BY_PROJECT,
} from "@/lib/constants/presets";
import { getClausesForType, mergeClausesWithDefaults } from "@/lib/constants/clauses";
import { applyTemplateToAgreement, listTemplateOptions } from "@/lib/templates/applyTemplate";
import {
  createEmptyAgreement,
  createDefaultEquipmentRentalParties,
  suggestInsightPercentage,
  calculatePayoutTotals,
  syncPayoutAmounts,
  getProjectOverview,
  generateAgreementTitle,
  suggestPaymentTerms,
  syncPaymentSplitFromDeposit,
  syncPaymentSplitFromBalance,
  ensureInsightPartyForInternal,
  ensurePartiesForCreator,
} from "@/lib/agreement/defaults";
import { getDocument } from "@/lib/firebase/firestore";
import { applyServicePackageToAgreement, buildPayoutFromPackage } from "@/lib/agreement/packages";
import {
  agreementFromDocument,
  canOpenInWizard,
  duplicateAgreement,
  withAgreementAccessKeys,
} from "@/lib/agreement/lifecycle";
import { generateAgreementPreview } from "@/lib/agreement/preview";
import { advanceWizardStep, getWizardStepLabel, isWizardStepSkipped, WIZARD_STEP_DEFS } from "@/lib/agreement/wizardSteps";
import { EquipmentRentalStep } from "@/components/agreements/EquipmentRentalStep";
import { PaymentPromotionFields } from "@/components/agreements/PaymentPromotionFields";
import { PayeeEngagementStep } from "@/components/agreements/PayeeEngagementStep";
import { LocationAgreementStep } from "@/components/agreements/LocationAgreementStep";
import {
  createDefaultContractorParties,
  createDefaultTalentParties,
  createDefaultLocationParties,
} from "@/lib/agreement/payeePartiesDefaults";
import { QuoteScopeAssistant } from "@/components/agreements/QuoteScopeAssistant";
import { applyScopeSuggestionToAgreement } from "@/lib/agreement/applyScopeSuggestion";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import {
  applyQuickQuoteToAgreement,
  clearQuickQuoteDraft,
  loadQuickQuoteDraft,
} from "@/lib/quickQuote/apply";
import { revenueGetProposalAgreementPrefill, revenueUpdateProposal } from "@/lib/revenueOpportunities/apiClient";
import { cn } from "@/lib/utils/cn";

const STEPS = WIZARD_STEP_DEFS.map((s) => ({ id: s.id, label: s.label }));

function WizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const canReadSetup = canReadInsightData(appUser);
  const canLinkProjects = canManageProjects(appUser);
  const isPartner = isPartnerOrgUser(appUser);
  const { data: companies } = useConditionalCollection<Company>("companies", canReadSetup);
  const { data: clients } = useConditionalCollection<Client>("clients", canReadSetup);
  const { data: crew } = useConditionalCollection<CrewMember>("crewMembers", canReadSetup);
  const { data: projects } = useConditionalCollection<Project>("projects", canLinkProjects);
  const { data: servicePackages } = useServicePackages();
  const { data: customTemplates } = useConditionalCollection<Template>(
    "templates",
    canReadSetup
  );
  const { create, update, saving } = useMutations("agreements");

  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [agreement, setAgreement] = useState(() => createEmptyAgreement());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("client_project");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [previewMode, setPreviewMode] = useState<"full" | "summary" | "client">("full");
  const [signPartyId, setSignPartyId] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [quickQuoteApplied, setQuickQuoteApplied] = useState(false);
  const [revenueProposalApplied, setRevenueProposalApplied] = useState(false);

  const isInternal = agreement.agreementType === "internal_collaboration";
  const isRental = agreement.agreementType === "equipment_rental";
  const isTalent = agreement.agreementType === "talent_agreement";
  const isContractor = agreement.agreementType === "contractor_agreement";
  const isLocation = agreement.agreementType === "location_agreement";
  const isPayee = isTalent || isContractor || isLocation;
  const isEditing = Boolean(draftId);

  const goToStep = (target: number) => {
    if (isWizardStepSkipped(target, agreement.agreementType)) return;
    setStep(target);
  };

  const goNext = () => setStep((s) => advanceWizardStep(s, agreement.agreementType, 1));
  const goBack = () => setStep((s) => advanceWizardStep(s, agreement.agreementType, -1));

  useEffect(() => {
    const editId = searchParams.get("id");
    if (!editId || draftId === editId) return;

    let cancelled = false;
    setLoadingDraft(true);
    getDocument<Agreement>("agreements", editId)
      .then((doc) => {
        if (cancelled || !doc) return;
        if (!canOpenInWizard(doc.status)) {
          router.replace(`/agreements/${editId}`);
          return;
        }
        if (!canEditQuotes(appUser)) {
          router.replace(`/agreements/${editId}`);
          return;
        }
        setAgreement({
          ...agreementFromDocument(doc),
          clauses: mergeClausesWithDefaults(
            getClausesForType(doc.agreementType, doc.gearDetails?.insightGearUsed ?? false),
            doc.clauses
          ),
        });
        setSelectedTemplateId(doc.templateId || doc.agreementType);
        setDraftId(editId);
        if (doc.servicePackageId) setSelectedPackageId(doc.servicePackageId);
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, appUser, draftId, router]);

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (!projectId) return;
    if (searchParams.get("fromQuickQuote") === "1") return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setAgreement((prev) => ({
      ...prev,
      projectId,
      agreementType: project.agreementType,
      title: generateAgreementTitle(project.projectName, project.agreementType),
      projectDetails: {
        ...prev.projectDetails,
        projectName: project.projectName,
        clientName: project.clientName,
        projectType: project.projectType,
        shootType: project.shootType,
        shootDate: project.shootDate,
        deliveryDate: project.deliveryDate,
        location: project.location,
        projectOverview: getProjectOverview(project.projectType),
      },
      paymentTerms: suggestPaymentTerms(project.totalProjectFee),
      payoutDetails: project.agreementType === "internal_collaboration"
        ? { ...createEmptyAgreement("internal_collaboration").payoutDetails!, totalProjectFee: project.totalProjectFee }
        : undefined,
    }));
  }, [searchParams, projects]);

  useEffect(() => {
    if (quickQuoteApplied) return;
    if (searchParams.get("fromQuickQuote") !== "1") return;
    const draft = loadQuickQuoteDraft();
    if (!draft) return;

    const projectId = searchParams.get("projectId") ?? undefined;

    setAgreement((prev) => {
      let base = prev;
      if (base.agreementType !== "client_project") {
        const empty = createEmptyAgreement("client_project");
        base = {
          ...empty,
          parties: prev.parties,
          title: prev.title || empty.title,
        };
        base = { ...base, ...applyTemplateToAgreement(base, "client_project", customTemplates) };
      }
      if (projectId) {
        base = { ...base, projectId };
      }
      const { patch, selectedPackageId: pkgId } = applyQuickQuoteToAgreement(
        base as Agreement,
        draft,
        servicePackages
      );
      if (pkgId) setSelectedPackageId(pkgId);
      return { ...base, ...patch };
    });

    setSelectedTemplateId("client_project");
    clearQuickQuoteDraft();
    setQuickQuoteApplied(true);
    setStep(2);
  }, [quickQuoteApplied, searchParams, servicePackages, customTemplates]);

  useEffect(() => {
    if (revenueProposalApplied) return;
    const proposalId = searchParams.get("revenueProposalId");
    if (!proposalId || !user) return;

    let cancelled = false;
    revenueGetProposalAgreementPrefill(() => user.getIdToken(), proposalId)
      .then(({ agreementPatch }) => {
        if (cancelled) return;
        setAgreement((prev) => {
          let base = prev;
          if (base.agreementType !== "client_project") {
            const empty = createEmptyAgreement("client_project");
            base = {
              ...empty,
              parties: prev.parties,
              title: prev.title || empty.title,
            };
            base = { ...base, ...applyTemplateToAgreement(base, "client_project", customTemplates) };
          }
          return { ...base, ...agreementPatch };
        });
        setSelectedTemplateId("client_project");
        setRevenueProposalApplied(true);
        setStep(1);
      })
      .catch(() => {
        /* prefill optional — wizard still usable without it */
      });

    return () => {
      cancelled = true;
    };
  }, [revenueProposalApplied, searchParams, user, customTemplates]);

  useEffect(() => {
    if (!isInternal) return;
    setAgreement((prev) => {
      const parties = ensurePartiesForCreator(prev.parties, appUser?.company, companies);
      if (parties.length === prev.parties.length && parties.every((p, i) => p.id === prev.parties[i]?.id)) {
        return prev;
      }
      return { ...prev, parties };
    });
  }, [isInternal, companies, appUser?.company]);

  useEffect(() => {
    if (!isPartner || !canCreateQuotes(appUser)) return;
    setAgreement((prev) => {
      if (prev.agreementType === "internal_collaboration" && prev.parties.length > 0) return prev;
      const empty = createEmptyAgreement("internal_collaboration");
      const parties = ensurePartiesForCreator([], appUser?.company, companies);
      return { ...empty, parties, title: prev.title || empty.title };
    });
    setSelectedTemplateId("internal_collaboration");
  }, [isPartner, appUser, companies]);

  const updateAgreement = useCallback((patch: Partial<Agreement>) => {
    setAgreement((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyPackage = useCallback(
    (packageId: string) => {
      const pkg = servicePackages.find((p) => p.id === packageId);
      if (!pkg) return;
      setSelectedPackageId(packageId);
      setAgreement((prev) => ({
        ...prev,
        ...applyServicePackageToAgreement(prev, pkg),
        servicePackageId: packageId,
      }));
    },
    [servicePackages]
  );

  const recalcPayoutFromPackage = useCallback(() => {
    if (!selectedPackageId || !isInternal) return;
    const pkg = servicePackages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;
    setAgreement((prev) => ({
      ...prev,
      payoutDetails: buildPayoutFromPackage(pkg, prev.projectDetails),
      paymentTerms: suggestPaymentTerms(pkg.price),
    }));
  }, [selectedPackageId, servicePackages, isInternal]);

  const buildSavePayload = useCallback(
    (status: Agreement["status"]) => {
      const payload = withAgreementAccessKeys({
        ...agreement,
        servicePackageId: selectedPackageId || agreement.servicePackageId,
        status,
        createdBy: user?.uid || agreement.createdBy || "",
      });
      if (payload.agreementType !== "internal_collaboration") {
        delete (payload as { payoutDetails?: unknown }).payoutDetails;
      }
      return payload;
    },
    [agreement, selectedPackageId, user?.uid]
  );

  const saveDraft = async () => {
    const data = buildSavePayload("draft");
    let agreementId = draftId;
    if (draftId) {
      await update(draftId, data);
    } else {
      agreementId = await create(data);
      setDraftId(agreementId);
      router.replace(`/agreements/new?id=${agreementId}`);
    }
    await linkRevenueProposalIfNeeded(agreementId);
  };

  const finishWizard = async () => {
    const data = buildSavePayload("ready_for_signature");
    let id = draftId;
    if (draftId) {
      await update(draftId, data);
    } else {
      id = await create(data);
    }
    await linkRevenueProposalIfNeeded(id);
    router.push(`/agreements/${id}/sign`);
  };

  const linkRevenueProposalIfNeeded = async (agreementId: string | null) => {
    const proposalId = searchParams.get("revenueProposalId");
    if (!proposalId || !agreementId || !user) return;
    try {
      await revenueUpdateProposal(() => user.getIdToken(), proposalId, { agreementId });
    } catch {
      /* proposal link is best-effort */
    }
  };

  const addParty = () => {
    const party: AgreementParty = {
      id: crypto.randomUUID(),
      type: "company",
      name: "",
      signerName: "",
      signerTitle: "",
      email: "",
      roleInAgreement: "",
      signatureRequired: true,
      initialsRequired: false,
    };
    updateAgreement({ parties: [...agreement.parties, party] });
  };

  const addRole = () => {
    const role: AgreementRole = {
      id: crypto.randomUUID(),
      personOrCompanyName: "",
      role: "Lead Producer",
      responsibilities: ROLE_RESPONSIBILITIES["Lead Producer"] || [],
      paymentType: "flat",
      paymentAmount: 0,
      signatureRequired: false,
      initialsRequired: false,
    };
    updateAgreement({ roles: [...agreement.roles, role] });
  };

  const addCustomPayoutLine = () => {
    if (!agreement.payoutDetails) return;
    const line: CustomPayout = {
      id: crypto.randomUUID(),
      name: "",
      role: "Production Assistant",
      amount: 0,
    };
    updateAgreement({
      payoutDetails: {
        ...agreement.payoutDetails,
        customPayouts: [...(agreement.payoutDetails.customPayouts ?? []), line],
      },
    });
  };

  const updateCustomPayoutLine = (index: number, patch: Partial<CustomPayout>) => {
    if (!agreement.payoutDetails) return;
    const customPayouts = (agreement.payoutDetails.customPayouts ?? []).map((p, i) =>
      i === index ? { ...p, ...patch } : p
    );
    updateAgreement({ payoutDetails: { ...agreement.payoutDetails, customPayouts } });
  };

  const removeCustomPayoutLine = (index: number) => {
    if (!agreement.payoutDetails) return;
    updateAgreement({
      payoutDetails: {
        ...agreement.payoutDetails,
        customPayouts: (agreement.payoutDetails.customPayouts ?? []).filter((_, i) => i !== index),
      },
    });
  };

  const addDeliverable = (name = "Edited reels", quantity = 1) => {
    const d: Deliverable = { id: crypto.randomUUID(), name, quantity };
    updateAgreement({ deliverables: [...agreement.deliverables, d] });
  };

  const loadDeliverablePreset = () => {
    const preset = DELIVERABLE_PRESETS_BY_PROJECT[agreement.projectDetails.projectType];
    if (!preset) return;
    updateAgreement({
      deliverables: preset.map((p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        quantity: p.quantity,
      })),
    });
  };

  const payout = agreement.payoutDetails;
  const payoutTotals = payout ? calculatePayoutTotals(payout) : null;

  const templateOptions = listTemplateOptions(agreement.agreementType, customTemplates);

  const applyAgreementType = (type: AgreementType) => {
    const empty = createEmptyAgreement(type);
    let parties = empty.parties;
    if (type === "internal_collaboration") {
      parties = ensurePartiesForCreator([], appUser?.company, companies);
    } else if (type === "equipment_rental") {
      parties = createDefaultEquipmentRentalParties(companies);
    } else if (type === "talent_agreement") {
      parties = createDefaultTalentParties(companies);
    } else if (type === "contractor_agreement") {
      parties = createDefaultContractorParties(companies);
    } else if (type === "location_agreement") {
      parties = createDefaultLocationParties(companies);
    }
    const nextAgreement = {
      ...empty,
      parties,
      title: agreement.title || empty.title || generateAgreementTitle(empty.projectDetails.projectName, type),
    };
    const applied = applyTemplateToAgreement(nextAgreement, type, customTemplates);
    setSelectedTemplateId(type);
    setAgreement({ ...nextAgreement, ...applied });
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const applied = applyTemplateToAgreement(agreement, templateId, customTemplates);
    setAgreement((prev) => ({ ...prev, ...applied }));
  };

  const handleApplyScopeSuggestion = useCallback(
    (suggestion: QuoteScopeSuggestion) => {
      setAgreement((prev) => {
        let base = prev;
        if (suggestion.agreementType !== prev.agreementType && !isPartner) {
          const empty = createEmptyAgreement(suggestion.agreementType);
          let parties = empty.parties;
          if (suggestion.agreementType === "internal_collaboration") {
            parties = ensurePartiesForCreator([], appUser?.company, companies);
          } else if (suggestion.agreementType === "equipment_rental") {
            parties = createDefaultEquipmentRentalParties(companies);
          } else if (suggestion.agreementType === "talent_agreement") {
            parties = createDefaultTalentParties(companies);
          } else if (suggestion.agreementType === "contractor_agreement") {
            parties = createDefaultContractorParties(companies);
          } else if (suggestion.agreementType === "location_agreement") {
            parties = createDefaultLocationParties(companies);
          }
          base = {
            ...empty,
            parties,
            title: prev.title || empty.title,
          };
          base = { ...base, ...applyTemplateToAgreement(base, suggestion.agreementType, customTemplates) };
          setSelectedTemplateId(suggestion.agreementType);
        }

        const { patch, selectedPackageId: pkgId } = applyScopeSuggestionToAgreement(
          base as Agreement,
          suggestion,
          servicePackages
        );
        if (pkgId) setSelectedPackageId(pkgId);
        return { ...base, ...patch };
      });
      setStep(2);
    },
    [servicePackages, isPartner, appUser?.company, companies, customTemplates]
  );

  const handleApplySuggestedFee = useCallback((fee: number) => {
    setAgreement((prev) => {
      if (!prev.payoutDetails) return prev;
      return {
        ...prev,
        payoutDetails: syncPayoutAmounts({ ...prev.payoutDetails, totalProjectFee: fee }),
        paymentTerms: suggestPaymentTerms(fee),
      };
    });
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Select
              label="Agreement Type"
              value={agreement.agreementType}
              onChange={(e) => applyAgreementType(e.target.value as AgreementType)}
              options={
                isPartner
                  ? [{ value: "internal_collaboration", label: "Internal Collaboration Agreement" }]
                  : [
                      { value: "internal_collaboration", label: "Internal Collaboration Agreement" },
                      { value: "client_project", label: "Client Project Agreement" },
                      { value: "equipment_rental", label: "Equipment Rental Agreement" },
                      { value: "talent_agreement", label: "Talent Agreement" },
                      { value: "contractor_agreement", label: "Contractor / Crew Agreement" },
                      { value: "location_agreement", label: "Location & Prop Agreement" },
                    ]
              }
              touch
            />
            {templateOptions.length > 1 && (
              <Select
                label="Template"
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                options={templateOptions.map((t) => ({
                  value: t.id,
                  label: t.isBuiltin ? t.name : `${t.name} (custom)`,
                }))}
                touch
              />
            )}
            {templateOptions.length === 1 && (
              <p className="text-sm text-slate-500">
                Using the built-in template for this agreement type. Add custom templates under{" "}
                <a href="/templates" className="font-medium text-sky-700 hover:underline">
                  Templates
                </a>
                .
              </p>
            )}
            <Input label="Agreement Title" value={agreement.title} onChange={(e) => updateAgreement({ title: e.target.value })} touch />
            <Select
              label="Link to Project"
              value={agreement.projectId || ""}
              onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value);
                updateAgreement({
                  projectId: e.target.value || undefined,
                  title: p ? generateAgreementTitle(p.projectName, agreement.agreementType) : agreement.title,
                  projectDetails: p
                    ? { ...agreement.projectDetails, projectName: p.projectName, clientName: p.clientName, projectType: p.projectType, shootType: p.shootType }
                    : agreement.projectDetails,
                });
              }}
              options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.id, label: p.projectName }))]}
              touch
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            {isInternal ? (
              <>
                <Select label="Who originated the client?" value={agreement.projectDetails.clientOriginated || ""} onChange={(e) => {
                  const clientOriginated = e.target.value as Agreement["projectDetails"]["clientOriginated"];
                  const projectDetails = { ...agreement.projectDetails, clientOriginated };
                  const patch: Partial<Agreement> = { projectDetails };
                  if (selectedPackageId && isInternal) {
                    const pkg = servicePackages.find((p) => p.id === selectedPackageId);
                    if (pkg) patch.payoutDetails = buildPayoutFromPackage(pkg, projectDetails);
                  }
                  updateAgreement(patch);
                }} options={[{ value: "", label: "Select..." }, { value: "Insight Media Group LLC", label: "Insight Media Group LLC" }, ...companies.filter((c) => c.displayName !== "Insight Media Group LLC").map((c) => ({ value: c.displayName, label: c.displayName })), { value: "Joint", label: "Joint" }, { value: "Other", label: "Other" }]} touch />
                <Select label="Who owns the client relationship?" value={agreement.projectDetails.clientOwner || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, clientOwner: e.target.value as Agreement["projectDetails"]["clientOwner"] } })} options={[{ value: "", label: "Select..." }, { value: "Insight Media Group LLC", label: "Insight Media Group LLC" }, ...companies.filter((c) => c.displayName !== "Insight Media Group LLC").map((c) => ({ value: c.displayName, label: c.displayName })), { value: "Joint / shared by written agreement", label: "Joint / shared by written agreement" }]} touch />
                <Select label="Who is lead producer?" value={agreement.projectDetails.leadProducer || ""} onChange={(e) => {
                  const leadProducer = e.target.value as Agreement["projectDetails"]["leadProducer"];
                  const projectDetails = { ...agreement.projectDetails, leadProducer };
                  const patch: Partial<Agreement> = { projectDetails };
                  if (selectedPackageId && isInternal) {
                    const pkg = servicePackages.find((p) => p.id === selectedPackageId);
                    if (pkg) patch.payoutDetails = buildPayoutFromPackage(pkg, projectDetails);
                  }
                  updateAgreement(patch);
                }} options={[{ value: "", label: "Select..." }, { value: "Insight Media Group LLC", label: "Insight Media Group LLC" }, ...companies.filter((c) => c.displayName !== "Insight Media Group LLC").map((c) => ({ value: c.displayName, label: c.displayName })), { value: "Joint", label: "Joint" }]} touch />
              </>
            ) : canReadSetup ? (
              <Select label="Client" value="" onChange={(e) => {
                const c = clients.find((x) => x.id === e.target.value);
                if (!c) return;
                const party: AgreementParty = { id: crypto.randomUUID(), type: "client", name: c.businessName, signerName: c.authorizedSignerName || c.contactName, signerTitle: c.authorizedSignerTitle, email: c.email, roleInAgreement: "Client", signatureRequired: true };
                const prod = companies.find((co) => co.legalName.includes("Insight Media Group"));
                const prodParty: AgreementParty | undefined = prod ? { id: crypto.randomUUID(), type: "company", name: prod.displayName, signerName: prod.authorizedSignerName, signerTitle: prod.authorizedSignerTitle, email: prod.email, roleInAgreement: "Production Company", signatureRequired: true } : undefined;
                updateAgreement({ parties: prodParty ? [prodParty, party] : [party], projectDetails: { ...agreement.projectDetails, clientName: c.businessName } });
              }} options={[{ value: "", label: "Select client..." }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]} touch />
            ) : (
              <p className="text-sm text-slate-500">Add client parties manually in the list below.</p>
            )}
            <p className="text-sm text-slate-500">
              Only parties listed here can view this deal after it is saved. Add each collaborator&apos;s company name and email.
            </p>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Parties</h3>
              <Button size="touch" variant="outline" onClick={addParty}>Add Party</Button>
            </div>
            {agreement.parties.map((party, i) => (
              <Card key={party.id}><CardBody className="grid gap-3 md:grid-cols-2">
                <Input label="Name" value={party.name} onChange={(e) => { const p = [...agreement.parties]; p[i] = { ...party, name: e.target.value }; updateAgreement({ parties: p }); }} touch />
                <Input label="Signer Name" value={party.signerName} onChange={(e) => { const p = [...agreement.parties]; p[i] = { ...party, signerName: e.target.value }; updateAgreement({ parties: p }); }} touch />
                <Input label="Role" value={party.roleInAgreement} onChange={(e) => { const p = [...agreement.parties]; p[i] = { ...party, roleInAgreement: e.target.value }; updateAgreement({ parties: p }); }} touch />
                <Input label="Email" value={party.email || ""} onChange={(e) => { const p = [...agreement.parties]; p[i] = { ...party, email: e.target.value }; updateAgreement({ parties: p }); }} touch />
              </CardBody></Card>
            ))}
          </div>
        );

      case 2:
        if (isRental && agreement.equipmentRentalDetails) {
          const rental = agreement.equipmentRentalDetails;
          return (
            <div className="space-y-4">
              <Input
                label="Rental name"
                value={agreement.projectDetails.projectName}
                onChange={(e) =>
                  updateAgreement({
                    projectDetails: { ...agreement.projectDetails, projectName: e.target.value },
                    title: generateAgreementTitle(e.target.value, agreement.agreementType),
                  })
                }
                touch
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Rental start"
                  type="date"
                  value={rental.rentalStartDate || ""}
                  onChange={(e) =>
                    updateAgreement({
                      equipmentRentalDetails: { ...rental, rentalStartDate: e.target.value },
                      projectDetails: { ...agreement.projectDetails, shootDate: e.target.value },
                    })
                  }
                  touch
                />
                <Input
                  label="Rental end"
                  type="date"
                  value={rental.rentalEndDate || ""}
                  onChange={(e) =>
                    updateAgreement({
                      equipmentRentalDetails: { ...rental, rentalEndDate: e.target.value },
                      projectDetails: { ...agreement.projectDetails, deliveryDate: e.target.value },
                    })
                  }
                  touch
                />
                <Input
                  label="Pickup location"
                  value={rental.pickupLocation || ""}
                  onChange={(e) =>
                    updateAgreement({
                      equipmentRentalDetails: { ...rental, pickupLocation: e.target.value },
                      projectDetails: { ...agreement.projectDetails, location: e.target.value },
                    })
                  }
                  touch
                />
                <Input
                  label="Return location"
                  value={rental.returnLocation || ""}
                  onChange={(e) =>
                    updateAgreement({ equipmentRentalDetails: { ...rental, returnLocation: e.target.value } })
                  }
                  touch
                />
              </div>
              <Textarea
                label="Rental notes"
                value={agreement.projectDetails.notes || ""}
                onChange={(e) =>
                  updateAgreement({ projectDetails: { ...agreement.projectDetails, notes: e.target.value } })
                }
                touch
              />
            </div>
          );
        }
        if (isTalent && agreement.talentAgreementDetails) {
          const talent = agreement.talentAgreementDetails;
          return (
            <div className="space-y-4">
              <Input
                label="Production / project name"
                value={agreement.projectDetails.projectName}
                onChange={(e) =>
                  updateAgreement({
                    projectDetails: { ...agreement.projectDetails, projectName: e.target.value },
                    title: generateAgreementTitle(e.target.value, agreement.agreementType),
                  })
                }
                touch
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Engagement start" type="date" value={talent.engagementStartDate || ""} onChange={(e) => updateAgreement({ talentAgreementDetails: { ...talent, engagementStartDate: e.target.value }, projectDetails: { ...agreement.projectDetails, shootDate: e.target.value } })} touch />
                <Input label="Engagement end" type="date" value={talent.engagementEndDate || ""} onChange={(e) => updateAgreement({ talentAgreementDetails: { ...talent, engagementEndDate: e.target.value }, projectDetails: { ...agreement.projectDetails, deliveryDate: e.target.value } })} touch />
                <Input label="Location" value={talent.location || ""} onChange={(e) => updateAgreement({ talentAgreementDetails: { ...talent, location: e.target.value }, projectDetails: { ...agreement.projectDetails, location: e.target.value } })} touch />
              </div>
              <Textarea label="Project overview" value={agreement.projectDetails.projectOverview} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, projectOverview: e.target.value } })} touch />
            </div>
          );
        }
        if (isContractor && agreement.contractorAgreementDetails) {
          const contractor = agreement.contractorAgreementDetails;
          return (
            <div className="space-y-4">
              <Input
                label="Project name"
                value={agreement.projectDetails.projectName}
                onChange={(e) =>
                  updateAgreement({
                    projectDetails: { ...agreement.projectDetails, projectName: e.target.value },
                    title: generateAgreementTitle(e.target.value, agreement.agreementType),
                  })
                }
                touch
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Service start" type="date" value={contractor.serviceStartDate || ""} onChange={(e) => updateAgreement({ contractorAgreementDetails: { ...contractor, serviceStartDate: e.target.value }, projectDetails: { ...agreement.projectDetails, shootDate: e.target.value } })} touch />
                <Input label="Service end" type="date" value={contractor.serviceEndDate || ""} onChange={(e) => updateAgreement({ contractorAgreementDetails: { ...contractor, serviceEndDate: e.target.value }, projectDetails: { ...agreement.projectDetails, deliveryDate: e.target.value } })} touch />
                <Input label="Location" value={agreement.projectDetails.location || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, location: e.target.value } })} touch />
              </div>
              <Textarea label="Project overview" value={agreement.projectDetails.projectOverview} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, projectOverview: e.target.value } })} touch />
            </div>
          );
        }
        if (isLocation && agreement.locationAgreementDetails) {
          const loc = agreement.locationAgreementDetails;
          return (
            <div className="space-y-4">
              <Input
                label="Production / project name"
                value={agreement.projectDetails.projectName}
                onChange={(e) =>
                  updateAgreement({
                    projectDetails: { ...agreement.projectDetails, projectName: e.target.value },
                    title: generateAgreementTitle(e.target.value, agreement.agreementType),
                  })
                }
                touch
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Use start" type="date" value={loc.useStartDate || ""} onChange={(e) => updateAgreement({ locationAgreementDetails: { ...loc, useStartDate: e.target.value }, projectDetails: { ...agreement.projectDetails, shootDate: e.target.value } })} touch />
                <Input label="Use end" type="date" value={loc.useEndDate || ""} onChange={(e) => updateAgreement({ locationAgreementDetails: { ...loc, useEndDate: e.target.value }, projectDetails: { ...agreement.projectDetails, deliveryDate: e.target.value } })} touch />
                <Input label="Shoot dates (notes)" value={loc.shootDates || ""} onChange={(e) => updateAgreement({ locationAgreementDetails: { ...loc, shootDates: e.target.value } })} touch />
              </div>
              <Textarea label="Project overview" value={agreement.projectDetails.projectOverview} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, projectOverview: e.target.value } })} touch />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {servicePackages.length > 0 && (
              <div>
                <Select
                  label="Service package"
                  value={selectedPackageId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setSelectedPackageId("");
                      return;
                    }
                    applyPackage(id);
                  }}
                  options={[
                    { value: "", label: "Custom / enter manually" },
                    ...servicePackages.map((p) => ({
                      value: p.id,
                      label: `${p.name} — $${p.price.toLocaleString()}`,
                    })),
                  ]}
                  touch
                />
                <p className="mt-1 text-xs text-slate-500">
                  Auto-fills price, deliverables, payment terms, and payout splits.
                </p>
              </div>
            )}
            <Input label="Project Name" value={agreement.projectDetails.projectName} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, projectName: e.target.value }, title: generateAgreementTitle(e.target.value, agreement.agreementType) })} touch />
            <Select label="Project Type" value={agreement.projectDetails.projectType} onChange={(e) => { const pt = e.target.value as Agreement["projectDetails"]["projectType"]; updateAgreement({ projectDetails: { ...agreement.projectDetails, projectType: pt, projectOverview: getProjectOverview(pt) } }); }} options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))} touch />
            <Select label="Shoot Type" value={agreement.projectDetails.shootType} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, shootType: e.target.value as Agreement["projectDetails"]["shootType"] } })} options={SHOOT_TYPES.map((t) => ({ value: t, label: t }))} touch />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Shoot Date" type="date" value={agreement.projectDetails.shootDate || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, shootDate: e.target.value } })} touch />
              <Input label="Shoot Time" value={agreement.projectDetails.shootTime || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, shootTime: e.target.value } })} touch />
              <Input label="Delivery Date" type="date" value={agreement.projectDetails.deliveryDate || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, deliveryDate: e.target.value } })} touch />
              <Input label="Location" value={agreement.projectDetails.location || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, location: e.target.value } })} touch />
            </div>
            <Textarea label="Project Overview" value={agreement.projectDetails.projectOverview} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, projectOverview: e.target.value } })} touch />
            <Textarea label="Notes" value={agreement.projectDetails.notes || ""} onChange={(e) => updateAgreement({ projectDetails: { ...agreement.projectDetails, notes: e.target.value } })} touch />
          </div>
        );

      case 3:
        if (isRental || isPayee) return <p className="text-slate-500">Roles are not used on this agreement type.</p>;
        return (
          <div className="space-y-4">
            <div className="flex justify-between"><h3 className="font-semibold">Roles</h3><Button size="touch" variant="outline" onClick={addRole}>Add Role</Button></div>
            {agreement.roles.map((role, i) => (
              <Card key={role.id}><CardBody className="grid gap-3 md:grid-cols-2">
                <Select label="Quick fill" value="" onChange={(e) => { const m = crew.find((c) => c.id === e.target.value); if (!m) return; const r = [...agreement.roles]; r[i] = { ...role, personOrCompanyName: m.name, role: m.defaultRole || role.role, paymentAmount: m.defaultRate }; updateAgreement({ roles: r }); }} options={[{ value: "", label: "Crew member..." }, ...crew.map((c) => ({ value: c.id, label: c.name }))]} touch />
                <Select label="Role" value={role.role} onChange={(e) => { const r = [...agreement.roles]; r[i] = { ...role, role: e.target.value, responsibilities: ROLE_RESPONSIBILITIES[e.target.value] || role.responsibilities }; updateAgreement({ roles: r }); }} options={CREW_ROLES.map((r) => ({ value: r, label: r }))} touch />
                <Input label="Person / Company" value={role.personOrCompanyName} onChange={(e) => { const r = [...agreement.roles]; r[i] = { ...role, personOrCompanyName: e.target.value }; updateAgreement({ roles: r }); }} touch />
                <Input label="Payment Amount" type="number" value={role.paymentAmount ?? ""} onChange={(e) => { const r = [...agreement.roles]; r[i] = { ...role, paymentAmount: Number(e.target.value) }; updateAgreement({ roles: r }); }} touch />
              </CardBody></Card>
            ))}
          </div>
        );

      case 4:
        if (isRental || isPayee) return <p className="text-slate-500">Payout splits are not used on this agreement type.</p>;
        if (!isInternal || !payout) return <p className="text-slate-500">Payout calculator is for internal agreements only.</p>;
        return (
          <div className="space-y-4">
            {selectedPackageId && (
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    Package:{" "}
                    <span className="font-semibold text-slate-900">
                      {servicePackages.find((p) => p.id === selectedPackageId)?.name}
                    </span>
                  </p>
                  <Button size="sm" variant="outline" onClick={recalcPayoutFromPackage}>
                    Recalculate from package
                  </Button>
                </CardBody>
              </Card>
            )}
            <Input label="Total Project Fee" type="number" value={payout.totalProjectFee} onChange={(e) => { const fee = Number(e.target.value); updateAgreement({ payoutDetails: syncPayoutAmounts({ ...payout, totalProjectFee: fee }), paymentTerms: suggestPaymentTerms(fee) }); }} touch />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={payout.insightGearUsed} onChange={(e) => { const suggested = suggestInsightPercentage(agreement.projectDetails.clientOriginated, agreement.projectDetails.leadProducer, e.target.checked); updateAgreement({ payoutDetails: syncPayoutAmounts({ ...payout, insightGearUsed: e.target.checked, insightFeePercentage: suggested.percentage }), gearDetails: agreement.gearDetails ? { ...agreement.gearDetails, insightGearUsed: e.target.checked } : undefined }); }} className="h-5 w-5" /> Insight gear used</label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Insight %" type="number" value={payout.insightFeePercentage ?? ""} onChange={(e) => updateAgreement({ payoutDetails: syncPayoutAmounts({ ...payout, insightFeePercentage: Number(e.target.value) }) })} touch />
              <Input label="Insight $" type="number" value={payout.insightFeeAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: { ...payout, insightFeeAmount: Number(e.target.value) } })} touch />
              <Input label="Partner $" type="number" value={payout.aveFeeAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: { ...payout, aveFeeAmount: Number(e.target.value) } })} touch />
              <Input label="Assistant $" type="number" value={payout.assistantFeeAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: syncPayoutAmounts({ ...payout, assistantFeeAmount: Number(e.target.value) }) })} touch />
              <Input label="Talent $" type="number" value={payout.talentFeeAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: syncPayoutAmounts({ ...payout, talentFeeAmount: Number(e.target.value) }) })} touch />
              <Input label="Editor $" type="number" value={payout.editorFeeAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: { ...payout, editorFeeAmount: Number(e.target.value) } })} touch />
              <Input label="Expenses $" type="number" value={payout.expensesAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: { ...payout, expensesAmount: Number(e.target.value) } })} touch />
              <Input label="Film Fund $" type="number" value={payout.filmFundReserveAmount ?? ""} onChange={(e) => updateAgreement({ payoutDetails: { ...payout, filmFundReserveAmount: Number(e.target.value) } })} touch />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Custom payout lines</h3>
                <Button size="sm" variant="outline" onClick={addCustomPayoutLine}>Add custom</Button>
              </div>
              {(payout.customPayouts ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">Optional crew or contractor amounts beyond the fields above.</p>
              ) : (
                <div className="space-y-2">
                  {(payout.customPayouts ?? []).map((line, i) => (
                    <Card key={line.id}>
                      <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_6rem_auto]">
                        <Input label={i === 0 ? "Name / company" : undefined} value={line.name} onChange={(e) => updateCustomPayoutLine(i, { name: e.target.value })} touch />
                        <Select label={i === 0 ? "Role" : undefined} value={line.role} onChange={(e) => updateCustomPayoutLine(i, { role: e.target.value })} options={CREW_ROLES.map((r) => ({ value: r, label: r }))} touch />
                        <Input label={i === 0 ? "Amount $" : undefined} type="number" min={0} value={line.amount || ""} onChange={(e) => updateCustomPayoutLine(i, { amount: Number(e.target.value) })} touch />
                        <Button size="sm" variant="ghost" className="self-end text-red-600" onClick={() => removeCustomPayoutLine(i)}>Remove</Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            {payoutTotals && (
              <Card><CardBody>
                <p className="font-semibold">Payout Summary</p>
                <p>Total Allocated: ${payoutTotals.total.toLocaleString()}</p>
                <p className={cn(payoutTotals.remaining < 0 ? "text-red-600" : "text-emerald-600")}>Remaining: ${payoutTotals.remaining.toLocaleString()}</p>
                {payoutTotals.exceedsBudget && <Badge variant="danger">Exceeds project fee</Badge>}
              </CardBody></Card>
            )}
          </div>
        );

      case 5:
        if (isRental && agreement.equipmentRentalDetails) {
          return <EquipmentRentalStep agreement={agreement} onChange={updateAgreement} />;
        }
        if (isTalent) {
          return <PayeeEngagementStep mode="talent" agreement={agreement} crew={crew} onChange={updateAgreement} />;
        }
        if (isContractor) {
          return <PayeeEngagementStep mode="contractor" agreement={agreement} crew={crew} onChange={updateAgreement} />;
        }
        if (isLocation && agreement.locationAgreementDetails) {
          return <LocationAgreementStep agreement={agreement} onChange={updateAgreement} />;
        }
        return (
          <div className="space-y-4">
            <Select label="Gear Package" value={agreement.gearDetails?.gearPackage || "No Insight Gear Used"} onChange={(e) => { const pkg = e.target.value as NonNullable<Agreement["gearDetails"]>["gearPackage"]; const g = GEAR_PACKAGES.find((x) => x.name === pkg); updateAgreement({ gearDetails: { ...agreement.gearDetails!, gearPackage: pkg, insightGearUsed: pkg !== "No Insight Gear Used" }, clauses: getClausesForType(agreement.agreementType, pkg !== "No Insight Gear Used") }); }} options={GEAR_PACKAGES.map((g) => ({ value: g.name, label: g.name }))} touch />
            {GEAR_PACKAGES.filter((g) => g.name === agreement.gearDetails?.gearPackage).map((g) => (
              <Card key={g.name}><CardBody><p className="text-sm text-slate-500">{g.description}</p><p className="text-sm mt-2">Suggested: {g.suggestedFeeRange}</p>{g.items.length > 0 && <ul className="mt-2 text-sm list-disc pl-5">{g.items.map((item) => <li key={item}>{item}</li>)}</ul>}</CardBody></Card>
            ))}
            <label className="flex items-center gap-2"><input type="checkbox" checked={agreement.gearDetails?.equipmentFeeIncludedInProducerFee} onChange={(e) => updateAgreement({ gearDetails: { ...agreement.gearDetails!, equipmentFeeIncludedInProducerFee: e.target.checked } })} className="h-5 w-5" /> Equipment fee included in producer fee</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!agreement.gearDetails?.separateEquipmentFee} onChange={(e) => updateAgreement({ gearDetails: { ...agreement.gearDetails!, separateEquipmentFee: e.target.checked ? agreement.gearDetails?.separateEquipmentFee || 0 : undefined } })} className="h-5 w-5" /> Separate equipment fee applies</label>
            {agreement.gearDetails?.separateEquipmentFee !== undefined && (
              <Input label="Separate Equipment Fee" type="number" value={agreement.gearDetails.separateEquipmentFee} onChange={(e) => updateAgreement({ gearDetails: { ...agreement.gearDetails!, separateEquipmentFee: Number(e.target.value) } })} touch />
            )}
            <Textarea label="Gear Responsibility Clause" value={agreement.gearDetails?.gearResponsibilityClause || ""} onChange={(e) => updateAgreement({ gearDetails: { ...agreement.gearDetails!, gearResponsibilityClause: e.target.value } })} touch />
          </div>
        );

      case 6:
        if (isRental || isPayee) return <p className="text-slate-500">Deliverables are not used on this agreement type.</p>;
        return (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button size="touch" variant="outline" onClick={() => addDeliverable()}>Add Deliverable</Button>
              <Button size="touch" variant="outline" onClick={loadDeliverablePreset}>Load Preset</Button>
            </div>
            {agreement.deliverables.map((d, i) => (
              <Card key={d.id}><CardBody className="grid gap-3 md:grid-cols-3">
                <Select label="Deliverable" value={d.name} onChange={(e) => { const ds = [...agreement.deliverables]; ds[i] = { ...d, name: e.target.value }; updateAgreement({ deliverables: ds }); }} options={DELIVERABLE_OPTIONS.map((o) => ({ value: o, label: o }))} touch />
                <Input label="Quantity" type="number" value={d.quantity} onChange={(e) => { const ds = [...agreement.deliverables]; ds[i] = { ...d, quantity: Number(e.target.value) }; updateAgreement({ deliverables: ds }); }} touch />
                <Input label="Format" value={d.format || ""} onChange={(e) => { const ds = [...agreement.deliverables]; ds[i] = { ...d, format: e.target.value }; updateAgreement({ deliverables: ds }); }} touch />
              </CardBody></Card>
            ))}
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <NumberInput label="Total Fee" value={agreement.paymentTerms.totalFee} onChange={(totalFee) => updateAgreement({ paymentTerms: suggestPaymentTerms(totalFee ?? 0) })} touch />
            <Select label="Payment Structure" value={agreement.paymentTerms.paymentStructure} onChange={(e) => updateAgreement({ paymentTerms: { ...agreement.paymentTerms, paymentStructure: e.target.value as Agreement["paymentTerms"]["paymentStructure"] } })} options={[{ value: "100% due before shoot", label: "100% due before shoot" }, { value: "50% deposit / 50% before final delivery", label: "50% deposit / 50% before final delivery" }, { value: "50% deposit / 25% shoot day / 25% before final delivery", label: "50% deposit / 25% shoot day / 25% before final delivery" }, { value: "Monthly retainer paid in advance", label: "Monthly retainer paid in advance" }, { value: "Custom", label: "Custom" }]} touch />
            <div className="grid gap-4 md:grid-cols-2">
              <NumberInput
                label="Deposit"
                value={agreement.paymentTerms.depositAmount}
                onChange={(depositAmount) =>
                  updateAgreement({
                    paymentTerms: syncPaymentSplitFromDeposit(agreement.paymentTerms, depositAmount),
                  })
                }
                touch
              />
              <NumberInput
                label="Balance"
                value={agreement.paymentTerms.balanceAmount}
                onChange={(balanceAmount) =>
                  updateAgreement({
                    paymentTerms: syncPaymentSplitFromBalance(agreement.paymentTerms, balanceAmount),
                  })
                }
                touch
              />
            </div>
            <p className="text-xs text-slate-500">
              Deposit and balance stay in sync — they always add up to the list price before any
              promotion discount.
            </p>
            {(agreement.agreementType === "client_project" ||
              agreement.agreementType === "equipment_rental") && (
              <PaymentPromotionFields
                paymentTerms={agreement.paymentTerms}
                onChange={(paymentTerms) => updateAgreement({ paymentTerms })}
              />
            )}
            <Textarea label="Payment Notes" value={agreement.paymentTerms.paymentNotes || ""} onChange={(e) => updateAgreement({ paymentTerms: { ...agreement.paymentTerms, paymentNotes: e.target.value } })} touch />
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <Card><CardBody className="space-y-3">
              <h3 className="font-semibold">Revisions</h3>
              <Input label="Included Rounds" type="number" value={agreement.revisionPolicy.includedRevisionRounds} onChange={(e) => updateAgreement({ revisionPolicy: { ...agreement.revisionPolicy, includedRevisionRounds: Number(e.target.value) } })} touch />
              <Input label="Request Window (days)" type="number" value={agreement.revisionPolicy.revisionRequestWindowDays} onChange={(e) => updateAgreement({ revisionPolicy: { ...agreement.revisionPolicy, revisionRequestWindowDays: Number(e.target.value) } })} touch />
              <Textarea label="Notes" value={agreement.revisionPolicy.additionalNotes || ""} onChange={(e) => updateAgreement({ revisionPolicy: { ...agreement.revisionPolicy, additionalNotes: e.target.value } })} touch />
            </CardBody></Card>
            <Card><CardBody className="space-y-3">
              <h3 className="font-semibold">Usage Rights</h3>
              {(["organicSocialIncluded", "websiteUseIncluded", "paidAdsIncluded", "fullBuyout"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agreement.usageRights[key]} onChange={(e) => updateAgreement({ usageRights: { ...agreement.usageRights, [key]: e.target.checked } })} className="h-5 w-5" /> {key.replace(/([A-Z])/g, " $1")}</label>
              ))}
              <Textarea label="Usage Notes" value={agreement.usageRights.usageNotes || ""} onChange={(e) => updateAgreement({ usageRights: { ...agreement.usageRights, usageNotes: e.target.value } })} touch />
            </CardBody></Card>
            <Card><CardBody className="space-y-3">
              <h3 className="font-semibold">Raw Footage</h3>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agreement.rawFootagePolicy.rawFootageIncluded} onChange={(e) => updateAgreement({ rawFootagePolicy: { ...agreement.rawFootagePolicy, rawFootageIncluded: e.target.checked } })} className="h-5 w-5" /> Included</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agreement.rawFootagePolicy.availableForPurchase} onChange={(e) => updateAgreement({ rawFootagePolicy: { ...agreement.rawFootagePolicy, availableForPurchase: e.target.checked } })} className="h-5 w-5" /> Available for purchase</label>
              <Input label="Raw Footage Fee" type="number" value={agreement.rawFootagePolicy.rawFootageFee ?? ""} onChange={(e) => updateAgreement({ rawFootagePolicy: { ...agreement.rawFootagePolicy, rawFootageFee: Number(e.target.value) } })} touch />
              <Textarea label="Notes" value={agreement.rawFootagePolicy.notes || ""} onChange={(e) => updateAgreement({ rawFootagePolicy: { ...agreement.rawFootagePolicy, notes: e.target.value } })} touch />
            </CardBody></Card>
          </div>
        );

      case 9:
        return (
          <div className="space-y-3">
            {agreement.clauses.map((clause, i) => (
              <Card key={clause.id}><CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{clause.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{clause.body}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clause.enabled} onChange={(e) => { const c = [...agreement.clauses]; c[i] = { ...clause, enabled: e.target.checked }; updateAgreement({ clauses: c }); }} className="h-5 w-5" /> Include</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clause.requiresInitials} onChange={(e) => { const c = [...agreement.clauses]; c[i] = { ...clause, requiresInitials: e.target.checked }; updateAgreement({ clauses: c }); }} className="h-5 w-5" /> Initials</label>
                  </div>
                </div>
              </CardBody></Card>
            ))}
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(["full", "summary", "client"] as const).map((m) => (
                <Button key={m} size="touch" variant={previewMode === m ? "primary" : "outline"} onClick={() => setPreviewMode(m)}>{m === "full" ? "Full" : m === "summary" ? "Summary" : "Client View"}</Button>
              ))}
            </div>
            <Card><CardBody><pre className="whitespace-pre-wrap text-sm font-sans">{generateAgreementPreview(agreement, previewMode)}</pre></CardBody></Card>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <p className="text-slate-500">Save and continue to the signing page to capture signatures and initials.</p>
            <Select label="Select party to sign (optional preview)" value={signPartyId} onChange={(e) => setSignPartyId(e.target.value)} options={[{ value: "", label: "Select..." }, ...agreement.parties.map((p) => ({ value: p.id, label: p.signerName }))]} touch />
            <label className="flex items-center gap-2"><input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="h-5 w-5" /> I agree to electronic signature consent</label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pb-36 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      {!canCreateQuotes(appUser) ? (
        <div className="col-span-full py-20 text-center">
          <h2 className="text-xl font-semibold">Permission required</h2>
          <p className="mt-2 text-slate-500">You don&apos;t have permission to create quotes. Ask an admin to enable Create quotes for your account.</p>
          <Button className="mt-6" variant="outline" onClick={() => router.push("/agreements")}>Back to Agreements</Button>
        </div>
      ) : (
      <>
      <aside className="hidden lg:block">
        <nav className="sticky top-8 space-y-1">
          {STEPS.map((s, i) => {
            if (isWizardStepSkipped(i, agreement.agreementType)) return null;
            return (
            <button key={s.id} type="button" onClick={() => goToStep(i)} className={cn("w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", i === step ? "bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-500/20" : i < step ? "text-sky-800 bg-sky-50" : "text-slate-400 hover:text-slate-600")}>{i + 1}. {getWizardStepLabel(i, agreement.agreementType)}</button>
            );
          })}
        </nav>
      </aside>
      <div>
        <PageHeader title={isEditing ? "Edit Agreement" : "New Agreement"} subtitle="Guided agreement wizard — optimized for iPad" />
        {!loadingDraft && (
          <QuoteScopeAssistant
            agreementType={agreement.agreementType}
            yourQuotedFee={agreement.payoutDetails?.totalProjectFee}
            onApply={handleApplyScopeSuggestion}
            onApplySuggestedFee={handleApplySuggestedFee}
          />
        )}
        {loadingDraft ? <LoadingSpinner className="py-12" /> : (
        <>
        <div className="lg:hidden"><WizardSteps steps={STEPS.map((s, i) => ({ ...s, label: getWizardStepLabel(i, agreement.agreementType) }))} currentStep={step} onStepClick={goToStep} /></div>
        <Card><CardBody className="p-6">{renderStep()}</CardBody></Card>
        <WizardNav onBack={step > 0 ? goBack : undefined} onNext={step < STEPS.length - 1 ? goNext : finishWizard} onSave={saveDraft} onCancel={() => router.push(draftId ? `/agreements/${draftId}` : "/agreements")} isLastStep={step === STEPS.length - 1} saving={saving} nextLabel={step === STEPS.length - 1 ? "Continue to Sign" : "Next"} saveLabel="Save Draft" />
        </>
        )}
      </div>
      </>
      )}
    </div>
  );
}

export default function NewAgreementPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <WizardContent />
    </Suspense>
  );
}
