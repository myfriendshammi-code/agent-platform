import { createHash, randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function resetExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
