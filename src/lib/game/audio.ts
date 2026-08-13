type Ambience = "title" | "map" | "combat" | "shop" | "rest" | "none";

const MUTE_KEY = "wendao-mute-v1";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let unlocked = false;
let ambience: Ambience = "none";
let bed: { stop: () => void } | null = null;
const muteSubs = new Set<(v: boolean) => void>();

function loadMute() {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
}

function saveMute() {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    musicBus.gain.value = 0.55;
    master.gain.value = muted ? 0 : 0.85;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
    const n = Math.floor(ctx.sampleRate * 1.8);
    noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      d[i] = white * 0.55 + last * 0.9;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio(): void {
  const audio = ac();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  unlocked = true;
  if (!bed && ambience !== "none") startBed(ambience);
}

export function installUnlock(): () => void {
  loadMute();
  const go = () => unlockAudio();
  window.addEventListener("pointerdown", go, { capture: true });
  window.addEventListener("keydown", go, { capture: true });
  const vis = () => {
    if (document.visibilityState === "visible") unlockAudio();
  };
  document.addEventListener("visibilitychange", vis);
  return () => {
    window.removeEventListener("pointerdown", go, { capture: true });
    window.removeEventListener("keydown", go, { capture: true });
    document.removeEventListener("visibilitychange", vis);
  };
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  saveMute();
  const audio = ac();
  if (audio && master) {
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : 0.85, audio.currentTime, 0.03);
  }
  muteSubs.forEach((fn) => fn(muted));
  if (!muted) unlockAudio();
}

export function subscribeMute(fn: (v: boolean) => void): () => void {
  muteSubs.add(fn);
  return () => muteSubs.delete(fn);
}

function bus(kind: "sfx" | "music"): GainNode | null {
  ac();
  return kind === "music" ? musicBus : sfxBus;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function playOsc(opts: {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slide?: number;
  dest?: "sfx" | "music";
}) {
  const audio = ac();
  const out = bus(opts.dest ?? "sfx");
  if (!audio || !out) return;
  const t = audio.currentTime + (opts.delay ?? 0);
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = opts.type ?? "sine";
  const f = opts.freq * (1 + (Math.random() * 2 - 1) * 0.03);
  osc.frequency.setValueAtTime(f, t);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * opts.slide), t + opts.dur);
  env(g, t, opts.gain ?? 0.05, 0.008, opts.dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + opts.dur + 0.04);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function playNoise(opts: {
  dur: number;
  gain?: number;
  delay?: number;
  hp?: number;
  lp?: number;
  bp?: number;
  q?: number;
  dest?: "sfx" | "music";
}) {
  const audio = ac();
  const out = bus(opts.dest ?? "sfx");
  if (!audio || !out || !noise) return;
  const t = audio.currentTime + (opts.delay ?? 0);
  const src = audio.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const g = audio.createGain();
  env(g, t, opts.gain ?? 0.04, 0.006, opts.dur);
  let node: AudioNode = src;
  if (opts.bp) {
    const f = audio.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(opts.bp, t);
    f.Q.value = opts.q ?? 2.4;
    node.connect(f);
    node = f;
  }
  if (opts.hp) {
    const f = audio.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = opts.hp;
    node.connect(f);
    node = f;
  }
  if (opts.lp) {
    const f = audio.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(opts.lp, t);
    if (opts.bp) f.frequency.exponentialRampToValueAtTime(Math.max(80, opts.lp * 0.35), t + opts.dur);
    node.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + opts.dur + 0.05);
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
}

function bell(freq: number, delay = 0, gain = 0.045) {
  playOsc({ freq, dur: 0.55, type: "sine", gain, delay });
  playOsc({ freq: freq * 2.01, dur: 0.32, type: "triangle", gain: gain * 0.35, delay: delay + 0.01 });
  playOsc({ freq: freq * 2.99, dur: 0.18, type: "sine", gain: gain * 0.16, delay: delay + 0.02 });
}

function startBed(kind: Ambience) {
  bed?.stop();
  bed = null;
  if (kind === "none" || muted) return;
  const audio = ac();
  const out = bus("music");
  if (!audio || !out || !noise) return;

  const nodes: AudioNode[] = [];
  const stoppers: Array<() => void> = [];

  const wind = audio.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const wf = audio.createBiquadFilter();
  wf.type = "lowpass";
  wf.frequency.value = kind === "combat" ? 280 : kind === "shop" ? 520 : 360;
  const wg = audio.createGain();
  wg.gain.value = kind === "combat" ? 0.018 : kind === "shop" ? 0.022 : 0.016;
  wind.connect(wf);
  wf.connect(wg);
  wg.connect(out);
  wind.start();
  nodes.push(wind, wf, wg);

  const droneF =
    kind === "combat" ? 98 : kind === "shop" ? 146 : kind === "title" ? 130 : 110;
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.value = droneF;
  const og = audio.createGain();
  og.gain.value = kind === "combat" ? 0.012 : 0.008;
  osc.connect(og);
  og.connect(out);
  osc.start();
  nodes.push(osc, og);

  if (kind === "shop") {
    const tick = () => {
      if (ambience !== "shop" || muted) return;
      bell(784, 0, 0.012);
      const id = window.setTimeout(tick, 4200 + Math.random() * 3200);
      stoppers.push(() => window.clearTimeout(id));
    };
    const first = window.setTimeout(tick, 900);
    stoppers.push(() => window.clearTimeout(first));
  }

  bed = {
    stop() {
      stoppers.forEach((fn) => fn());
      const now = audio.currentTime;
      nodes.forEach((n) => {
        if (n instanceof GainNode) n.gain.setTargetAtTime(0, now, 0.04);
      });
      window.setTimeout(() => {
        try {
          wind.stop();
          osc.stop();
        } catch {
          /* already stopped */
        }
        nodes.forEach((n) => {
          try {
            n.disconnect();
          } catch {
            /* */
          }
        });
      }, 180);
    },
  };
}

export function setAmbience(screen: string): void {
  const next: Ambience =
    screen === "combat"
      ? "combat"
      : screen === "shop"
        ? "shop"
        : screen === "title" || screen === "result"
          ? "title"
          : screen === "rest" || screen === "event" || screen === "treasure"
            ? "rest"
            : screen === "map" || screen === "reward" || screen === "select"
              ? "map"
              : "none";
  if (next === ambience && bed) return;
  ambience = next;
  if (!unlocked && !ctx) return;
  startBed(next);
}

export const sfx = {
  playCard() {
    playNoise({ dur: 0.16, gain: 0.055, bp: 2200, q: 1.6, lp: 3400, hp: 400 });
    playOsc({ freq: 740, dur: 0.09, type: "triangle", gain: 0.03, slide: 0.55 });
    playOsc({ freq: 180, dur: 0.12, type: "sine", gain: 0.04, delay: 0.03 });
  },
  hit() {
    playNoise({ dur: 0.12, gain: 0.07, lp: 700, hp: 80 });
    playOsc({ freq: 92, dur: 0.14, type: "square", gain: 0.028 });
    playOsc({ freq: 210, dur: 0.08, type: "triangle", gain: 0.02, delay: 0.02, slide: 0.5 });
  },
  hurt() {
    playNoise({ dur: 0.2, gain: 0.06, lp: 420 });
    playOsc({ freq: 140, dur: 0.18, type: "sawtooth", gain: 0.022, slide: 0.45 });
    playOsc({ freq: 70, dur: 0.22, type: "sine", gain: 0.03 });
  },
  block() {
    playNoise({ dur: 0.08, gain: 0.04, bp: 1400, q: 3 });
    playOsc({ freq: 420, dur: 0.1, type: "triangle", gain: 0.034 });
    playOsc({ freq: 840, dur: 0.07, type: "sine", gain: 0.016, delay: 0.015 });
  },
  potion() {
    playOsc({ freq: 520, dur: 0.1, type: "sine", gain: 0.03 });
    playOsc({ freq: 780, dur: 0.14, type: "triangle", gain: 0.022, delay: 0.05 });
    playOsc({ freq: 980, dur: 0.12, type: "sine", gain: 0.014, delay: 0.1 });
    playNoise({ dur: 0.12, gain: 0.02, hp: 1200, delay: 0.02 });
  },
  relic() {
    bell(392, 0, 0.04);
    bell(588, 0.08, 0.03);
    bell(784, 0.16, 0.022);
  },
  endTurn() {
    playOsc({ freq: 260, dur: 0.1, type: "sine", gain: 0.024 });
    playNoise({ dur: 0.08, gain: 0.016, lp: 600, delay: 0.02 });
  },
  drawCard() {
    playNoise({ dur: 0.07, gain: 0.028, hp: 1600, lp: 5000 });
    playOsc({ freq: 540, dur: 0.06, type: "triangle", gain: 0.014, delay: 0.015 });
  },
  discard() {
    playNoise({ dur: 0.09, gain: 0.022, hp: 900, lp: 2800 });
    playOsc({ freq: 210, dur: 0.08, type: "sine", gain: 0.012, delay: 0.02, slide: 0.7 });
  },
  win() {
    bell(392, 0, 0.04);
    bell(494, 0.1, 0.034);
    bell(587, 0.2, 0.03);
    bell(784, 0.32, 0.028);
  },
  lose() {
    playOsc({ freq: 196, dur: 0.4, type: "sine", gain: 0.03, slide: 0.5 });
    playOsc({ freq: 147, dur: 0.5, type: "triangle", gain: 0.02, delay: 0.05, slide: 0.55 });
    playNoise({ dur: 0.35, gain: 0.03, lp: 240 });
  },
  select() {
    playOsc({ freq: 660, dur: 0.06, type: "sine", gain: 0.022 });
    playNoise({ dur: 0.05, gain: 0.014, hp: 1800 });
  },
  deny() {
    playOsc({ freq: 164, dur: 0.12, type: "square", gain: 0.026 });
    playOsc({ freq: 110, dur: 0.16, type: "sine", gain: 0.02, delay: 0.04 });
  },
  gold() {
    playOsc({ freq: 980, dur: 0.08, type: "triangle", gain: 0.028 });
    playOsc({ freq: 1470, dur: 0.12, type: "sine", gain: 0.018, delay: 0.03 });
  },
  shop() {
    bell(659, 0, 0.032);
    bell(880, 0.07, 0.02);
  },
  map() {
    playNoise({ dur: 0.1, gain: 0.02, hp: 700, lp: 1800 });
    playOsc({ freq: 330, dur: 0.1, type: "sine", gain: 0.018 });
  },
};
