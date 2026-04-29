const store = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  for (const [key, timestamps] of store) {
    const pruned = timestamps.filter((t) => now - t < WINDOW_MS);
    if (pruned.length === 0) store.delete(key);
    else store.set(key, pruned);
  }
}

function getIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function checkRateLimit(request: Request): { rateLimited: boolean } {
  cleanup();
  const ip = getIp(request);
  const now = Date.now();
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    store.set(ip, timestamps);
    return { rateLimited: true };
  }

  timestamps.push(now);
  store.set(ip, timestamps);
  return { rateLimited: false };
}
