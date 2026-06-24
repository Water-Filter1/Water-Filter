import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Retry a DB operation on transient connection errors (Supabase free-tier
 * pooler drops idle connections / wakes from sleep → P1001/P1017 etc.).
 * Re-runs the op with a short backoff so a momentary blip is invisible.
 */
const RETRYABLE_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

export async function withDbRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const code = (e as { code?: string })?.code ?? "";
      const msg = String((e as { message?: string })?.message ?? "");
      const transient =
        RETRYABLE_CODES.has(code) ||
        /closed the connection|can't reach database|connection (pool|closed|reset)|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!transient || attempt === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}
