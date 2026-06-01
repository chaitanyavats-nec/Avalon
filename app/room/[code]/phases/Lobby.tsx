import { useState } from 'react';
import { GameState, Player } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Crown, Copy, Share, Check } from 'lucide-react';

export default function Lobby({ gameState, currentPlayer, roomCode, roomId }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const supabase = createClient();

  const toggleReady = async () => {
    setLoading(true);
    await supabase.from('players').update({ is_ready: !currentPlayer.isReady }).eq('id', currentPlayer.id);
    setLoading(false);
  };

  const kickPlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to kick this player?')) return;
    setLoading(true);
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) {
      console.error(error);
      alert('Failed to kick player: ' + error.message);
    }
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
    const botNames = ['Sir Lancelot', 'Sir Gawain', 'Lady Guinevere', 'Sir Tristan', 'Sir Galahad', 'Sir Percival', 'Sir Bors', 'Sir Bedivere', 'Lady Elaine'];
    const botInserts = Array.from({ length: botsNeeded }).map((_, i) => ({
      room_id: roomId,
      session_id: crypto.randomUUID(),
      name: botNames[i % botNames.length],
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
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center">
      
      {/* Header */}
      <div className="text-center mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-text mb-4">
          Lobby
        </h1>
        <div className="inline-flex items-center gap-3 bg-surface border border-border rounded-lg pl-4 pr-2 py-2">
          <span className="text-text-dim text-xs uppercase font-medium">Room Code</span>
          <span className="text-text font-mono font-bold text-xl tracking-widest mr-2">
            {roomCode}
          </span>
          <div className="flex gap-1 border-l border-border pl-3">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="p-2 hover:bg-gray-100 rounded-md text-text-dim hover:text-text transition-colors active:bg-gray-200"
              title="Copy Room Code"
              disabled={copiedCode}
            >
              {copiedCode ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => {
                const joinLink = `${window.location.origin}/join?code=${roomCode}`;
                navigator.clipboard.writeText(joinLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="p-2 hover:bg-gray-100 rounded-md text-text-dim hover:text-text transition-colors active:bg-gray-200"
              title="Copy Join Link"
              disabled={copiedLink}
            >
              {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Share className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Player Board */}
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-sm p-6 animate-slideUp">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-text">Players</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-text-dim">
            {currentCount} / {requiredPlayers}
          </span>
        </div>
        
        <ul className="space-y-2 mb-8 stagger-children">
          {gameState.players.map(p => (
            <li key={p.id} 
                className={`flex justify-between items-center p-3 rounded-lg border ${p.id === currentPlayer.id ? 'border-text bg-gray-50' : 'border-border bg-surface'}`}>
              <span className="flex items-center gap-2">
                <span className="font-medium text-text">
                  {p.name}
                </span>
                {p.id === currentPlayer.id && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-text text-surface uppercase">
                    You
                  </span>
                )}
                {p.isHost && <Crown className="w-4 h-4 text-info" title="Host" />}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${p.isReady ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-dim'}`}>
                  {p.isReady ? 'Ready' : 'Waiting'}
                </span>
                {currentPlayer.isHost && p.id !== currentPlayer.id && (
                  <button 
                    onClick={() => kickPlayer(p.id)}
                    disabled={loading}
                    className="text-text-dim hover:text-danger p-1 rounded transition-colors"
                    title="Kick player"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </li>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, requiredPlayers - currentCount) }).map((_, i) => (
            <li key={`empty-${i}`} 
                className="flex items-center p-3 rounded-lg border border-dashed border-border bg-gray-50/50">
              <span className="text-sm text-text-dim italic">Awaiting player...</span>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Button 
            onClick={toggleReady} 
            disabled={loading} 
            variant={currentPlayer.isReady ? "outline" : "primary"}
            className={`w-full ${currentPlayer.isReady ? 'border-border text-text' : 'bg-text text-surface'}`}
          >
            {currentPlayer.isReady ? 'Stand Down' : 'I Am Ready'}
          </Button>

          {currentPlayer.isHost && (
            <>
              <div className="h-px bg-border my-4" />
              
              <div className="space-y-3">
                {currentCount < requiredPlayers && (
                  <Button 
                    onClick={addBots} 
                    disabled={loading} 
                    variant="ghost"
                    className="w-full text-xs"
                  >
                    Fill with Bots (Test Mode)
                  </Button>
                )}
                <Button 
                  onClick={startGame} 
                  disabled={loading || !allReady || currentCount !== requiredPlayers} 
                  variant="primary"
                  className="w-full"
                >
                  {!allReady ? 'Waiting for players to ready...' : 
                   currentCount !== requiredPlayers ? `Need ${requiredPlayers} players` : 
                   'Start Game'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
