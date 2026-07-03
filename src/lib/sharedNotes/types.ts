export type SharedResourceType = "script";

export interface SharedResourceNote {
  id: string;
  body: string;
  authorUserId: string;
  authorInitials: string;
  authorDisplayName?: string;
  createdAt: string;
}

export interface SharedNotesMeta {
  isShared: boolean;
  canPost: boolean;
  ownerUserId: string;
}

export interface SharedNotesResponse {
  notes: SharedResourceNote[];
  meta: SharedNotesMeta;
}
