export type Screen =
  | "title"
  | "map"
  | "combat"
  | "reward"
  | "shop"
  | "rest"
  | "event"
  | "treasure"
  | "select"
  | "result";

export type CardType = "attack" | "skill" | "power";
export type CardRarity = "starter" | "common" | "uncommon" | "rare";
export type TargetKind = "enemy" | "all" | "self" | "none";
export type NodeType = "combat" | "elite" | "rest" | "shop" | "event" | "treasure" | "boss";

export type StatusId =
  | "strength"
  | "dexterity"
  | "vulnerable"
  | "weak"
  | "frail"
  | "poison"
  | "thorns"
  | "regen"
  | "nextStrike"
  | "metallicize";

export interface Status {
  id: StatusId;
  stacks: number;
}

export interface CardInst {
  uid: string;
  defId: string;
  upgraded: boolean;
}

export type IntentKind = "attack" | "defend" | "debuff" | "buff" | "attackDebuff";

export interface Intent {
  kind: IntentKind;
  value: number;
  extra?: number;
  status?: StatusId;
}

export interface EnemyInst {
  uid: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Status[];
  intent: Intent;
  patternIndex: number;
}

export interface Floater {
  id: string;
  text: string;
  kind: "dmg" | "block" | "heal" | "status";
  target: "player" | string;
}

export interface CombatState {
  phase: "player" | "enemy" | "victory" | "defeat";
  turn: number;
  energy: number;
  maxEnergy: number;
  playerBlock: number;
  playerHp: number;
  playerMaxHp: number;
  playerStatuses: Status[];
  enemies: EnemyInst[];
  hand: CardInst[];
  drawPile: CardInst[];
  discardPile: CardInst[];
  exhaustPile: CardInst[];
  powers: { defId: string; upgraded: boolean }[];
  selectedUid: string | null;
  rngState: number;
  floaters: Floater[];
  log: string[];
  cardsPlayed: number;
  heartUsed: boolean;
  relics: string[];
  extraDraw: number;
  freePlay: boolean;
  lieboArmed: boolean;
}

export interface MapNode {
  id: string;
  layer: number;
  slot: number;
  type: NodeType;
  next: string[];
}

export interface ShopOffer {
  kind: "card" | "relic" | "potion" | "remove";
  id: string;
  price: number;
  sold: boolean;
  upgraded?: boolean;
}

export interface EventChoiceView {
  id: string;
  label: string;
  hint: string;
}

export interface PendingSelect {
  kind: "upgrade" | "remove" | "transform";
  title: string;
  hint: string;
  after: "map" | "rest" | "shop";
}

export interface RewardState {
  gold: number;
  cards: CardInst[];
  potion: string | null;
  relic: string | null;
  pickedCard: boolean;
  pickedPotion: boolean;
  pickedRelic: boolean;
}

export interface RunState {
  seed: number;
  act: 1 | 2;
  hp: number;
  maxHp: number;
  gold: number;
  maxEnergy: number;
  deck: CardInst[];
  relics: string[];
  potions: (string | null)[];
  map: MapNode[];
  currentNodeId: string | null;
  visited: string[];
  floor: number;
  nextUid: number;
  rngState: number;
  kills: number;
}

export interface MetaState {
  version: number;
  runs: number;
  victories: number;
  bestAct: number;
  bestFloor: number;
}

export const SAVE_VERSION = 1;
export const START_HP = 72;
export const START_GOLD = 99;
export const START_ENERGY = 3;
export const HAND_SIZE = 5;
export const HAND_CAP = 10;
export const POTION_SLOTS = 3;
