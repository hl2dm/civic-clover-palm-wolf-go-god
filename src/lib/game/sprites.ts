export type SpritePose = "idle" | "attack" | "hurt";

const ALIAS: Record<string, string> = {
  player: "player",
  shanxiao: "shanxiao",
  yeshou: "yeshou",
  sanxiu: "yeshou",
  neimen: "yeshou",
  lingshe: "lingshe",
  shikui: "shikui",
  huoya: "huoya",
  juyuan: "juyuan",
  zhuji: "zhuji",
  jindan: "jindan",
  xinmo: "jindan",
};

function pack(id: string) {
  if (id === "player") {
    return {
      idle: [1, 2, 3, 4].map((n) => `/sprites/player/idle-${n}.png?v=6`),
      attack: [1, 2, 3, 4].map((n) => `/sprites/player/attack-${n}.png?v=6`),
      hurt: ["/sprites/player/idle-3.png?v=6"],
    };
  }
  const base = `/sprites/${id}`;
  return {
    idle: [`${base}/idle-1.png?v=4`, `${base}/idle-2.png?v=4`],
    attack: [`${base}/attack.png?v=4`],
    hurt: [`${base}/hurt.png?v=4`],
  };
}

export function spriteFrames(defId: string, pose: SpritePose): string[] {
  const id = ALIAS[defId] ?? "shanxiao";
  return pack(id)[pose];
}

export function spriteScale(defId: string): "sm" | "md" | "lg" | "xl" {
  if (defId === "player") return "md";
  if (defId === "huoya" || defId === "lingshe") return "lg";
  return "xl";
}
