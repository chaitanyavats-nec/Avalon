import { GameState, Player } from '@/types/avalon';

export default function Lobby({ gameState, currentPlayer, roomCode }: { gameState: GameState; currentPlayer: Player; roomCode: string }) {
  return (
    <div className="min-h-screen bg-textured p-4 text-parchment flex flex-col items-center">
      <h1 className="font-cinzel text-3xl text-gold mb-2">Lobby</h1>
      <p className="text-xl mb-8">Code: <span className="font-mono tracking-widest text-white">{roomCode}</span></p>
      
      <div className="w-full max-w-md bg-bg-surface border border-neutral rounded-lg p-6">
        <h2 className="text-xl text-parchment-dim mb-4 border-b border-neutral pb-2">Players</h2>
        <ul className="space-y-2">
          {gameState.players.map(p => (
            <li key={p.id} className="flex justify-between items-center">
              <span>{p.name} {p.id === currentPlayer.id && '(You)'} {p.isHost && '👑'}</span>
              <span className={p.isReady ? 'text-success' : 'text-parchment-dim'}>
                {p.isReady ? 'Ready' : 'Not Ready'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
