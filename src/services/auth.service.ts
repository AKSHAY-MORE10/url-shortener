import { UserRepository } from "../repositories/user.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { RegisterInput, LoginInput, AuthResponseDTO } from "../types/auth.types";

export class ConflictError extends Error {
  statusCode = 409;
}

export class UnauthorizedError extends Error {
  statusCode = 401;
}

export const AuthService = {
  async register(input: RegisterInput): Promise<AuthResponseDTO> {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await UserRepository.create(input.email, passwordHash);
    const token = signToken({ userId: user.id });

    return { token, user: { id: user.id, email: user.email } };
  },

  async login(input: LoginInput): Promise<AuthResponseDTO> {
    const user = await UserRepository.findByEmail(input.email);

    // Intentional: both "user not found" and "wrong password" return the same
    // message to prevent user enumeration attacks.
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, email: user.email } };
  },
};
