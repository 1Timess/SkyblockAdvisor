import "server-only";
import { promises as fs } from "node:fs";
import { neuPetConstantsSchema, type NeuPetConstants } from "../../../schemas/neu-pets";
import { neuPetConstantsPath } from "./paths";

export async function loadNeuPetConstants(): Promise<NeuPetConstants> {
  return neuPetConstantsSchema.parse(JSON.parse(await fs.readFile(neuPetConstantsPath(), "utf8")));
}
