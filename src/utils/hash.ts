import crypto from "crypto";

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}
