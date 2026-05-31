import { GameState, Player } from '@/types/avalon';

export default function QuestPhase({ gameState, currentPlayer, roomCode }: { gameState: GameState; currentPlayer: Player; roomCode: string }) {
  return <div className="min-h-screen bg-textured p-4 text-parchment flex items-center justify-center">Quest Phase Placeholder</div>;
}
