export type ReferenceTable = {
  headers: string[];
  rows: string[][];
};

export type ReferenceSection = {
  id: string;
  title: string;
  category: string;
  summary?: string;
  body?: string;
  tables?: ReferenceTable[];
  tips?: string[];
  /** Search keywords — audio gear names, workflows, troubleshooting terms */
  keywords?: string[];
};

export type ReferenceGuideDocument = {
  version: number;
  title: string;
  subtitle: string;
  sections: ReferenceSection[];
  updatedAt?: string;
  updatedBy?: string;
};

export type ReferenceGuideDraft = {
  sections: ReferenceSection[];
  changeSummary: string;
  researchedAt: string;
  query: string;
  sourceTitles: string[];
};

export const REFERENCE_GUIDE_DOC_ID = "main";
export const REFERENCE_GUIDE_COLLECTION = "referenceGuide";
