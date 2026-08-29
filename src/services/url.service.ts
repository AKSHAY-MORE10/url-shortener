import { UrlRepository } from "../repositories/url.repository";
import { encodeBase62 } from "../utils/base62";
import { CreateUrlInput, UrlResponseDTO } from "../types/url.types";
import { redis } from "../config/redis";

const DEFAULT_CACHE_TTL_SECONDS = 3600; // 1 hour

function toResponseDTO(url: {
  id: bigint;
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
}): UrlResponseDTO {
  return {
    id: url.id.toString(),
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    createdAt: url.createdAt,
    expiresAt: url.expiresAt,
  };
}

export class NotFoundError extends Error {
  statusCode = 404;
}

export class GoneError extends Error {
  statusCode = 410;
}

export const UrlService = {
  async createShortUrl(input: CreateUrlInput): Promise<UrlResponseDTO> {
    const id = await UrlRepository.getNextId();
    const shortCode = encodeBase62(id);

    const url = await UrlRepository.createWithId(id, { ...input, shortCode });
    return toResponseDTO(url);
  },

  async resolveShortUrl(shortCode: string): Promise<{ originalUrl: string; urlId: bigint }> {
    const cacheKey = `url:${shortCode}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { id: string; originalUrl: string };
      return { originalUrl: parsed.originalUrl, urlId: BigInt(parsed.id) };
    }

    const url = await UrlRepository.findByShortCode(shortCode);

    if (!url) throw new NotFoundError(`No URL found for short code: ${shortCode}`);
    if (url.expiresAt && url.expiresAt < new Date()) throw new GoneError(`URL has expired`);

    const ttl = url.expiresAt
      ? Math.min(DEFAULT_CACHE_TTL_SECONDS, Math.floor((url.expiresAt.getTime() - Date.now()) / 1000))
      : DEFAULT_CACHE_TTL_SECONDS;

    await redis.set(
      cacheKey,
      JSON.stringify({ id: url.id.toString(), originalUrl: url.originalUrl }),
      "EX",
      ttl
    );

    return { originalUrl: url.originalUrl, urlId: url.id };
  },
};
