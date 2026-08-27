export interface CreateUrlInput {
  originalUrl: string;
  expiresAt?: Date;
}

export interface UrlResponseDTO {
  id: string;           // BigInt converted to string — see note above
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
}
