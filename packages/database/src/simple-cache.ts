// Lightweight in-memory cache with TTL and simple max-size eviction (FIFO)
// Avoids external dependencies while providing the minimal API we need.

export interface GetOptions {
  allowStale?: boolean;
}

export interface SetOptions {
  ttl?: number; // milliseconds
}

type Entry<V> = {
  value: V;
  timestamp: number;
  ttl: number;
};

export class SimpleCache<K, V> {
  private store = new Map<K, Entry<V>>();
  readonly max: number;
  readonly ttl: number; // default ttl in ms
  private readonly updateAgeOnGet: boolean;

  constructor(options?: { max?: number; ttl?: number; updateAgeOnGet?: boolean }) {
    this.max = options?.max ?? 200;
    this.ttl = options?.ttl ?? 30_000;
    this.updateAgeOnGet = options?.updateAgeOnGet ?? true;
  }

  get size(): number {
    return this.store.size;
  }

  // For compatibility with previous code reading calculatedSize
  get calculatedSize(): number {
    return this.store.size;
  }

  private isExpired(entry: Entry<V>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  get(key: K, options?: GetOptions): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      if (options?.allowStale) {
        // Return stale but schedule deletion
        // Delete synchronously to keep it simple
        this.store.delete(key);
        return entry.value;
      }
      this.store.delete(key);
      return undefined;
    }

    if (this.updateAgeOnGet) {
      entry.timestamp = Date.now();
      this.store.set(key, entry);
    }
    return entry.value;
  }

  set(key: K, value: V, options?: SetOptions): void {
    const ttl = options?.ttl ?? this.ttl;
    const entry: Entry<V> = { value, timestamp: Date.now(), ttl };
    this.store.set(key, entry);

    // Evict oldest if over max
    if (this.store.size > this.max) {
      const firstKey = this.store.keys().next().value as K | undefined;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  entries(): IterableIterator<[K, V]> {
    const self = this;
    function* iterator(): IterableIterator<[K, V]> {
      for (const [k, entry] of self.store.entries()) {
        yield [k, entry.value];
      }
    }
    return iterator();
  }
}
