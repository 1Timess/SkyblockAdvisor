export class TtlCache {
  private entries = new Map<string, { value: unknown; expiresAt: number }>();
  constructor(private now: () => number = Date.now, private maxEntries = 500) {}

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
  }
}
