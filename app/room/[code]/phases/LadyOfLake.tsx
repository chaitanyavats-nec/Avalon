import { GameState, Player } from '@/types/avalon';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { isBot } from '@/lib/game/roles';
import { sfx } from '@/lib/sound';
import { usePlaySoundOnTrue } from '@/hooks/usePlaySoundOnChange';
import { Droplets, Shield, Ghost, Check } from 'lucide-react';

export default function LadyOfLake({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasRevealed, setHasRevealed] = useState(false);

  const supabase = createClient();

  const history = gameState.ladyOfLakeHistory || [];
  const activeRow = history.find(r => r.quest_number === gameState.currentQuest);

  // Find the holder entering this phase (from the previous row)
  const previousRows = history.filter(r => r.quest_number < gameState.currentQuest);
  const enteringHolderId = previousRows.length > 0 ? previousRows[0].investigated_player_id : null;

  // Everyone who has ever held the token (including the initial holder) — the rule is a
  // player who has already used the Lady of the Lake can never be examined with it again.
  const previousHoldersIds = history.map(r => r.investigated_player_id);

  const isHolderEntering = currentPlayer.id === enteringHolderId;

  const eligibleTargets = gameState.players.filter(p => !previousHoldersIds.includes(p.id) && p.id !== enteringHolderId);

  usePlaySoundOnTrue(isHolderEntering && !activeRow, sfx.notify);

  const finishPhase = async () => {
    setLoading(true);
    // This phase only ever runs when Lady of the Lake is enabled, so the leader
    // always picks the next quest explicitly rather than auto-advancing.
    await supabase.from('rooms').update({ status: 'quest', current_quest: 0 }).eq('id', roomId);
    setLoading(false);
  };

  const investigateTarget = async (targetId: string) => {
    setLoading(true);
    const actualTeam = gameState.players.find(p => p.id === targetId)?.team;
    await supabase.from('lady_of_lake').insert({
      room_id: roomId,
      holder_player_id: currentPlayer.id,
      investigated_player_id: targetId,
      quest_number: gameState.currentQuest,
      actual_team: actualTeam
    });
    setLoading(false);
  };

  // Auto-play for a bot holder: picks a random eligible target, then continues
  // on to the next quest after a moment so the reveal is visible to a watching host.
  useEffect(() => {
    if (!currentPlayer.isHost || !enteringHolderId) return;
    const holder = gameState.players.find(p => p.id === enteringHolderId);
    if (!holder || !isBot(holder.name)) return;

    if (!activeRow && eligibleTargets.length > 0) {
      const storageKey = `bot_lady_pick_${roomId}_${gameState.currentQuest}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, 'true');
      const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
      setTimeout(() => investigateTarget(target.id), 1500);
    } else if (activeRow) {
      const storageKey = `bot_lady_continue_${roomId}_${activeRow.id}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, 'true');
      setTimeout(() => finishPhase(), 3000);
    }
  }, [currentPlayer.isHost, enteringHolderId, activeRow, eligibleTargets, gameState.players, gameState.currentQuest, roomId]);

  if (!enteringHolderId) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center animate-fadeIn">
        <Droplets className="w-12 h-12 mb-4 text-info opacity-50" />
        <h2 className="text-2xl font-bold text-text mb-2">Lady of the Lake</h2>
        <p className="text-text-dim text-center mb-6">The Lady of the Lake is not active for this game.</p>
        {currentPlayer.isHost ? (
          <Button onClick={finishPhase} variant="primary">Continue to Next Quest</Button>
        ) : (
          <p className="text-sm text-text-dim mt-4">Waiting for host to continue...</p>
        )}
      </div>
    );
  }

  const enteringHolder = gameState.players.find(p => p.id === enteringHolderId);

  if (!activeRow && eligibleTargets.length === 0) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center animate-fadeIn">
        <Droplets className="w-12 h-12 mb-4 text-info opacity-50" />
        <h2 className="text-2xl font-bold text-text mb-2">Lady of the Lake</h2>
        <p className="text-text-dim text-center mb-6">No eligible players remain to be examined.</p>
        {currentPlayer.isHost && <Button onClick={finishPhase} variant="primary">Continue to Next Quest</Button>}
      </div>
    );
  }

  // STEP 1: Holder chooses who to examine
  if (!activeRow) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center py-12">
        <Droplets className="w-12 h-12 mb-4 text-info" />
        <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2 text-center">Lady of the Lake</h2>

        {isHolderEntering ? (
          <div className="w-full max-w-md animate-slideUp">
            <p className="text-text-dim text-center mb-6 text-sm">
              You hold the Lady of the Lake. Choose a player to examine their loyalty.
            </p>
            <div className="space-y-2 mb-6">
              {gameState.players.map(p => {
                const isSelf = p.id === currentPlayer.id;
                const isPrevious = previousHoldersIds.includes(p.id);
                const isEligible = !isSelf && !isPrevious;

                return (
                  <button
                    key={p.id}
                    onClick={() => isEligible && setSelectedTarget(p.id)}
                    disabled={!isEligible || loading}
                    className={`w-full text-left p-4 rounded-xl border flex justify-between items-center transition-all ${
                      selectedTarget === p.id
                        ? 'border-info bg-info/10 shadow-sm'
                        : isEligible
                          ? 'border-border bg-surface hover:bg-gray-50'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-semibold text-text">{p.name}</span>
                    {isPrevious && <span className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Already Used the Lady</span>}
                    {selectedTarget === p.id && <Check className="w-5 h-5 text-info" />}
                  </button>
                );
              })}
            </div>
            <Button
              variant="primary"
              className="w-full"
              disabled={!selectedTarget || loading}
              onClick={() => selectedTarget && investigateTarget(selectedTarget)}
            >
              Examine Loyalty
            </Button>
          </div>
        ) : (
          <div className="text-center animate-fadeIn mt-12">
            <p className="text-lg text-text">
              <span className="font-bold text-info">{enteringHolder?.name}</span> holds the Lady of the Lake.
            </p>
            <p className="text-text-dim mt-2">Waiting for them to choose who to examine...</p>
          </div>
        )}
      </div>
    );
  }

  const investigatedPlayer = gameState.players.find(p => p.id === activeRow.investigated_player_id);
  const isInvestigatedPlayer = currentPlayer.id === activeRow.investigated_player_id;
  const isGoodLoyalty = activeRow.actual_team === 'good';

  // STEP 2: The Loyalty Card is passed — only the holder ever sees it
  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center py-12">
      <Droplets className="w-12 h-12 mb-4 text-info" />
      <h2 className="text-2xl font-bold text-text mb-2 text-center">Lady of the Lake</h2>
      <p className="text-text-dim text-sm text-center mb-6 max-w-sm">
        {investigatedPlayer?.name} privately passes their Loyalty card to {enteringHolder?.name}.
      </p>

      {isHolderEntering ? (
        <div className="w-full max-w-xs animate-scaleIn">
          {!hasRevealed ? (
            <button
              onClick={() => setHasRevealed(true)}
              className="w-full aspect-[3/4] rounded-2xl border border-border bg-surface shadow-lg flex flex-col items-center justify-center gap-3 select-none"
              style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            >
              <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center">
                <span className="font-heading text-3xl text-text-dim">?</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">Tap to Reveal</span>
            </button>
          ) : (
            <div className={`w-full aspect-[3/4] rounded-2xl border shadow-xl flex flex-col items-center justify-center gap-3 text-white animate-scaleIn ${
              isGoodLoyalty ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'
            }`}>
              {isGoodLoyalty ? <Shield className="w-16 h-16" strokeWidth={1.5} /> : <Ghost className="w-16 h-16" strokeWidth={1.5} />}
              <span className="text-2xl font-bold uppercase tracking-widest">{isGoodLoyalty ? 'Good' : 'Evil'}</span>
              <span className="text-xs opacity-80 px-6 text-center">{investigatedPlayer?.name}'s true loyalty. Keep it secret — you may discuss, but never reveal this card.</span>
            </div>
          )}

          {hasRevealed && (
            <Button variant="primary" className="w-full mt-6" disabled={loading} onClick={finishPhase}>
              Pass the Token & Continue
            </Button>
          )}
        </div>
      ) : isInvestigatedPlayer ? (
        <div className="text-center animate-fadeIn mt-4">
          <p className="text-lg text-text">You privately shared your Loyalty card with {enteringHolder?.name}.</p>
          <p className="text-text-dim mt-2 text-sm">The token will pass to you once they're done.</p>
        </div>
      ) : (
        <div className="text-center animate-fadeIn mt-4">
          <p className="text-lg text-text">
            <span className="font-bold">{enteringHolder?.name}</span> is examining <span className="font-bold">{investigatedPlayer?.name}</span>'s loyalty.
          </p>
          <p className="text-text-dim mt-2 text-sm">Waiting for them to continue...</p>
        </div>
      )}
    </div>
  );
}
