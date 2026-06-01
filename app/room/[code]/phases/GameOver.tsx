import { GameState, Player } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { Castle, Sword } from 'lucide-react';

export default function GameOver({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handlePlayAgain = async () => {
    setLoading(true);
    
    try {
      // 1. Reset room status and counters, and wipe assassination result / game outcomes
      const newSettings = { ...gameState.settings };
      delete newSettings.assassinationResult;
      delete newSettings.evilWonByQuests;

      await supabase.from('rooms').update({
        status: 'lobby',
        current_quest: 1,
        quest_leader_index: 0,
        rejection_count: 0,
        settings: newSettings
      }).eq('id', roomId);
      
      // 2. Clear out old quests (this cascades to votes and quest_cards)
      await supabase.from('quests').delete().eq('room_id', roomId);
      
      // Clear lady of lake assignments
      await supabase.from('lady_of_lake').delete().eq('room_id', roomId);

      // Clear game events log
      await supabase.from('game_events').delete().eq('room_id', roomId);
      
      // 3. Clear everyone's roles and teams
      await supabase.from('players').update({
        role: null,
        team: null,
      }).eq('room_id', roomId);

      // 4. Set human players to not ready
      const humanIds = gameState.players
        .filter(p => !p.name.startsWith('Sir ') && !p.name.startsWith('Lady '))
        .map(p => p.id);
      
      if (humanIds.length > 0) {
        await supabase.from('players').update({ is_ready: false }).in('id', humanIds);
      }

      // 5. Ensure bots stay ready
      const botIds = gameState.players
        .filter(p => p.name.startsWith('Sir ') || p.name.startsWith('Lady '))
        .map(p => p.id);
        
      if (botIds.length > 0) {
        await supabase.from('players').update({ is_ready: true }).in('id', botIds);
      }

    } catch (e) {
      console.error(e);
      alert('Failed to reset game');
    }
    
    setLoading(false);
  };

  const goodPlayers = gameState.players.filter(p => p.team === 'good');
  const evilPlayers = gameState.players.filter(p => p.team === 'evil');
  const assassination = gameState.settings.assassinationResult;
  const evilWonByQuests = gameState.settings.evilWonByQuests || gameState.quests.filter(q => q.questResult === 'fail').length >= 3;

  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center">
      <div className="text-center w-full max-w-md flex flex-col items-center">
        <div className="mb-4 text-text-dim animate-float">
          {assassination ? <Sword className="w-20 h-20" strokeWidth={1.5} /> : <Castle className="w-20 h-20" strokeWidth={1.5} />}
        </div>
        <h1 className="text-3xl font-bold text-text mb-6 animate-slideDown">Game Over</h1>

        {assassination && (
          <div className={`w-full p-6 mb-8 rounded-xl border text-center shadow-sm animate-scaleIn ${assassination.isMerlin ? 'bg-danger/10 border-danger text-danger animate-pulseGlowDanger' : 'bg-success/10 border-success text-success animate-pulseGlowSuccess'}`}>
            <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest">
              {assassination.isMerlin ? 'Evil Wins!' : 'Good Wins!'}
            </h2>
            <p className="font-medium text-sm">
              The Assassin {assassination.isMerlin ? 'struck true' : 'missed'}! <br/><br/>
              <strong>{assassination.targetName}</strong> was {assassination.isMerlin ? '' : 'NOT '}Merlin.
            </p>
          </div>
        )}

        {!assassination && evilWonByQuests && (
          <div className="w-full p-6 mb-8 rounded-xl border text-center shadow-sm bg-danger/10 border-danger text-danger animate-scaleIn animate-pulseGlowDanger">
            <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest">Evil Wins!</h2>
            <p className="font-medium text-sm">3 Quests Failed.</p>
          </div>
        )}

        {!assassination && !evilWonByQuests && (
          <div className="w-full p-6 mb-8 rounded-xl border text-center shadow-sm bg-success/10 border-success text-success animate-scaleIn animate-pulseGlowSuccess">
            <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest">Good Wins!</h2>
            <p className="font-medium text-sm">3 Quests Passed (and no Assassin found).</p>
          </div>
        )}
        
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6 mb-8 text-left animate-slideUp">
          <h2 className="text-lg font-bold text-success mb-3 text-center">Good Team</h2>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {goodPlayers.length > 0 ? goodPlayers.map(p => (
              <span key={p.id} className="text-sm px-3 py-1.5 bg-gray-50 border border-border rounded-lg font-medium text-text">
                {p.name} <span className="text-text-dim ml-1 text-xs uppercase">{p.role}</span>
              </span>
            )) : <span className="text-sm text-text-dim">Unknown</span>}
          </div>

          <div className="h-px bg-border w-full mb-6" />

          <h2 className="text-lg font-bold text-danger mb-3 text-center">Evil Team</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {evilPlayers.length > 0 ? evilPlayers.map(p => (
              <span key={p.id} className="text-sm px-3 py-1.5 bg-gray-50 border border-border rounded-lg font-medium text-text">
                {p.name} <span className="text-text-dim ml-1 text-xs uppercase">{p.role}</span>
              </span>
            )) : <span className="text-sm text-text-dim">Unknown</span>}
          </div>
        </div>

        {currentPlayer.isHost ? (
          <Button onClick={handlePlayAgain} disabled={loading} className="w-full" variant="primary">
            {loading ? 'Resetting...' : 'Play Again'}
          </Button>
        ) : (
          <p className="text-text-dim text-sm italic">Waiting for host to start a new game...</p>
        )}
      </div>
    </div>
  );
}
