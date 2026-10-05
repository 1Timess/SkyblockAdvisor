const SKYCRYPT_ORIGIN = "https://sky.shiiyu.moe";

export function skyCryptHeadUrl(texture: string): string | null {
  const match = texture.match(/(?:^|\/)head\/([^/?#]+)$/);
  return match ? `${SKYCRYPT_ORIGIN}/api/head/${encodeURIComponent(match[1])}` : null;
}

export function skyCryptItemUrl(itemId: string): string {
  return `${SKYCRYPT_ORIGIN}/api/item/${encodeURIComponent(itemId)}`;
}
