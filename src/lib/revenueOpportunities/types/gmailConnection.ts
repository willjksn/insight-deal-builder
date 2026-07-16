export interface RevenueGmailConnection {
  id: string;
  organizationCompany: string;
  userId: string;
  email: string;
  connectedAt: string;
  updatedAt: string;
  scopes: string[];
}

/** Stored server-side only — never returned to clients. */
export interface RevenueGmailConnectionSecrets {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}
