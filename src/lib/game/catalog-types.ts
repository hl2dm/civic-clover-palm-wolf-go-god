import type { CardRarity, CardType, CombatState, TargetKind } from "./types";

export interface CardDef {
  id: string;
  name: string;
  seal: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  target: TargetKind;
  exhaust?: boolean;
  unlock?: string;
  text: (up: boolean) => string;
  play: (c: CombatState, up: boolean, targetId?: string) => void;
}
