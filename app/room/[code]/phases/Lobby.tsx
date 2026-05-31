import { useState } from 'react';
import { GameState, Player } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function Lobby({ gameState, currentPlayer, roomCode, roomId }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggleReady = async () => {
    setLoading(true);
    await supabase.from('players').update({ is_ready: !currentPlayer.isReady }).eq('id', currentPlayer.id);
    setLoading(false);
  };

  const startGame = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke('assign-roles', {
      body: { room_id: roomId }
    });
    
    if (error) {
      console.error(error);
      alert('Failed to start game: ' + error.message);
    }
    setLoading(false);
  };

  const addBots = async () => {
    const requiredPlayers = gameState.settings.playerCount;
    const currentCount = gameState.players.length;
    const botsNeeded = requiredPlayers - currentCount;
    
    if (botsNeeded <= 0) return;
    
    setLoading(true);
    const botNames = ['Bot Arthur', 'Bot Lancelot', 'Bot Gawain', 'Bot Guinevere', 'Bot Tristan', 'Bot Galahad', 'Bot Percival', 'Bot Bors', 'Bot Bedivere'];
    
    const botInserts = Array.from({ length: botsNeeded }).map((_, i) => ({
      room_id: roomId,
      session_id: crypto.randomUUID(), // fake session for bot
      name: botNames[i % botNames.length] + ' ' + Math.floor(Math.random() * 100),
      is_host: false,
      is_ready: true,
    }));
    
    await supabase.from('players').insert(botInserts);
    setLoading(false);
  };

  const allReady = gameState.players.length > 0 && gameState.players.every(p => p.isReady);
  const requiredPlayers = gameState.settings.playerCount;
  const currentCount = gameState.players.length;

  return (
    <div className="min-h-screen bg-textured p-4 text-parchment flex flex-col items-center justify-center">
      <h1 className="font-cinzel text-4xl text-gold mb-2">Lobby</h1>
      <p className="text-2xl mb-8">Room Code: <span className="font-mono tracking-widest text-white border border-neutral px-4 py-2 rounded bg-bg-deep">{roomCode}</span></p>
      
      <div className="w-full max-w-md bg-bg-surface border border-neutral rounded-lg p-6 shadow-xl mb-8">
        <div className="flex justify-between items-center border-b border-neutral pb-2 mb-4">
          <h2 className="text-xl text-parchment-dim">Players</h2>
          <span className="text-sm text-neutral">{currentCount} / {requiredPlayers}</span>
        </div>
        
        <ul className="space-y-3 mb-6">
          {gameState.players.map(p => (
            <li key={p.id} className="flex justify-between items-center bg-bg-elevated p-3 rounded border border-neutral/50">
              <span className="text-lg">
                {p.name} {p.id === currentPlayer.id && <span className="text-parchment-dim text-sm">(You)</span>} 
                {p.isHost && <span className="ml-2 text-gold text-sm" title="Host">👑</span>}
              </span>
              <span className={`text-sm px-2 py-1 rounded ${p.isReady ? 'bg-success/20 text-success border border-success/30' : 'text-parchment-dim border border-neutral'}`}>
                {p.isReady ? 'Ready' : 'Not Ready'}
              </span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, requiredPlayers - currentCount) }).map((_, i) => (
            <li key={`empty-${i}`} className="flex justify-between items-center bg-bg-elevated/50 p-3 rounded border border-dashed border-neutral/30 opacity-50">
              <span className="text-parchment-dim italic">Waiting for player...</span>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <Button 
            onClick={toggleReady} 
            disabled={loading} 
            variant={currentPlayer.isReady ? "outline" : "primary"}
            className="w-full"
          >
            {currentPlayer.isReady ? 'Cancel Ready' : 'I am Ready'}
          </Button>

          {currentPlayer.isHost && (
            <div className="pt-4 border-t border-neutral/50 mt-4 space-y-4">
              {currentCount < requiredPlayers && (
                <Button 
                  onClick={addBots} 
                  disabled={loading} 
                  variant="outline"
                  className="w-full"
                >
                  Fill with Bots (Test Mode)
                </Button>
              )}
              <Button 
                onClick={startGame} 
                disabled={loading || !allReady || currentCount !== requiredPlayers} 
                variant="primary"
                className="w-full relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gold/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative font-cinzel tracking-wider text-lg">
                  {!allReady ? 'Waiting for players to ready...' : 
                   currentCount !== requiredPlayers ? `Need ${requiredPlayers} players` : 
                   'Start Game'}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
