import { prisma } from "../config/prisma";

export const UserRepository = {
  async create(email: string, passwordHash: string) {
    return prisma.user.create({
      data: { email, passwordHash },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
};
