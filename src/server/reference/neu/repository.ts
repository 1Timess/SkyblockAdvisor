import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { neuItemSchema, neuMetadataSchema, type NeuItem, type NeuMetadata } from "../../../schemas/neu";
import { neuItemsDirectory, neuMetadataPath } from "./paths";

export interface NeuLoadFailure { fileName: string; error: string }
export interface NeuRepository {
  getById(id: string): NeuItem | undefined;
  getAll(): readonly NeuItem[];
  getMetadata(): NeuMetadata;
  getFailures(): readonly NeuLoadFailure[];
}

export class InMemoryNeuRepository implements NeuRepository {
  private byId: Map<string, NeuItem>;
  constructor(private items: readonly NeuItem[], private metadata: NeuMetadata, private failures: readonly NeuLoadFailure[] = []) {
    this.byId = new Map(items.map(item => [item.internalname, item]));
  }
  getById(id: string) { return this.byId.get(id); }
  getAll() { return this.items; }
  getMetadata() { return this.metadata; }
  getFailures() { return this.failures; }
}

export async function loadNeuRepository(): Promise<NeuRepository> {
  const metadata = neuMetadataSchema.parse(JSON.parse(await fs.readFile(neuMetadataPath(), "utf8")));
  const entries = await fs.readdir(neuItemsDirectory(), { withFileTypes: true });
  const items: NeuItem[] = [], failures: NeuLoadFailure[] = [];
  for (const entry of entries.filter(entry => entry.isFile() && path.extname(entry.name) === ".json").sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const value = JSON.parse(await fs.readFile(path.join(neuItemsDirectory(), entry.name), "utf8"));
      items.push(neuItemSchema.parse(value));
    } catch (error) {
      failures.push({ fileName: entry.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (items.length === 0) throw new Error("The local NEU snapshot contains no valid item files.");
  return new InMemoryNeuRepository(items, metadata, failures);
}
