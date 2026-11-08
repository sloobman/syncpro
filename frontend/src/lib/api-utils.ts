export function isPrerenderInterrupted(error: unknown): boolean {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    "digest" in (error as Record<string, unknown>) &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}
