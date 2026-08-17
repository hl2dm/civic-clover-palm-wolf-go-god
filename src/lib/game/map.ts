import { Rng } from "./rng";
import type { ActId, MapNode, NodeType } from "./types";

const LAYER_WIDTHS = [1, 3, 4, 3, 4, 3, 3, 2, 1];

function assignType(layer: number, slot: number, rng: Rng, calamity: number): NodeType {
  if (layer === 0) return "combat";
  if (layer === LAYER_WIDTHS.length - 1) return "boss";
  if (layer === LAYER_WIDTHS.length - 2) {
    return rng.chance(0.55) ? "rest" : rng.chance(0.5) ? "shop" : "event";
  }
  if (layer === 1) return rng.chance(0.65) ? "combat" : "event";
  if (layer === 4 && slot === 0) return "treasure";
  const roll = rng.next();
  const eliteCut = 0.12 + Math.max(0, calamity) * 0.04;
  if (layer >= 3 && roll < eliteCut) return "elite";
  if (roll < 0.42) return "combat";
  if (roll < 0.6) return "event";
  if (roll < 0.72) return "shop";
  if (layer >= 3 && roll < 0.86) return "rest";
  if (roll < 0.93) return "treasure";
  return "combat";
}

export function generateMap(act: ActId, rng: Rng, calamity = 0): MapNode[] {
  let attempt = 0;
  while (attempt < 12) {
    attempt += 1;
    const layers: MapNode[][] = LAYER_WIDTHS.map((width, layer) =>
      Array.from({ length: width }, (_, slot) => ({
        id: `a${act}-l${layer}-s${slot}`,
        layer,
        slot,
        type: assignType(layer, slot, rng, calamity),
        next: [] as string[],
      })),
    );

    const last = layers[layers.length - 2];
    if (last && !last.some((n) => n.type === "rest")) {
      last[0]!.type = "rest";
    }
    const mid = layers.slice(1, -2).flat();
    if (!mid.some((n) => n.type === "shop")) {
      const pick = mid[Math.min(mid.length - 1, 3)];
      if (pick) pick.type = "shop";
    }
    if (!mid.some((n) => n.type === "elite")) {
      const pick = layers[5]?.[0];
      if (pick && pick.type !== "boss") pick.type = "elite";
    }

    for (let i = 0; i < layers.length - 1; i++) {
      const cur = layers[i]!;
      const nxt = layers[i + 1]!;
      for (const node of cur) {
        const x = node.slot / Math.max(1, cur.length - 1);
        const ranked = [...nxt].sort((a, b) => {
          const ax = a.slot / Math.max(1, nxt.length - 1);
          const bx = b.slot / Math.max(1, nxt.length - 1);
          return Math.abs(ax - x) - Math.abs(bx - x);
        });
        const first = ranked[0];
        if (first) node.next.push(first.id);
        if (ranked[1] && rng.chance(0.55)) node.next.push(ranked[1].id);
      }
      for (const child of nxt) {
        const hasParent = cur.some((p) => p.next.includes(child.id));
        if (!hasParent) {
          const parent = rng.pick(cur);
          parent.next.push(child.id);
        }
      }
    }

    const nodes = layers.flat();
    if (isConnected(nodes)) return nodes;
  }
  return generateMap(act, rng, calamity);
}

function isConnected(nodes: MapNode[]): boolean {
  const start = nodes.find((n) => n.layer === 0);
  if (!start) return false;
  const seen = new Set<string>([start.id]);
  const q = [start.id];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  while (q.length) {
    const id = q.pop()!;
    const node = byId.get(id);
    if (!node) continue;
    for (const n of node.next) {
      if (!seen.has(n)) {
        seen.add(n);
        q.push(n);
      }
    }
  }
  return nodes.every((n) => seen.has(n.id));
}

export function reachableFrom(currentId: string | null, nodes: MapNode[], visited: string[]): string[] {
  if (!currentId) {
    return nodes.filter((n) => n.layer === 0).map((n) => n.id);
  }
  const cur = nodes.find((n) => n.id === currentId);
  if (!cur) return [];
  return cur.next.filter((id) => !visited.includes(id));
}

export const ACT_NAME: Record<ActId, string> = {
  1: "練氣境 · 青冥山",
  2: "築基境 · 劫雲臺",
  3: "元嬰境 · 星隕谷",
};

export const NODE_LABEL: Record<NodeType, string> = {
  combat: "斬妖",
  elite: "精英",
  rest: "歇息",
  shop: "坊市",
  event: "奇遇",
  treasure: "洞藏",
  boss: "渡劫",
};
