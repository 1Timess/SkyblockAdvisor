import "server-only";
import { z } from "zod";

const schema = z.object({ HYPIXEL_API_KEY: z.string().trim().min(1) });

export function getServerEnv() {
  const result = schema.safeParse({ HYPIXEL_API_KEY: process.env.HYPIXEL_API_KEY });
  if (!result.success) throw new Error("Configure HYPIXEL_API_KEY in the server environment.");
  return result.data;
}
