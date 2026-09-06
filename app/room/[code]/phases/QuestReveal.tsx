import { GameState, Player } from '@/types/avalon';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { isBot } from '@/lib/game/roles';

export default function QuestReveal({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [optimisticRevealed, setOptimisticRevealed] = useState(0);

  const currentQuest = gameState.quests.find(q => q.questNumber === gameState.currentQuest);

  const shuffledCards: string[] = gameState.settings.shuffledQuestCards || [];
  const serverRevealedCount: number = gameState.settings.revealedCardsCount || 0;
  // Show the optimistic count immediately on click, without waiting for the round trip
  // to the DB and back through realtime; reset once the server catches up or a new quest starts.
  const revealedCount = Math.max(serverRevealedCount, Math.min(optimisticRevealed, shuffledCards.length));

  useEffect(() => {
    setOptimisticRevealed(0);
  }, [currentQuest?.id]);


  const isLeader = gameState.questLeaderId === currentPlayer.id;
  const leaderPlayer = gameState.players.find(p => p.id === gameState.questLeaderId);
  const isBotLeader = isBot(leaderPlayer?.name);

  // Keep a ref to the latest settings so timeouts always read fresh data
  const settingsRef = useRef(gameState.settings);
  settingsRef.current = gameState.settings;

  const revealNextCard = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const currentRevealed = currentSettings.revealedCardsCount || 0;
    const cards = currentSettings.shuffledQuestCards || [];
    if (currentRevealed < cards.length) {
      setOptimisticRevealed(currentRevealed + 1);
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
      const endedSettings = {
        ...newSettings,
        evilWonByQuests: true
      };
      await supabase.from('rooms').update({ status: 'ended', settings: endedSettings }).eq('id', roomId);
    } else {
      const nextQuestNum = currentQuest.questNumber + 1;
      const nextLeaderIndex = (gameState.players.findIndex(p => p.id === gameState.questLeaderId) + 1) % gameState.players.length;
      const shouldDoLady = currentSettings.ladyOfLake && [2, 3, 4].includes(currentQuest.questNumber);

      // When heading into Lady of the Lake, keep current_quest at the quest that just
      // finished — LadyOfLake.tsx needs it to find rows with quest_number below it to
      // identify the current token holder. It resets current_quest to 0 itself once the
      // investigation is done, so the leader is prompted to pick the next quest.
      await supabase.from('rooms').update({
        current_quest: shouldDoLady ? currentQuest.questNumber : (currentSettings.ladyOfLake ? 0 : nextQuestNum),
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

  const currentBg = currentQuest && gameState.settings.questBackgrounds ? gameState.settings.questBackgrounds[currentQuest.questNumber - 1] : null;
  const hasFailRevealed = shuffledCards.slice(0, revealedCount).includes('fail');

  const partyNames = (currentQuest?.proposedTeam || [])
    .map(pid => gameState.players.find(p => p.id === pid)?.name)
    .filter((name): name is string => Boolean(name));
  const partyNamesText = partyNames.length === 0
    ? ''
    : partyNames.length === 1
      ? partyNames[0]
      : `${partyNames.slice(0, -1).join(', ')} and ${partyNames[partyNames.length - 1]}`;

  return (
    <div 
      className="min-h-screen flex flex-col items-center p-6 text-white overflow-y-auto relative"
      style={{
        backgroundColor: '#000',
        backgroundImage: currentBg ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.9)), url('/backgrounds/${currentBg}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Red Dramatic Overlay */}
      <div 
        className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 ease-in-out z-0 mix-blend-color ${hasFailRevealed ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(rgba(220, 38, 38, 0.8), rgba(153, 27, 27, 0.4))' }}
      />

      <div className="w-full max-w-sm md:max-w-md flex flex-col items-center mt-8 animate-fadeIn relative z-10" style={{ animationDuration: '1s' }}>
        <h1 className="text-3xl font-heading text-center mb-2 text-white">Quest Results</h1>
        <p className="text-sm text-center mb-12 text-zinc-400 italic">
          {partyNamesText && <>{partyNamesText} went on this quest. </>}
          {isLeader ? 'You must reveal their fate.' : 'Waiting for the leader to reveal their fate.'}
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
                  <div className="absolute inset-0 w-full h-full bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center"
                       style={{ backfaceVisibility: 'hidden' }}>
                    <div className="text-4xl text-zinc-500 font-bold opacity-30">?</div>
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
          <div className="mt-4 w-full">
            <Button size="lg" variant="primary" onClick={revealNextCard} disabled={loading} className="py-6 text-lg w-full rounded-xl">
              Reveal Next Card
            </Button>
          </div>
        )}

        {isLeader && revealedCount >= shuffledCards.length && shuffledCards.length > 0 && (
          <div className="mt-4 w-full">
            <Button size="lg" variant="primary" onClick={processQuestResults} disabled={loading} className="py-6 text-lg w-full bg-success hover:bg-green-600 text-white rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
              Finish Quest
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
