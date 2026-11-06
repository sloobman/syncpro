/**
 * Canonical JSON serialization: recursively sorts all object keys lexicographically
 * to guarantee identical byte output for cryptographic hashing.
 */
export function canonicalJson(data: unknown): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    const elements = data.map((item) => canonicalJson(item));
    return `[${elements.join(',')}]`;
  }

  const record = data as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  );
  return `{${entries.join(',')}}`;
}
