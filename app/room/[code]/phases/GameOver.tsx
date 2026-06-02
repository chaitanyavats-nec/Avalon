import { GameState, Player } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { Castle, Sword } from 'lucide-react';

export default function GameOver({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const [selectedQuestNum, setSelectedQuestNum] = useState<number | null>(null);
  const [hoveredQuestNum, setHoveredQuestNum] = useState<number | null>(null);
  const [pastQuestCards, setPastQuestCards] = useState<Record<string, string[]>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;
    const fetchPastCards = async () => {
      const { data: quests } = await supabase
        .from('quests')
        .select('id')
        .eq('room_id', roomId);
      
      if (!quests || quests.length === 0) return;
      
      const questIds = quests.map(q => q.id);
      const { data: cards } = await supabase
        .from('quest_cards')
        .select('quest_id, card');
        
      if (!cards) return;
      
      const cardsMap: Record<string, string[]> = {};
      for (const q of quests) {
        cardsMap[q.id] = cards.filter(c => c.quest_id === q.id).map(c => c.card);
      }
      setPastQuestCards(cardsMap);
    };
    
    fetchPastCards();
  }, [roomId, supabase]);

  const handleMouseEnter = (questNum: number) => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setHoveredQuestNum(questNum);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setHoveredQuestNum(null);
    }
  };

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

        {/* Interactive Quest Track for Game Over Review */}
        <div className="relative w-[232px] mx-auto flex gap-2 mb-8 justify-center animate-slideDown" style={{ animationDelay: '100ms' }}>
          {gameState.quests.map(q => {
            const isSelected = selectedQuestNum === q.questNumber;
            return (
              <button key={q.id} 
                   onMouseEnter={() => handleMouseEnter(q.questNumber)}
                   onMouseLeave={handleMouseLeave}
                   onClick={() => setSelectedQuestNum(selectedQuestNum === q.questNumber ? null : q.questNumber)}
                   className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                   style={{
                     backgroundColor: q.questResult === 'pass' 
                       ? 'var(--color-success)' 
                       : q.questResult === 'fail' 
                         ? 'var(--color-danger)'
                         : 'var(--color-surface)',
                     color: q.questResult ? 'var(--color-surface)' : 'var(--color-text-dim)',
                     border: `1px solid ${q.questResult ? 'transparent' : 'var(--color-border)'}`
                   }}>
                {q.requiredPlayers}
              </button>
            );
          })}
          
          {/* Bounded Absolute Popup Details Card */}
          {(() => {
            const activeQuestNum = hoveredQuestNum || selectedQuestNum;
            if (activeQuestNum === null) return null;
            
            const q = gameState.quests.find(x => x.questNumber === activeQuestNum);
            if (!q) return null;

            const leaderId = gameState.settings?.questLeaders?.[q.questNumber];
            const leader = gameState.players.find(p => p.id === leaderId);
            const teamPlayers = q.proposedTeam?.map(pid => gameState.players.find(p => p.id === pid)).filter(Boolean) || [];
            
            const idx = q.questNumber - 1;
            const arrowLeft = idx * 48 + 44; // Mathematically centered

            return (
              <div 
                className="absolute top-full z-50 w-[280px] mt-3 pointer-events-none sm:pointer-events-auto"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
              >
                <div className="relative bg-surface border border-border rounded-xl shadow-xl p-4 text-left animate-slideDown">
                  {/* Dynamic Bounded Triangle Arrow */}
                  <div 
                    className="absolute -top-1.5 w-3 h-3 bg-surface border-t border-l border-border" 
                    style={{ left: `${arrowLeft}px`, transform: 'translateX(-50%) rotate(45deg)' }}
                  />

                  <div className="flex justify-between items-center mb-3 pb-1 border-b border-border">
                    <h3 className="font-bold text-xs text-text">Quest {q.questNumber}</h3>
                    <div className="flex gap-1 items-center">
                      {(() => {
                        const cards = pastQuestCards[q.id] || [];
                        if (q.questResult) {
                          return cards.map((card, cardIdx) => {
                            const isSuccess = card === 'success';
                            return (
                              <div 
                                key={cardIdx} 
                                className={`w-6 h-4 rounded-md shadow-sm border flex items-center justify-center text-[8px] font-bold text-white transition-all duration-300 ${
                                  isSuccess 
                                    ? 'bg-success border-success/40' 
                                    : 'bg-danger border-danger/40'
                                }`}
                                title={isSuccess ? 'Success Card' : 'Fail Card'}
                              >
                                {isSuccess ? '✓' : '✗'}
                              </div>
                            );
                          });
                        }
                        return Array.from({ length: q.requiredPlayers }).map((_, cardIdx) => (
                          <div 
                            key={cardIdx} 
                            className="w-6 h-4 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-text-dim"
                          >
                            -
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-text-dim text-[10px]">Leader:</span>
                      <span className="font-semibold text-text">{leader ? leader.name : 'Unknown'}</span>
                    </div>
                    
                    <div>
                      <span className="text-text-dim text-[10px] block mb-1">Party ({q.requiredPlayers}):</span>
                      {teamPlayers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teamPlayers.map(p => (
                            <span key={p!.id} className="px-2 py-0.5 bg-gray-50 border border-border text-text rounded-full text-[10px] font-semibold">
                              {p!.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-dim italic">No team proposed.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

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
