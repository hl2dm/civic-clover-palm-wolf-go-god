export type SpritePose = "idle" | "attack" | "hurt";

export type SpriteBox = { w: number; h: number };

/** Per-foe stage box in CSS pixels. Never share one bucket across kinds. */
const SPRITE_BOX: Record<string, SpriteBox> = {
  player: { w: 128, h: 216 },
  shanxiao: { w: 158, h: 228 },
  sanxiu: { w: 110, h: 220 },
  zhiren: { w: 116, h: 208 },
  yeshou: { w: 148, h: 232 },
  lingshe: { w: 168, h: 232 },
  huoya: { w: 196, h: 196 },
  shikui: { w: 172, h: 236 },
  wuji: { w: 132, h: 224 },
  juyuan: { w: 188, h: 232 },
  jindan: { w: 156, h: 244 },
  zhuji: { w: 128, h: 236 },
  jianbing: { w: 180, h: 244 },
  huxian: { w: 184, h: 228 },
  neimen: { w: 132, h: 244 },
  mumei: { w: 164, h: 252 },
  xinmo: { w: 136, h: 244 },
  shijiang: { w: 132, h: 242 },
  tongzhong: { w: 142, h: 214 },
  youdeng: { w: 104, h: 178 },
  xuefu: { w: 220, h: 154 },
  yanxi: { w: 236, h: 126 },
  moxiao: { w: 110, h: 238 },
  jiantong: { w: 106, h: 212 },
  fengli: { w: 170, h: 214 },
  yaokui: { w: 128, h: 206 },
  lianshi: { w: 176, h: 248 },
  leishi: { w: 190, h: 226 },
  xuehe: { w: 138, h: 248 },
  zhujian: { w: 138, h: 238 },
  yecha: { w: 190, h: 246 },
  yuanzhen: { w: 138, h: 256 },
  tianmo: { w: 206, h: 262 },
};

const FALLBACK_BOX: SpriteBox = { w: 148, h: 228 };

function pack(id: string) {
  if (id === "player") {
    return {
      idle: [1, 2, 3, 4].map((n) => `/sprites/player/idle-${n}.png?v=9`),
      attack: [1, 2, 3, 4].map((n) => `/sprites/player/attack-${n}.png?v=9`),
      hurt: ["/sprites/player/idle-3.png?v=9"],
    };
  }
  const base = `/sprites/${id}`;
  return {
    idle: [`${base}/idle-1.png?v=21`, `${base}/idle-2.png?v=21`],
    attack: [`${base}/attack.png?v=21`],
    hurt: [`${base}/hurt.png?v=21`],
  };
}

export function spriteFrames(defId: string, pose: SpritePose): string[] {
  return pack(defId)[pose];
}

export function spriteBox(defId: string, crowded = false): SpriteBox {
  const box = SPRITE_BOX[defId] ?? FALLBACK_BOX;
  if (!crowded) return box;
  return { w: Math.round(box.w * 0.84), h: Math.round(box.h * 0.84) };
}

/** @deprecated use spriteBox — kept so old calls compile while migrating */
export function spriteScale(defId: string): "sm" | "md" | "lg" | "xl" {
  const h = spriteBox(defId).h;
  if (h <= 212) return "sm";
  if (h <= 230) return "md";
  if (h <= 248) return "lg";
  return "xl";
}

export function spriteTint(_defId: string): string {
  return "";
}
