import { prisma } from "../config/prisma";
import { CreateUrlInput } from "../types/url.types";

export const UrlRepository = {
  async create(data: CreateUrlInput & { shortCode: string }) {
    return prisma.url.create({
      data: {
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        expiresAt: data.expiresAt ?? null,
      },
    });
  },
};
