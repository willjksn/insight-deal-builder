import { Timestamp } from "firebase/firestore";
import { ScriptTrendsResearch } from "@/lib/scriptWriter/types";

export type BrandProfileType =
  | "creator"
  | "influencer"
  | "business"
  | "brand"
  | "product"
  | "client"
  | "internal";

export interface BrandProfileBasic {
  profileName: string;
  businessOrCreatorName?: string;
  industry?: string;
  website?: string;
  socialHandles?: string;
  primaryContact?: string;
  location?: string;
  profileImageUrl?: string;
  notes?: string;
}

export interface BrandIdentity {
  description?: string;
  mission?: string;
  personality?: string;
  voice?: string;
  visualIdentity?: string;
  primaryColors?: string;
  secondaryColors?: string;
  typographyNotes?: string;
  logoUsageNotes?: string;
  brandWords?: string;
  avoidWords?: string;
  slogan?: string;
  desiredAudiencePerception?: string;
}

export interface CreatorIdentity {
  creatorName?: string;
  niche?: string;
  personality?: string;
  onCameraStyle?: string;
  humorLevel?: string;
  confidenceLevel?: string;
  speakingStyle?: string;
  contentStrengths?: string;
  contentWeaknesses?: string;
  comfortBoundaries?: string;
  wardrobePreferences?: string;
  preferredLocations?: string;
  topicsEnjoy?: string;
  topicsAvoid?: string;
  recurringSeries?: string;
  audienceExpectations?: string;
}

export interface AudienceProfile {
  primaryAudience?: string;
  secondaryAudience?: string;
  ageRange?: string;
  genderMix?: string;
  location?: string;
  interests?: string;
  painPoints?: string;
  aspirations?: string;
  buyingMotivations?: string;
  commonObjections?: string;
  desiredEmotionalResponse?: string;
}

export interface BusinessInfo {
  products?: string;
  services?: string;
  priceRange?: string;
  uniqueSellingProposition?: string;
  competitors?: string;
  problemSolved?: string;
  bestSellingOffer?: string;
  seasonalPriorities?: string;
  promotions?: string;
  salesProcess?: string;
  primaryConversionGoal?: string;
}

export interface ProductionPreferences {
  preferredContentLength?: string;
  preferredPlatforms?: string[];
  preferredAspectRatios?: string;
  polishLevel?: string;
  preferredTone?: string;
  visualStyle?: string;
  lightingStyle?: string;
  cameraMovement?: string;
  editingPace?: string;
  musicPreferences?: string;
  brandRestrictions?: string;
  legalRestrictions?: string;
  equipmentNotes?: string;
}

export interface BrandSafety {
  prohibitedTopics?: string;
  complianceRules?: string;
  requiredDisclaimers?: string;
  contentBoundaries?: string;
  ageRestrictions?: string;
  locationRestrictions?: string;
  musicRestrictions?: string;
  productClaimRestrictions?: string;
  clientApprovalRequired?: boolean;
}

export interface BrandProfile {
  id: string;
  userId: string;
  type: BrandProfileType;
  basic: BrandProfileBasic;
  brandIdentity?: BrandIdentity;
  creatorIdentity?: CreatorIdentity;
  audience?: AudienceProfile;
  business?: BusinessInfo;
  productionPreferences?: ProductionPreferences;
  safety?: BrandSafety;
  linkedClientId?: string;
  isStormiPreset?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ContentGoal =
  | "awareness"
  | "followers"
  | "engagement"
  | "leads"
  | "appointments"
  | "sell_product"
  | "sell_service"
  | "event"
  | "partnerships"
  | "demonstrate_quality"
  | "authority"
  | "educate"
  | "entertain"
  | "community"
  | "membership"
  | "paid_content"
  | "launch"
  | "reposition"
  | "portfolio"
  | "spec_commercial";

export interface IdeaGenerationInputs {
  profileId?: string;
  profileType?: BrandProfileType;
  roughIdea: string;
  goals: ContentGoal[];
  campaignName?: string;
  weeklyTheme?: string;
  featuredOffer?: string;
  callToAction?: string;
  platforms: string[];
  ideaCount: number;
  contentFormats: string[];
  lookTags: string[];
  lookNotes?: string;
  toneTags: string[];
  productionResources?: string;
  constraints?: string[];
  creativeIntensity?: string;
  productionDifficulty?: string;
  timeAvailable?: string;
  deliverableGoals?: string[];
  quickMode?: boolean;
}

export interface IdeaScore {
  brandFit: number;
  audienceFit: number;
  originality: number;
  visualPotential: number;
  businessValue: number;
  engagementPotential: number;
  conversionPotential: number;
  productionFeasibility: number;
  repurposingValue: number;
  portfolioValue: number;
  overall: number;
  explanations?: string;
}

export interface ContentIdeaCreative {
  coreIdea?: string;
  storyStructure?: string;
  openingHook?: string;
  middleDevelopment?: string;
  endingPayoff?: string;
  callToAction?: string;
  tone?: string;
  emotionalTarget?: string;
  visualStyle?: string;
  colorLighting?: string;
  cameraMovement?: string;
  editingRhythm?: string;
  musicDirection?: string;
  soundDesign?: string;
}

export interface ContentIdeaProduction {
  recommendedLocation?: string;
  requiredTalent?: string;
  wardrobe?: string;
  props?: string;
  productionDesign?: string;
  cameraApproach?: string;
  suggestedLenses?: string;
  lightingConcept?: string;
  audioApproach?: string;
  requiredCrew?: string;
  specialEquipment?: string;
  challenges?: string;
  simplifiedAlternative?: string;
}

export interface ContentIdeaDeliverables {
  heroVideo?: string;
  reelCutdowns?: string;
  stories?: string;
  stills?: string;
  behindTheScenes?: string;
  teaser?: string;
  thumbnail?: string;
  captionDirection?: string;
  repurposing?: string;
}

export interface ContentIdeaStrategy {
  whyFitsBrand?: string;
  whyAudienceResponds?: string;
  businessGoalSupport?: string;
  visualDifferentiator?: string;
  repurposingOpportunities?: string;
  risks?: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  hook: string;
  summary: string;
  primaryGoal?: string;
  targetAudience?: string;
  recommendedPlatform?: string;
  recommendedFormat?: string;
  estimatedLength?: string;
  productionDifficulty?: string;
  estimatedShootTime?: string;
  estimatedEditTime?: string;
  estimatedCostLevel?: string;
  creative?: ContentIdeaCreative;
  production?: ContentIdeaProduction;
  deliverables?: ContentIdeaDeliverables;
  strategy?: ContentIdeaStrategy;
  readiness?: string;
  score?: IdeaScore;
  imagePrompt?: string;
  favorite?: boolean;
  saved?: boolean;
  status?: string;
  projectId?: string;
  scriptSessionId?: string;
  tags?: string[];
}

export interface WeeklyScheduleDay {
  day: string;
  title: string;
  contentType?: string;
  platform?: string;
  goal?: string;
  hook?: string;
  summary?: string;
  productionRequirement?: string;
  postingPurpose?: string;
  campaignRelation?: string;
  ideaId?: string;
}

export interface IdeaGenerationSession {
  id: string;
  userId: string;
  profileId?: string;
  title?: string;
  inputs: IdeaGenerationInputs;
  ideas: ContentIdea[];
  weeklySchedule?: WeeklyScheduleDay[];
  campaignSummary?: string;
  recommendedStrategy?: string;
  questions?: string[];
  warnings?: string[];
  trendsResearch?: ScriptTrendsResearch | null;
  trendsContentType?: string;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
