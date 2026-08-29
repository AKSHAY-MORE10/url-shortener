import { prisma } from "../config/prisma";

export const ClickEventRepository = {
  async create(data: {
    urlId: bigint;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
  }) {
    return prisma.clickEvent.create({ data });
  },
};
