import type { MetaState, RunState, Screen } from "./types";
import { SAVE_VERSION } from "./types";

const RUN_KEY = "wendao-run-v1";
const META_KEY = "wendao-meta-v1";

export interface Persisted {
  version: number;
  screen: Screen;
  run: RunState;
}

export function defaultMeta(): MetaState {
  return { version: SAVE_VERSION, runs: 0, victories: 0, bestAct: 0, bestFloor: 0 };
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as MetaState;
    return { ...defaultMeta(), ...parsed, version: SAVE_VERSION };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ ...meta, version: SAVE_VERSION }));
  } catch {
    /* ignore quota */
  }
}

export function loadRun(): Persisted | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.version !== SAVE_VERSION || !parsed.run) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(screen: Screen, run: RunState): void {
  try {
    const payload: Persisted = { version: SAVE_VERSION, screen, run };
    localStorage.setItem(RUN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    /* ignore */
  }
}
