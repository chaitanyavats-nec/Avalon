import { GameState, Player } from '@/types/avalon';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function QuestReveal({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const currentQuest = gameState.quests.find(q => q.questNumber === gameState.currentQuest);
  
  const shuffledCards: string[] = gameState.settings.shuffledQuestCards || [];
  const revealedCount: number = gameState.settings.revealedCardsCount || 0;
  
  const isLeader = gameState.questLeaderId === currentPlayer.id;
  const leaderPlayer = gameState.players.find(p => p.id === gameState.questLeaderId);
  const isBotLeader = Boolean(leaderPlayer && (leaderPlayer.name.startsWith('Sir ') || leaderPlayer.name.startsWith('Lady ')));

  // Keep a ref to the latest settings so timeouts always read fresh data
  const settingsRef = useRef(gameState.settings);
  settingsRef.current = gameState.settings;

  const revealNextCard = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const currentRevealed = currentSettings.revealedCardsCount || 0;
    const cards = currentSettings.shuffledQuestCards || [];
    if (currentRevealed < cards.length) {
      await supabase.from('rooms').update({ 
        settings: { ...currentSettings, revealedCardsCount: currentRevealed + 1 } 
      }).eq('id', roomId);
    }
  }, [supabase, roomId]);

  const processQuestResults = useCallback(async () => {
    if (!currentQuest) return;
    const currentSettings = settingsRef.current;
    const cards: string[] = currentSettings.shuffledQuestCards || [];
    const fails = cards.filter((c: string) => c === 'fail').length;
    const requiredFails = (gameState.players.length >= 7 && currentQuest.questNumber === 4) ? 2 : 1;
    const questResult = fails >= requiredFails ? 'fail' : 'pass';

    await supabase.from('quests').update({ quest_result: questResult }).eq('id', currentQuest.id);
    
    const allQuests = gameState.quests;
    let passed = 0;
    let failed = 0;
    for (const q of allQuests) {
      if (q.id === currentQuest.id) {
        if (questResult === 'pass') passed++;
        else failed++;
      } else {
        if (q.questResult === 'pass') passed++;
        if (q.questResult === 'fail') failed++;
      }
    }
    
    // Clean up settings
    const newSettings = { 
      ...currentSettings,
      questLeaders: {
        ...(currentSettings.questLeaders || {}),
        [currentQuest.questNumber]: gameState.questLeaderId
      }
    };
    delete newSettings.shuffledQuestCards;
    delete newSettings.revealedCardsCount;

    if (passed >= 3) {
      await supabase.from('rooms').update({ status: 'assassin', settings: newSettings }).eq('id', roomId);
    } else if (failed >= 3) {
      await supabase.from('rooms').update({ status: 'ended', settings: newSettings }).eq('id', roomId);
    } else {
      const nextQuestNum = currentQuest.questNumber + 1;
      const nextLeaderIndex = (gameState.players.findIndex(p => p.id === gameState.questLeaderId) + 1) % gameState.players.length;
      const shouldDoLady = currentSettings.ladyOfLake && [2, 3, 4].includes(currentQuest.questNumber);
      
      await supabase.from('rooms').update({ 
        current_quest: nextQuestNum,
        quest_leader_index: nextLeaderIndex,
        status: shouldDoLady ? 'lady_of_lake' : 'quest',
        settings: newSettings
      }).eq('id', roomId);
    }
  }, [currentQuest, gameState.quests, gameState.players, gameState.questLeaderId, supabase, roomId]);

  // Auto-reveal for bots — uses only stable primitives as deps
  useEffect(() => {
    if (!currentPlayer.isHost || !isBotLeader || !currentQuest?.id) return;

    let timer: ReturnType<typeof setTimeout>;

    if (revealedCount < shuffledCards.length) {
      timer = setTimeout(() => {
        revealNextCard();
      }, 2500);
    } else if (shuffledCards.length > 0) {
      timer = setTimeout(() => {
        processQuestResults();
      }, 4000);
    }

    return () => clearTimeout(timer);
  }, [currentPlayer.isHost, isBotLeader, currentQuest?.id, revealedCount, shuffledCards.length, revealNextCard, processQuestResults]);

  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center">
      <div className="text-center w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-text mb-2 animate-slideDown">Quest Results</h1>
        <p className="text-sm text-text-dim mb-12 animate-fadeIn">
          The party has returned. {isLeader ? 'You must reveal their fate.' : 'Waiting for the leader to reveal their fate.'}
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-16">
          {shuffledCards.map((card, idx) => {
            const isRevealed = idx < revealedCount;
            const isSuccess = card === 'success';

            return (
              <div key={idx} className="relative w-32 aspect-[3/4]" style={{ perspective: '1000px' }}>
                <div className="w-full h-full relative transition-transform duration-700 ease-out"
                     style={{ 
                       transformStyle: 'preserve-3d', 
                       transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                     }}>
                     
                  {/* Front Face (Hidden when flipped) */}
                  <div className="absolute inset-0 w-full h-full bg-surface border-2 border-border rounded-xl shadow-md flex items-center justify-center"
                       style={{ backfaceVisibility: 'hidden' }}>
                    <div className="text-4xl opacity-20">?</div>
                  </div>

                  {/* Back Face (Visible when flipped) */}
                  <div className={`absolute inset-0 w-full h-full rounded-xl shadow-lg flex flex-col items-center justify-center p-4 text-center border-4 ${isSuccess ? 'bg-success border-success text-white' : 'bg-danger border-danger text-white'}`}
                       style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="mb-3 drop-shadow-md">
                      {isSuccess ? (
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className="font-bold text-xl uppercase tracking-widest drop-shadow-sm">
                      {isSuccess ? 'Success' : 'Fail'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLeader && revealedCount < shuffledCards.length && (
          <Button size="lg" variant="primary" onClick={revealNextCard} disabled={loading} className="animate-pulse px-12 py-6 text-lg animate-pulseGlow">
            Reveal Next Card
          </Button>
        )}

        {isLeader && revealedCount >= shuffledCards.length && shuffledCards.length > 0 && (
          <Button size="lg" variant="primary" onClick={processQuestResults} disabled={loading} className="px-12 py-6 text-lg">
            Finish Quest
          </Button>
        )}
      </div>
    </div>
  );
}
