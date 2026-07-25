/** Tiny localStorage helpers — fail soft when storage is blocked. */

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function loadStringSet(key: string): Set<string> {
  const arr = loadJson<string[]>(key, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

export function saveStringSet(key: string, set: Set<string>): void {
  saveJson(key, [...set]);
}
