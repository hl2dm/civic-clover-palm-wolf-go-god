import type { MetaState, RunState, Screen } from "./types";
import { SAVE_VERSION } from "./types";
import { defaultMeta, normalizeMeta } from "./meta";

const RUN_KEY = "wendao-run-v1";
const META_KEY = "wendao-meta-v1";

export interface Persisted {
  version: number;
  screen: Screen;
  run: RunState;
}

export { defaultMeta };

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaultMeta();
    return normalizeMeta(JSON.parse(raw) as Partial<MetaState>);
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
    if (!parsed.run) return null;
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== SAVE_VERSION) return null;
    const run = parsed.run;
    if (typeof run.xpEarned !== "number") run.xpEarned = 0;
    if (typeof run.meritEarned !== "number") run.meritEarned = 0;
    if (!Array.isArray(run.flags)) run.flags = [];
    if (!run.path) run.path = "jian";
    if (typeof run.calamity !== "number") run.calamity = 0;
    return { ...parsed, version: SAVE_VERSION, run };
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
