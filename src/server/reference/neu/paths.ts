import path from "node:path";

export function neuDataDirectory() {
  return process.env.NEU_DATA_DIRECTORY?.trim() || path.join(process.cwd(), "data", "neu");
}
export function neuRepositoryDirectory() { return path.join(neuDataDirectory(), "repository"); }
export function neuItemsDirectory() { return path.join(neuRepositoryDirectory(), "items"); }
export function neuMetadataPath() { return path.join(neuDataDirectory(), "metadata.json"); }
