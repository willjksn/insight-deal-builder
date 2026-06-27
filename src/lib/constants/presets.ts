import { ProjectType, ShootType } from "@/lib/types";

export const PROJECT_TYPES: ProjectType[] = [
  "Creator Content Day",
  "Business Reel Package",
  "Business Brand Package",
  "Premium Brand Campaign",
  "Creator-Led Brand Campaign",
  "Podcast Shoot",
  "Interview",
  "Event Coverage",
  "Real Estate / Location Promo",
  "Music Video",
  "Short Film",
  "Indie Film",
  "Commercial",
  "Documentary",
  "Social Media Retainer",
  "Product Shoot",
  "Custom Project",
];

export const SHOOT_TYPES: ShootType[] = [
  "Photo Only",
  "Video Only",
  "Photo + Video",
  "Podcast / Multi-Cam",
  "Interview / Talking Head",
  "Cinematic Commercial",
  "Creator Lifestyle",
  "Brand Campaign",
  "Event",
  "Film Scene",
  "Custom",
];

export const CREW_ROLES = [
  "Executive Producer",
  "Lead Producer",
  "Creative Director",
  "Director",
  "Director of Photography",
  "Lead Shooter",
  "Camera Operator",
  "Editor",
  "Production Assistant",
  "BTS Shooter",
  "Talent",
  "Creator",
  "Assistant",
  "Audio Tech",
  "Gaffer",
  "Grip",
  "Project Coordinator",
];

export const ROLE_RESPONSIBILITIES: Record<string, string[]> = {
  "Executive Producer": [
    "Client acquisition",
    "Project oversight",
    "Client communication",
    "Budget oversight",
    "Creative direction",
    "Final delivery oversight",
  ],
  "Lead Producer": [
    "Client acquisition",
    "Project oversight",
    "Client communication",
    "Budget oversight",
    "Creative direction",
    "Final delivery oversight",
  ],
  "Creative Director": [
    "Concept development",
    "Visual direction",
    "Shot list",
    "Talent direction",
    "Final creative review",
  ],
  "Director of Photography": [
    "Camera setup",
    "Lighting execution",
    "Lens selection",
    "Framing",
    "Exposure",
    "Camera movement",
    "Visual quality",
  ],
  "Lead Shooter": [
    "Camera setup",
    "Lighting execution",
    "Lens selection",
    "Framing",
    "Exposure",
    "Camera movement",
    "Visual quality",
  ],
  Editor: [
    "Footage organization",
    "Rough cut",
    "Music placement",
    "Captions/text",
    "Color correction",
    "Sound cleanup",
    "Revisions",
    "Final exports",
  ],
  "Production Assistant": [
    "Gear help",
    "Setup support",
    "BTS support",
    "Notes",
    "Client support",
    "Location help",
  ],
  "Talent / Creator": [
    "Appears on camera",
    "Performs/modeling",
    "Follows creative direction",
    "Usage based on agreement",
  ],
  Talent: [
    "Appears on camera",
    "Performs/modeling",
    "Follows creative direction",
    "Usage based on agreement",
  ],
  Creator: [
    "Appears on camera",
    "Performs/modeling",
    "Follows creative direction",
    "Usage based on agreement",
  ],
};

export const DELIVERABLE_OPTIONS = [
  "Edited reels",
  "Edited photos",
  "Brand promo video",
  "Cinematic commercial",
  "Podcast episode",
  "Podcast clips",
  "Interview video",
  "Testimonial clips",
  "BTS clips",
  "Raw footage",
  "Vertical exports",
  "Horizontal exports",
  "Square exports",
  "Thumbnail images",
  "Captions/hooks",
  "Content calendar",
  "Social media posting",
  "Paid ad versions",
  "Voiceover",
  "Color correction",
  "Color grading",
  "Sound design",
  "Motion graphics",
];

export const PRODUCER_FEE_PRESETS = [
  {
    name: "Insight originated client + Insight lead producer + Insight gear used",
    recommendedPercentage: 40,
    minPercentage: 40,
    maxPercentage: 45,
  },
  {
    name: "Insight originated client + no Insight gear used",
    recommendedPercentage: 35,
    minPercentage: 35,
    maxPercentage: 40,
  },
  {
    name: "Partner originated client",
    recommendedPercentage: 0,
    note: "Partner keeps producer/client fee. Insight is paid for agreed role only.",
  },
  {
    name: "Joint originated client",
    recommendedPercentage: 25,
    note: "Custom split required before signing.",
  },
];

export const GEAR_PACKAGES = [
  {
    name: "No Insight Gear Used" as const,
    suggestedFeeRange: "$0",
    description: "Production partner uses their own equipment.",
    items: [] as string[],
  },
  {
    name: "Basic Insight Gear Package" as const,
    suggestedFeeRange: "$150–$350",
    description: "Camera body, lens, basic tripod/gimbal, basic audio, basic lighting.",
    items: ["Camera body", "Lens", "Basic tripod/gimbal", "Basic audio", "Basic lighting"],
  },
  {
    name: "Standard Insight Gear Package" as const,
    suggestedFeeRange: "$350–$750",
    description: "Multiple cameras, lenses, lighting kit, audio, gimbal, monitors, stands, modifiers.",
    items: ["Multiple cameras", "Lenses", "Lighting kit", "Audio", "Gimbal", "Monitors", "Stands", "Modifiers"],
  },
  {
    name: "Full Insight Production Gear Package" as const,
    suggestedFeeRange: "$750–$1,500+",
    description: "Multi-camera setup, full lighting, audio, gimbal/rigs, podcast setup, specialty lights, monitors, studio setup.",
    items: ["Multi-camera setup", "Full lighting package", "Audio package", "Gimbal/rigs", "Podcast setup", "Specialty lights", "Monitors", "Studio setup"],
  },
  {
    name: "Custom Gear List" as const,
    suggestedFeeRange: "Custom",
    description: "Manually add gear items, serial numbers, replacement values, condition, and assigned user.",
    items: [] as string[],
  },
];

export const SERVICE_PACKAGE_PRESETS = [
  {
    name: "Creator Starter Shoot",
    price: 750,
    projectType: "Creator Content Day" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 2 },
      { name: "Edited photos", quantity: 10 },
    ],
    notes: "1-hour shoot, basic creative direction, 1 location.",
  },
  {
    name: "Creator Content Day",
    price: 1500,
    projectType: "Creator Content Day" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 5 },
      { name: "Edited photos", quantity: 20 },
    ],
    notes: "2–3 hour shoot, shot list, basic content strategy, 1 location.",
  },
  {
    name: "Premium Creator Day",
    price: 2500,
    projectType: "Creator Content Day" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 10 },
      { name: "Edited photos", quantity: 30 },
    ],
    notes: "Half-day shoot, cinematic lighting, 2 looks/outfits, 1–2 locations.",
  },
  {
    name: "Business Reel Package",
    price: 1500,
    projectType: "Business Reel Package" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 5 },
      { name: "Edited photos", quantity: 15 },
    ],
    notes: "Basic brand story, captions/hooks.",
  },
  {
    name: "Business Brand Package",
    price: 3000,
    projectType: "Business Brand Package" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 10 },
      { name: "Edited photos", quantity: 30 },
      { name: "Brand promo video", quantity: 1 },
    ],
    notes: "Half-day shoot, interview/testimonial setup, B-roll, creative direction.",
  },
  {
    name: "Premium Brand Campaign",
    price: 5000,
    projectType: "Premium Brand Campaign" as ProjectType,
    deliverables: [
      { name: "Edited reels/clips", quantity: 20 },
      { name: "Cinematic commercial", quantity: 1 },
      { name: "BTS clips", quantity: 3 },
    ],
    notes: "Campaign concept, half-day/full-day shoot, photos, testimonials, ad versions.",
  },
  {
    name: "Creator-Led Brand Campaign",
    price: 5000,
    projectType: "Creator-Led Brand Campaign" as ProjectType,
    deliverables: [
      { name: "Edited reels", quantity: 10 },
      { name: "Cinematic promo", quantity: 1 },
      { name: "Edited photos", quantity: 20 },
    ],
    notes: "Creator/talent appearance, usage rights, optional creator posting. Custom quote for $5,000+.",
  },
];

export const DELIVERABLE_PRESETS_BY_PROJECT: Partial<Record<ProjectType, { name: string; quantity: number }[]>> = {
  "Creator Content Day": [
    { name: "Edited reels", quantity: 5 },
    { name: "Edited photos", quantity: 20 },
  ],
  "Business Reel Package": [
    { name: "Edited reels", quantity: 5 },
    { name: "Edited photos", quantity: 15 },
    { name: "Captions/hooks", quantity: 1 },
  ],
  "Business Brand Package": [
    { name: "Edited reels", quantity: 10 },
    { name: "Edited photos", quantity: 30 },
    { name: "Brand promo video", quantity: 1 },
  ],
  "Premium Brand Campaign": [
    { name: "Edited reels/clips", quantity: 20 },
    { name: "Cinematic commercial", quantity: 1 },
    { name: "BTS clips", quantity: 3 },
  ],
  "Podcast Shoot": [
    { name: "Podcast episode", quantity: 1 },
    { name: "Podcast clips", quantity: 8 },
    { name: "Thumbnail images", quantity: 1 },
  ],
};

export const PROJECT_OVERVIEW_TEMPLATES: Partial<Record<ProjectType, string>> = {
  "Business Brand Package":
    "Insight Media Group will produce high-quality cinematic content designed to help the client present their brand professionally across social media, website, and marketing channels.",
  "Business Reel Package":
    "Insight Media Group will create engaging short-form video content and supporting photos to elevate the client's brand presence on social media.",
  "Premium Brand Campaign":
    "Insight Media Group will produce a comprehensive brand campaign including cinematic video, photo content, and supporting assets for multi-channel marketing.",
  "Creator Content Day":
    "Insight Media Group will produce a focused content day capturing reels, photos, and supporting assets optimized for social media growth.",
};

export const DEFAULT_GEAR_CLAUSE =
  "Any Insight Media Group equipment used on this project must be handled with reasonable care. Any damage, loss, theft, misuse, or negligence may be the responsibility of the person or company using the equipment. Equipment must be returned in the same condition unless normal wear is expected.";

/** Default company only. Add production partners via Companies page. */
export const SEED_COMPANIES = [
  {
    legalName: "Insight Media Group LLC",
    displayName: "Insight Media Group LLC",
    authorizedSignerName: "Will Jackson",
    authorizedSignerTitle: "Owner / Managing Member / Executive Producer",
    defaultRole: "Lead Producer / Creative Director / Production Company",
    defaultProducerPercentage: 40,
    defaultEquipmentTerms:
      "Insight equipment use is included in the producer/equipment fee unless heavy gear use requires an additional fee.",
    email: "",
    phone: "",
    address: "",
    website: "",
    notes: "",
  },
];

export const SEED_CLIENT = {
  businessName: "Demo Fitness Studio",
  contactName: "Demo Client",
  email: "client@example.com",
  phone: "",
  address: "",
  website: "",
  socialHandle: "",
  authorizedSignerName: "Demo Client",
  authorizedSignerTitle: "Owner",
  billingContact: "",
  notes: "Demo client for testing",
};

export const EQUIPMENT_CATALOG_PRESETS = [
  { name: "Sony FX3 Camera Body", category: "Camera", brand: "Sony", model: "FX3", dailyRate: 150, replacementValue: 3900, active: true },
  { name: "Sony 24-70mm f/2.8 GM II", category: "Lens", brand: "Sony", model: "24-70 GM II", dailyRate: 75, replacementValue: 2300, active: true },
  { name: "DJI RS 3 Pro Gimbal", category: "Support", brand: "DJI", model: "RS 3 Pro", dailyRate: 65, replacementValue: 1100, active: true },
  { name: "Aputure 600d Pro Light", category: "Lighting", brand: "Aputure", model: "600d Pro", dailyRate: 95, replacementValue: 1900, active: true },
  { name: "Rode Wireless GO II (2-Person)", category: "Audio", brand: "Rode", model: "Wireless GO II", dailyRate: 35, replacementValue: 350, active: true },
  { name: "SmallHD Focus Monitor", category: "Monitor", brand: "SmallHD", model: "Focus", dailyRate: 45, replacementValue: 600, active: true },
  { name: "C-Stand with Grip Arm", category: "Grip", dailyRate: 15, replacementValue: 180, active: true },
  { name: "Sennheiser MKH 416 Shotgun Mic", category: "Audio", brand: "Sennheiser", model: "MKH 416", dailyRate: 40, replacementValue: 1000, active: true },
];

export const LOCATION_CATALOG_PRESETS = [
  {
    propertyName: "Downtown Loft Studio",
    propertyAddress: "123 Main St, Charlotte, NC",
    locationFee: 750,
    locationFeeType: "flat" as const,
    defaultPermittedUse: "Commercial photo and video production for the project named in this Agreement.",
    insuranceRequired: true,
    active: true,
    propPresets: [
      { id: "prop-1", name: "Vintage leather sofa", dailyRate: 75 },
      { id: "prop-2", name: "Brass floor lamp", dailyRate: 35 },
    ],
  },
  {
    propertyName: "Lake House Exterior",
    propertyAddress: "Lake Norman, NC",
    locationFee: 500,
    locationFeeType: "day" as const,
    defaultPermittedUse: "Exterior filming and photography only unless interior access is agreed in writing.",
    insuranceRequired: true,
    active: true,
  },
  {
    propertyName: "Warehouse Event Space",
    propertyAddress: "456 Industrial Blvd, Charlotte, NC",
    locationFee: 1200,
    locationFeeType: "flat" as const,
    defaultPermittedUse: "Filming, staging, and crew setup for production days listed in this Agreement.",
    insuranceRequired: true,
    active: true,
    propPresets: [{ id: "prop-3", name: "Rolling clothing rack", dailyRate: 25 }],
  },
];

export const SEED_PROJECT = {
  projectName: "Demo Fitness Studio Brand Campaign",
  agreementType: "client_project" as const,
  projectType: "Business Brand Package" as ProjectType,
  shootType: "Photo + Video" as ShootType,
  totalProjectFee: 3000,
  shootDate: "",
  deliveryDate: "",
  location: "",
  status: "draft" as const,
};

// Prefer importing from @/lib/seed/demoData for full seed data
