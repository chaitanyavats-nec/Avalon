import { GameState, Player } from '@/types/avalon';
import { Droplets } from 'lucide-react';

export default function LadyOfLake({ gameState, currentPlayer, roomCode }: { gameState: GameState; currentPlayer: Player; roomCode: string }) {
  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center">
      <div className="text-center flex flex-col items-center">
        <Droplets className="w-12 h-12 mb-4 text-info" />
        <h1 className="text-2xl font-bold text-text mb-2">Lady of the Lake</h1>
        <p className="text-text-dim text-sm">Lady Phase — Coming Soon</p>
      </div>
    </div>
  );
}
