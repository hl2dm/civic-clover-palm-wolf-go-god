import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/game/GameApp";

export const Route = createFileRoute("/")({
  component: Home,
  ssr: false,
});

function Home() {
  return <GameApp />;
}
