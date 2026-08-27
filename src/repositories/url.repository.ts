import { prisma } from "../config/prisma";
import { CreateUrlInput } from "../types/url.types";

export const UrlRepository = {
  async getNextId(): Promise<bigint> {
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('urls', 'id')) as nextval
    `;
    return result[0].nextval;
  },

  async createWithId(id: bigint, data: CreateUrlInput & { shortCode: string }) {
    return prisma.url.create({
      data: {
        id,
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        expiresAt: data.expiresAt ?? null,
      },
    });
  },

  async create(data: CreateUrlInput & { shortCode: string }) {
    return prisma.url.create({
      data: {
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        expiresAt: data.expiresAt ?? null,
      },
    });
  },

  async findByShortCode(shortCode: string) {
    return prisma.url.findUnique({ where: { shortCode } });
  },
};
