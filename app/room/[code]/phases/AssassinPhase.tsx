import { GameState, Player } from '@/types/avalon';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Sword } from 'lucide-react';

export default function AssassinPhase({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const supabase = createClient();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const assassin = gameState.players.find(p => p.role === 'Assassin');
  const isAssassin = currentPlayer.id === assassin?.id;
  const isBotAssassin = assassin && (assassin.name.startsWith('Sir ') || assassin.name.startsWith('Lady '));

  const handleAssassinate = async (targetId: string) => {
    setLoading(true);
    const targetPlayer = gameState.players.find(p => p.id === targetId);
    
    const isMerlin = targetPlayer?.role === 'Merlin';
    const newSettings = {
      ...gameState.settings,
      assassinationResult: {
        targetName: targetPlayer?.name,
        isMerlin
      }
    };

    await supabase.from('rooms').update({ status: 'ended', settings: newSettings }).eq('id', roomId);
    setLoading(false);
  };

  useEffect(() => {
    if (currentPlayer.isHost && isBotAssassin) {
      const storageKey = `bot_assassination_${roomId}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, 'true');
        
        // Bot randomly picks someone from the Good team
        const goodPlayers = gameState.players.filter(p => p.team === 'good');
        const target = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
        
        if (target) {
          setTimeout(() => {
            handleAssassinate(target.id);
          }, 3500);
        } else {
          // Fallback if no good players (shouldn't happen)
          supabase.from('rooms').update({ status: 'ended' }).eq('id', roomId);
        }
      }
    }
  }, [currentPlayer.isHost, isBotAssassin, roomId, gameState.players]);

  if (!assassin) {
    // If no assassin exists, immediately end game
    if (currentPlayer.isHost) {
      supabase.from('rooms').update({ status: 'ended' }).eq('id', roomId);
    }
    return <div className="min-h-screen bg-realm p-4 flex items-center justify-center">Ending game...</div>;
  }

  // Filter out the Assassin and known evil from being viable targets
  const viableTargets = gameState.players.filter(p => p.team !== 'evil');

  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center">
      <div className="text-center w-full max-w-md flex flex-col items-center">
        <Sword className="w-20 h-20 mb-4 text-danger animate-float" strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-text mb-2 text-danger animate-slideDown">The Assassin Strikes</h1>
        
        {isAssassin ? (
          <div className="bg-surface border border-border rounded-lg shadow-sm p-6 mt-6 w-full animate-slideUp animate-pulseGlowDanger">
            <p className="text-sm font-medium text-text mb-6">
              The forces of Good have succeeded in 3 quests. However, you have one final chance to steal the victory. 
              <br/><br/>
              <strong>Identify and assassinate Merlin!</strong>
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {viableTargets.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id)}
                  className={`p-3 rounded-md text-sm text-left border cursor-pointer transition-colors ${selectedTarget === p.id ? 'bg-danger text-white border-danger font-bold' : 'bg-gray-50 text-text border-border hover:bg-gray-100'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <Button 
              className="w-full bg-danger hover:bg-red-700 text-white"
              disabled={!selectedTarget || loading}
              onClick={() => handleAssassinate(selectedTarget!)}
            >
              Assassinate
            </Button>
          </div>
        ) : (
          <div className="mt-8 bg-surface border border-border p-6 rounded-lg animate-fadeIn">
            <p className="text-lg font-bold text-text mb-2">Wait in silence.</p>
            <p className="text-sm text-text-dim">
              The Assassin <strong className="text-danger">{assassin.name}</strong> is currently making their final decision. If they find Merlin, Evil will snatch the victory!
            </p>
            {isBotAssassin && (
              <p className="text-xs text-text-dim mt-4 flex items-center justify-center gap-2">
                 <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 The bot is deciding...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
