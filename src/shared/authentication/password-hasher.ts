import { argon2id, hash, verify } from "argon2";

const passwordHashOptions = {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32
} as const;

// Keeps missing-account and existing-account login paths similarly expensive.
const accountEnumerationTimingHash =
  "$argon2id$v=19$m=65536,p=1,t=3$QvQ0nJvhSFwzen0uWUIhAA$exL9xkj8bMzyyYe8CYwGpLJmWhIcxdCzzE9HtKarau8";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, passwordHashOptions);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

export async function verifyLoginPassword(
  storedPasswordHash: string | null | undefined,
  suppliedPassword: string
): Promise<boolean> {
  const passwordMatches = await verifyPassword(
    storedPasswordHash ?? accountEnumerationTimingHash,
    suppliedPassword
  );

  return storedPasswordHash !== null && storedPasswordHash !== undefined && passwordMatches;
}
