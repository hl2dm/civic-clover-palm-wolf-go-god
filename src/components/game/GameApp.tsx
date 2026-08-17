import { useEffect, useRef, useState } from "react";
import { installUnlock, setAmbience } from "@/lib/game/audio";
import { saveRun } from "@/lib/game/save";
import { useGame } from "@/lib/game/store";
import { CombatView } from "./CombatView";
import { DeckModal, HelpModal, HeritageModal, ItemInspect, ToastBar, TopBar } from "./Chrome";
import { MapView } from "./MapView";
import {
  EventView,
  RestView,
  ResultView,
  RewardView,
  SelectView,
  ShopView,
  TreasureView,
} from "./Overlays";
import { TitleScreen } from "./TitleScreen";

export function GameApp() {
  const ready = useGame((s) => s.ready);
  const screen = useGame((s) => s.screen);
  const [veil, setVeil] = useState(false);
  const prevScreen = useRef(screen);

  useEffect(() => {
    useGame.getState().hydrate();
  }, []);

  useEffect(() => installUnlock(), []);

  useEffect(() => {
    setAmbience(screen);
  }, [screen]);

  useEffect(() => {
    if (prevScreen.current === screen) return;
    prevScreen.current = screen;
    setVeil(true);
    const t = window.setTimeout(() => setVeil(false), 780);
    return () => window.clearTimeout(t);
  }, [screen]);

  useEffect(() => {
    (window as unknown as { __wendao?: typeof useGame }).__wendao = useGame;
  }, []);

  useEffect(() => {
    const flush = () => {
      const s = useGame.getState();
      if (s.run && s.screen !== "title" && s.screen !== "result") {
        saveRun(s.screen === "combat" ? "combat" : s.screen, s.run);
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-muted">
        <p className="font-serif text-lg">開卷……</p>
      </main>
    );
  }

  if (screen === "title") {
    return (
      <>
        <TitleScreen />
        <HelpModal />
        <HeritageModal />
      </>
    );
  }
  if (screen === "result") {
    return (
      <>
        <ResultView />
        <HelpModal />
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-bg" data-screen={screen}>
      {veil ? <div className="ink-veil" /> : null}
      <TopBar />
      {screen === "map" ? <MapView /> : null}
      {screen === "combat" ? <CombatView /> : null}
      {screen === "reward" ? <RewardView /> : null}
      {screen === "shop" ? <ShopView /> : null}
      {screen === "rest" ? <RestView /> : null}
      {screen === "event" ? <EventView /> : null}
      {screen === "treasure" ? <TreasureView /> : null}
      {screen === "select" ? <SelectView /> : null}
      <DeckModal />
      <HelpModal />
      <HeritageModal />
      <ItemInspect />
      <ToastBar />
    </main>
  );
}