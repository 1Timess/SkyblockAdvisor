import "server-only";
import { z } from "zod";

const schema = z.object({ OPENAI_API_TOKEN: z.string().trim().min(1) });

export function getAdvisorEnv() {
  const result = schema.safeParse({ OPENAI_API_TOKEN: process.env.OPENAI_API_TOKEN });
  if (!result.success) throw new Error("Configure OPENAI_API_TOKEN in the server environment.");
  return result.data;
}
