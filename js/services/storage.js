const memoryStore = new Map();

export function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  }
}

export function writeJson(key, value) {
  memoryStore.set(key, value);

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function removeJson(key) {
  memoryStore.delete(key);

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}
