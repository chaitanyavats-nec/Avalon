import { GameState, Player } from '@/types/avalon';

export default function GameOver({ gameState, currentPlayer, roomCode }: { gameState: GameState; currentPlayer: Player; roomCode: string }) {
  return <div className="min-h-screen bg-textured p-4 text-parchment flex items-center justify-center">Game Over Phase Placeholder</div>;
}
