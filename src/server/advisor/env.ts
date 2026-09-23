import "server-only";
import { z } from "zod";

const tokenSchema = z.string().trim().min(1);

export function getAdvisorEnv() {
  const result = tokenSchema.safeParse(process.env.OPENAI_API_TOKEN ?? process.env.OPENAI_API_KEY);
  if (!result.success) throw new Error("Configure OPENAI_API_KEY (or OPENAI_API_TOKEN) in the server environment.");
  return { OPENAI_API_TOKEN: result.data };
}
