import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { saveRun } from "@/lib/game/save";
import { CARDS } from "@/lib/game/cards";
import { canUpgrade } from "@/lib/game/events";
import { ACT_NAME } from "@/lib/game/map";
import { POTIONS } from "@/lib/game/potions";
import { RELICS } from "@/lib/game/relics";
import { sfx } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./ItemIcon";
import { TalismanCard } from "./TalismanCard";

export function RewardView() {
  const { reward, pickRewardCard, skipRewardCard, takeRewardPotion, takeRewardRelic, leaveReward } =
    useGame();
  if (!reward) return null;
  const relic = reward.relic ? RELICS[reward.relic] : null;
  const potion = reward.potion ? POTIONS[reward.potion] : null;
  return (
    <SceneShell bg="/arena-qingming.jpg" dataTag="reward">
      <div className="relative mx-auto flex min-h-[calc(100dvh-52px)] max-w-6xl flex-col px-3 py-4 sm:px-8 sm:py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.38em] text-paper/60">戰後</p>
            <h2 className="display-ink mt-1 text-4xl leading-none text-paper sm:text-6xl">收穫</h2>
            <p className="mt-2 text-sm text-paper/70">擇一門功法收入匣中，丹藥與法寶另取。</p>
          </div>
          <div className="loot-gold flex items-center gap-3 px-4 py-2 sm:px-5 sm:py-3">
            <span className="display-ink text-xs tracking-[0.32em] text-paper/65">靈石</span>
            <span className="qi-num qi-num-heal text-4xl leading-none sm:text-5xl">+{reward.gold}</span>
          </div>
        </header>

        <div className="mt-5 flex flex-1 flex-col justify-center gap-6">
          <section>
            <p className="display-ink mb-3 text-center text-[11px] tracking-[0.4em] text-paper/55">功法三選一</p>
            <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-5">
              {reward.cards.map((c) => (
                <TalismanCard
                  key={c.uid}
                  card={c}
                  size="lg"
                  dimmed={reward.pickedCard}
                  disabled={reward.pickedCard}
                  onClick={() => pickRewardCard(c.uid)}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              {!reward.pickedCard ? (
                <Button variant="ghost" onClick={skipRewardCard}>
                  放棄功法
                </Button>
              ) : (
                <Button size="lg" onClick={leaveReward}>
                  繼續前行
                </Button>
              )}
            </div>
          </section>

          {potion || relic ? (
            <section className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {potion && !reward.pickedPotion ? (
                <button type="button" onClick={takeRewardPotion} className="loot-tile">
                  <ItemIcon kind="potion" id={potion.id} className="size-20 sm:size-28" />
                  <span className="min-w-0 text-left">
                    <span className="block text-[10px] tracking-[0.28em] text-paper/50">丹藥</span>
                    <span className="display-ink block text-lg text-paper sm:text-2xl">{potion.name}</span>
                    <span className="mt-0.5 block text-xs text-paper/65 sm:text-sm">{potion.text}</span>
                  </span>
                  <span className="display-ink shrink-0 text-sm tracking-widest text-paper">收取</span>
                </button>
              ) : null}
              {relic && !reward.pickedRelic ? (
                <button type="button" onClick={takeRewardRelic} className="loot-tile">
                  <ItemIcon kind="relic" id={relic.id} className="size-20 sm:size-28" />
                  <span className="min-w-0 text-left">
                    <span className="block text-[10px] tracking-[0.28em] text-paper/50">法寶</span>
                    <span className="display-ink block text-lg text-paper sm:text-2xl">{relic.name}</span>
                    <span className="mt-0.5 block text-xs text-paper/65 sm:text-sm">{relic.text}</span>
                  </span>
                  <span className="display-ink shrink-0 text-sm tracking-widest text-paper">收取</span>
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </SceneShell>
  );
}

export function ShopView() {
  const { shop, run, buyShop, leaveShop } = useGame();
  const [picked, setPicked] = useState<number | null>(null);
  const [line, setLine] = useState(GREET);
  const [shake, setShake] = useState(0);
  if (!shop || !run) return null;

  const cards = shop.map((o, i) => ({ o, i })).filter((x) => x.o.kind === "card");
  const extras = shop.map((o, i) => ({ o, i })).filter((x) => x.o.kind !== "card");
  const offer = picked != null ? shop[picked] : null;
  const info = offer ? describeOffer(offer) : null;
  const poor = Boolean(offer && !offer.sold && run.gold < offer.price);

  const pick = (i: number) => {
    const o = shop[i];
    if (!o) return;
    if (o.sold) {
      setPicked(null);
      setLine("這件已有主了。");
      sfx.deny();
      return;
    }
    setPicked(i);
    setLine(lineFor(o));
    sfx.select();
  };

  const confirm = () => {
    if (picked == null || !offer) return;
    if (offer.sold) return;
    if (run.gold < offer.price) {
      setLine(`靈石不足，這件要 ${offer.price}。`);
      setShake((n) => n + 1);
      buyShop(picked);
      return;
    }
    buyShop(picked);
    if (offer.kind === "remove") return;
    setLine("成交。收好了。");
    setPicked(null);
  };

  return (
    <SceneShell bg="/scenes/shop-stall.jpg" dataTag="shop">
      <div className="pointer-events-none absolute inset-0">
        <span className="lantern-orb lantern-orb-a" />
        <span className="lantern-orb lantern-orb-b" />
        <span className="lantern-orb lantern-orb-c" />
      </div>
      <div className="relative flex min-h-[calc(100dvh-52px)] flex-col px-3 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
        <header className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="shop-sign grid place-items-center px-4 py-2 sm:px-5 sm:py-2.5">
              <p className="text-[10px] tracking-[0.38em] text-paper/55">山中夜市</p>
              <h2 className="display-ink text-3xl leading-none text-paper sm:text-4xl">坊市</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="plaque flex items-center gap-2 rounded-full px-3 py-1.5">
              <span className="display-ink text-xs tracking-widest text-paper/70">靈石</span>
              <span className="qi-num qi-num-heal text-2xl leading-none sm:text-3xl">{run.gold}</span>
            </div>
            <Button variant="ghost" onClick={leaveShop}>
              離去
            </Button>
          </div>
        </header>

        <div className="relative z-10 mt-3 grid flex-1 items-end gap-3 sm:mt-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-stretch sm:gap-5">
          <aside className="flex items-end gap-3 sm:flex-col sm:items-stretch">
            <div className="portrait-scroll w-24 shrink-0 overflow-hidden sm:w-full">
              <img
                src="/scenes/keeper-bust.jpg"
                alt="夜市掌櫃"
                className="aspect-[3/4] size-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
            <div className="min-w-0 flex-1 sm:flex-none">
              <p className="display-ink text-sm tracking-[0.28em] text-paper/75">夜市掌櫃</p>
              <div key={line} className="shop-speech mt-1.5 px-3 py-2 sm:mt-2 sm:px-3.5 sm:py-3">
                <p className="font-serif text-sm leading-relaxed text-paper-ink sm:text-base">{line}</p>
              </div>
            </div>
          </aside>

          <div className="shop-board flex max-h-[min(36rem,calc(100dvh-14rem))] flex-col gap-3 overflow-y-auto p-3 sm:max-h-none sm:gap-4 sm:p-4">
            <section>
              <p className="display-ink mb-2 text-[11px] tracking-[0.34em] text-paper-ink/60">案上符籙</p>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-3 sm:justify-start sm:gap-x-4">
                {cards.map(({ o, i }) => (
                  <div key={`${o.id}-${i}`} className="relative flex w-[6.75rem] shrink-0 flex-col items-center gap-1.5 sm:w-[7.25rem]">
                    <TalismanCard
                      card={{ uid: `shop-${i}`, defId: o.id, upgraded: false }}
                      compact
                      dimmed={o.sold || run.gold < o.price}
                      selected={picked === i}
                      onClick={() => pick(i)}
                    />
                    <PriceTag price={o.price} sold={o.sold} poor={run.gold < o.price} />
                    {o.sold ? <SoldStamp /> : null}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="display-ink mb-2 text-[11px] tracking-[0.34em] text-paper-ink/60">法寶 · 丹藥 · 廢功</p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {extras.map(({ o, i }) => (
                  <li key={`${o.kind}-${o.id}-${i}`}>
                    <StallTile
                      offer={o}
                      poor={run.gold < o.price}
                      selected={picked === i}
                      onPick={() => pick(i)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {offer && info ? (
          <div
            key={`${picked}-${shake}`}
            className={`shop-deal relative z-10 mt-3 flex flex-wrap items-center gap-3 px-3 py-3 sm:mt-4 sm:px-4 ${poor ? "card-starve" : ""}`}
          >
            {offer.kind === "card" ? (
              <TalismanCard card={{ uid: "shop-preview", defId: offer.id, upgraded: false }} compact />
            ) : (
              <ItemIcon
                kind={info.iconKind}
                id={info.iconId}
                seal={info.seal}
                className="size-16 shrink-0 rounded-md bg-paper-ink/15 p-1 sm:size-20"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] tracking-[0.28em] text-paper-ink/55">{info.kindLabel}</p>
              <h3 className="font-serif text-lg text-paper-ink sm:text-xl">{info.name}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-paper-ink/70 sm:text-sm">{info.text}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="display-ink text-xs tracking-[0.2em] text-paper-ink/55">靈石</span>
              <span className={`qi-num min-w-[3rem] text-right text-3xl leading-none ${poor ? "qi-num-dmg" : "qi-num-heal"}`}>
                {offer.sold ? "—" : offer.price}
              </span>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                作罷
              </Button>
              <Button onClick={confirm} disabled={offer.sold}>
                {offer.kind === "remove" ? "廢功" : "購置"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="relative z-10 mt-3 text-center text-[11px] tracking-[0.22em] text-paper/55 sm:mt-4">
            點案上貨色，再與掌櫃成交
          </p>
        )}
      </div>
    </SceneShell>
  );
}

const GREET = "客官要些什麼？靈石現結。";

function lineFor(offer: { kind: string }) {
  if (offer.kind === "card") return "這門功法，倒也難得。";
  if (offer.kind === "relic") return "此寶有緣人得之。";
  if (offer.kind === "potion") return "丹成一粒，勝苦修三月。";
  return "廢去雜功，方能精進。";
}

function describeOffer(offer: { kind: string; id: string }) {
  if (offer.kind === "card") {
    const def = CARDS[offer.id];
    return {
      kindLabel: "符籙",
      name: def?.name ?? "功法",
      text: def ? def.text(false) : "",
      seal: def?.seal ?? "符",
      iconKind: "misc" as const,
      iconId: "remove",
    };
  }
  if (offer.kind === "relic") {
    const r = RELICS[offer.id];
    return {
      kindLabel: "法寶",
      name: r?.name ?? "法寶",
      text: r?.text ?? "",
      seal: r?.seal ?? "寶",
      iconKind: "relic" as const,
      iconId: offer.id,
    };
  }
  if (offer.kind === "potion") {
    const p = POTIONS[offer.id];
    return {
      kindLabel: "丹藥",
      name: p?.name ?? "丹藥",
      text: p?.text ?? "",
      seal: p?.seal ?? "丹",
      iconKind: "potion" as const,
      iconId: offer.id,
    };
  }
  return {
    kindLabel: "服務",
    name: "廢去一門功法",
    text: "從匣中移除一張牌，騰出修煉的位置。",
    seal: "廢",
    iconKind: "misc" as const,
    iconId: "remove",
  };
}

function StallTile({
  offer,
  poor,
  selected,
  onPick,
}: {
  offer: { kind: string; id: string; price: number; sold: boolean };
  poor: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const info = describeOffer(offer);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "shop-tile relative flex w-full flex-col items-center gap-1.5 px-2 py-2.5 text-paper-ink",
        (offer.sold || poor) && "opacity-55",
        selected && "shop-tile-on",
      )}
    >
      <ItemIcon
        kind={info.iconKind}
        id={info.iconId}
        seal={info.seal}
        className="size-16 sm:size-20"
      />
      <span className="display-ink max-w-full truncate text-xs leading-none sm:text-sm">{info.name}</span>
      <span
        className={cn(
          "price-chip mt-0.5 min-w-[3.25rem] px-2 py-0.5 text-center",
          offer.sold ? "sold" : poor ? "poor" : "",
        )}
      >
        {offer.sold ? "售罄" : `${offer.price}`}
      </span>
      {offer.sold ? <SoldStamp /> : null}
    </button>
  );
}

function PriceTag({ price, sold, poor }: { price: number; sold: boolean; poor: boolean }) {
  return (
    <span className={cn("price-chip min-w-[3.25rem] px-2.5 py-0.5 text-center", sold ? "sold" : poor ? "poor" : "")}>
      {sold ? "售罄" : price}
    </span>
  );
}

function SoldStamp() {
  return (
    <span className="sold-stamp pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <span className="display-ink rotate-[-18deg] rounded-sm border-2 border-accent px-2 py-0.5 text-lg tracking-[0.3em] text-accent">
        售罄
      </span>
    </span>
  );
}

export function RestView() {
  const { run, restHeal, restUpgrade } = useGame();
  if (!run) return null;
  const heal = Math.ceil(run.maxHp * 0.3) + (run.relics.includes("putuan") ? 12 : 0);
  return (
    <Panel title="歇息" eyebrow="溫養或療傷">
      <p className="text-sm text-muted">山風入袖。你可以調息回復，或溫養一門功法。</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" onClick={restHeal}>
          調息 · 回復 {heal}
        </Button>
        <Button className="flex-1" variant="ghost" onClick={restUpgrade}>
          溫養功法
        </Button>
      </div>
    </Panel>
  );
}

export function EventView() {
  const { event, eventLog, chooseEvent, run } = useGame();
  if (!event) return null;
  return (
    <SceneShell bg={event.bg} dataTag="event">
      <div className="relative mx-auto flex min-h-[calc(100dvh-52px)] max-w-6xl flex-col justify-end px-3 pb-4 pt-3 sm:px-8 sm:pb-6">
        <p className="absolute left-3 top-3 text-xs tracking-[0.38em] text-paper/60 sm:left-8 sm:top-4">奇遇</p>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:gap-8">
          {event.figure ? (
            <div className="event-figure mx-auto w-40 overflow-hidden sm:mx-0 sm:w-full">
              <img
                src={event.figure}
                alt=""
                className="aspect-[3/4] size-full object-cover object-top"
                crossOrigin="anonymous"
              />
            </div>
          ) : null}
          <div className="event-board flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="display-ink text-3xl leading-none text-paper sm:text-5xl">{event.title}</h2>
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-paper/10 font-serif text-2xl text-paper">
                {event.seal}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-paper/80 sm:text-base">{event.body}</p>
            {eventLog ? (
              <p className="display-ink text-lg leading-snug text-accent sm:text-xl">{eventLog}</p>
            ) : null}
            <div className="mt-1 flex flex-col gap-2">
              {!eventLog
                ? event.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => chooseEvent(c.id)}
                      className="choice-slip flex min-h-16 items-start gap-3 px-4 py-3 text-left"
                    >
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-paper-ink text-xs text-paper">
                        選
                      </span>
                      <span>
                        <span className="block font-serif text-base text-paper-ink sm:text-lg">{c.label}</span>
                        <span className="mt-0.5 block text-xs text-paper-ink/65 sm:text-sm">{c.hint}</span>
                      </span>
                    </button>
                  ))
                : (
                  <Button
                    className="self-end"
                    size="lg"
                    onClick={() => {
                      if (run) saveRun("map", run);
                      useGame.setState({ screen: "map", event: null, eventLog: null });
                    }}
                  >
                    繼續前行
                  </Button>
                )}
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

export function TreasureView() {
  const { treasure, pickTreasure } = useGame();
  if (!treasure) return null;
  return (
    <Panel title="洞藏" eyebrow="擇一法寶">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {treasure.map((id) => {
          const r = RELICS[id];
          if (!r) return null;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => pickTreasure(id)}
                className="flex w-full flex-col items-center gap-3 rounded-lg border border-border bg-elevated px-3 py-4 text-center"
              >
                <ItemIcon kind="relic" id={id} seal={r.seal} className="size-24 rounded-md bg-surface p-1.5" />
                <span>
                  <span className="block font-serif text-lg">{r.name}</span>
                  <span className="mt-1 block text-xs text-muted">{r.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function SelectView() {
  const { run, pending, pickSelectCard, cancelSelect } = useGame();
  if (!run || !pending) return null;
  const cards =
    pending.kind === "upgrade" ? run.deck.filter(canUpgrade) : run.deck;
  return (
    <Panel title={pending.title} eyebrow={pending.hint}>
      {cards.length === 0 ? (
        <p className="text-sm text-muted">沒有可選的功法。</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((c) => (
            <TalismanCard key={c.uid} card={c} onClick={() => pickSelectCard(c.uid)} />
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={cancelSelect}>
          作罷
        </Button>
      </div>
    </Panel>
  );
}

export function ResultView() {
  const { result, run, newRun, abandon } = useGame();
  const win = result === "win";
  return (
    <section className="relative min-h-dvh">
      <img
        src={win ? "/title-bg.jpg" : "/combat-bg.jpg"}
        alt=""
        className="absolute inset-0 size-full object-cover"
        crossOrigin="anonymous"
      />
      <div className="ink-vignette absolute inset-0" />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-end px-5 pb-14">
        <p className="text-xs tracking-[0.3em] text-muted">{win ? "天劫已過" : "道消身殞"}</p>
        <h1 className="mt-2 font-serif text-5xl">{win ? "渡劫成功" : "問道未果"}</h1>
        {run ? (
          <p className="mt-4 text-sm text-muted">
            {ACT_NAME[run.act]} · 第 {run.floor} 層 · 斬殺 {run.kills} · 功法 {run.deck.length}
          </p>
        ) : null}
        <div className="mt-8 flex gap-3">
          <Button size="lg" className="flex-1" onClick={newRun}>
            再入輪迴
          </Button>
          <Button size="lg" variant="ghost" className="flex-1" onClick={abandon}>
            歸山
          </Button>
        </div>
      </div>
    </section>
  );
}

function SceneShell({
  bg,
  dataTag,
  children,
}: {
  bg: string;
  dataTag?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative min-h-[calc(100dvh-52px)] overflow-hidden" data-scene={dataTag}>
      <img src={bg} alt="" className="absolute inset-0 size-full object-cover" crossOrigin="anonymous" />
      <div className="ink-vignette absolute inset-0" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto min-h-[calc(100dvh-52px)] max-w-2xl px-4 py-8">
      <p className="text-xs tracking-[0.3em] text-muted">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}
