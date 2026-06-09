import { GameState, Player } from '@/types/avalon';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Droplets, Shield, Ghost, Eye, Check } from 'lucide-react';

export default function LadyOfLake({ gameState, currentPlayer, roomId }: { gameState: GameState; currentPlayer: Player; roomId: string }) {
  const [loading, setLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasAcknowledgedTruth, setHasAcknowledgedTruth] = useState(false);
  
  const supabase = createClient();

  const history = gameState.ladyOfLakeHistory || [];
  const activeRow = history.find(r => r.quest_number === gameState.currentQuest);
  
  // Find the holder entering this phase (from the previous row)
  const previousRows = history.filter(r => r.quest_number < gameState.currentQuest);
  const enteringHolderId = previousRows.length > 0 ? previousRows[0].investigated_player_id : null;
  
  // The list of all players who have received the token (including initial holder)
  const previousHoldersIds = history.map(r => r.investigated_player_id);
  
  const isHolderEntering = currentPlayer.id === enteringHolderId;
  
  // Check if we need to auto-skip because there are no eligible targets
  const eligibleTargets = gameState.players.filter(p => !previousHoldersIds.includes(p.id) && p.id !== enteringHolderId);
  
  const finishPhase = async () => {
    setLoading(true);
    await supabase.from('rooms').update({ status: 'quest' }).eq('id', roomId);
    setLoading(false);
  };

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

  // Auto skip logic if no eligible targets
  if (!activeRow && eligibleTargets.length === 0) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center animate-fadeIn">
        <Droplets className="w-12 h-12 mb-4 text-info opacity-50" />
        <h2 className="text-2xl font-bold text-text mb-2">Lady of the Lake</h2>
        <p className="text-text-dim text-center mb-6">No eligible players remain to be investigated.</p>
        {currentPlayer.isHost && <Button onClick={finishPhase} variant="primary">Continue to Next Quest</Button>}
      </div>
    );
  }

  // STEP 1: Select Target
  if (!activeRow) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center py-12">
        <Droplets className="w-12 h-12 mb-4 text-info" />
        <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2 text-center">Lady of the Lake</h2>
        
        {isHolderEntering ? (
          <div className="w-full max-w-md animate-slideUp">
            <p className="text-text-dim text-center mb-6 text-sm">
              You possess the Lady of the Lake token. Choose a player to investigate.
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
                    {!isEligible && <span className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Ineligible</span>}
                    {selectedTarget === p.id && <Check className="w-5 h-5 text-info" />}
                  </button>
                );
              })}
            </div>
            <Button
              variant="primary"
              className="w-full"
              disabled={!selectedTarget || loading}
              onClick={async () => {
                setLoading(true);
                const actualTeam = gameState.players.find(p => p.id === selectedTarget)?.team;
                await supabase.from('lady_of_lake').insert({
                  room_id: roomId,
                  holder_player_id: currentPlayer.id,
                  investigated_player_id: selectedTarget,
                  quest_number: gameState.currentQuest,
                  actual_team: actualTeam
                });
                setLoading(false);
              }}
            >
              Investigate Target
            </Button>
          </div>
        ) : (
          <div className="text-center animate-fadeIn mt-12">
            <p className="text-lg text-text">
              <span className="font-bold text-info">{enteringHolder?.name}</span> is using the Lady of the Lake.
            </p>
            <p className="text-text-dim mt-2">Waiting for them to choose a target...</p>
          </div>
        )}
      </div>
    );
  }

  const investigatedPlayer = gameState.players.find(p => p.id === activeRow.investigated_player_id);
  const isInvestigatedPlayer = currentPlayer.id === activeRow.investigated_player_id;

  // STEP 2: Investigated Player Declares
  if (!activeRow.investigated_player_declaration) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center py-12">
        <Droplets className="w-12 h-12 mb-4 text-info animate-breathe" />
        <h2 className="text-2xl font-bold text-text mb-6">Investigation</h2>
        
        {isInvestigatedPlayer ? (
          <div className="w-full max-w-md bg-surface border border-border p-6 rounded-2xl shadow-lg animate-scaleIn text-center">
            <h3 className="text-xl font-bold mb-2">You are being investigated!</h3>
            <p className="text-sm text-text-dim mb-6">Declare your allegiance to the room.</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                disabled={loading}
                className="h-24 flex flex-col items-center justify-center gap-2 border-success/30 hover:bg-success/5 hover:border-success text-success"
                onClick={async () => {
                  setLoading(true);
                  await supabase.from('lady_of_lake').update({ investigated_player_declaration: 'arthur' }).eq('id', activeRow.id);
                  setLoading(false);
                }}
              >
                <Shield className="w-6 h-6" />
                <span className="font-bold">Arthur</span>
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                className="h-24 flex flex-col items-center justify-center gap-2 border-danger/30 hover:bg-danger/5 hover:border-danger text-danger"
                onClick={async () => {
                  setLoading(true);
                  await supabase.from('lady_of_lake').update({ investigated_player_declaration: 'mordred' }).eq('id', activeRow.id);
                  setLoading(false);
                }}
              >
                <Ghost className="w-6 h-6" />
                <span className="font-bold">Mordred</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fadeIn">
            <p className="text-lg text-text">
              <span className="font-bold">{investigatedPlayer?.name}</span> is being investigated.
            </p>
            <p className="text-text-dim mt-2">Waiting for their declaration of loyalty...</p>
          </div>
        )}
      </div>
    );
  }

  // STEP 3 & 4: Holder sees truth and declares
  if (!activeRow.holder_declaration) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center py-12">
        <Droplets className="w-12 h-12 mb-4 text-info" />
        <h2 className="text-2xl font-bold text-text mb-6">The Truth</h2>
        
        {isHolderEntering ? (
          <div className="w-full max-w-md bg-surface border border-border p-6 rounded-2xl shadow-lg animate-scaleIn">
            {!hasAcknowledgedTruth ? (
              <div className="text-center space-y-6">
                <Eye className="w-10 h-10 mx-auto text-text-dim" />
                <div>
                  <p className="text-text-dim text-sm mb-1">{investigatedPlayer?.name} declared they are loyal to:</p>
                  <p className={`font-bold text-2xl uppercase tracking-widest ${activeRow.investigated_player_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>
                    {activeRow.investigated_player_declaration}
                  </p>
                </div>
                <div className="h-px bg-border w-1/2 mx-auto" />
                <div>
                  <p className="text-text-dim text-sm mb-1">Their actual alignment is:</p>
                  <p className={`font-bold text-3xl uppercase tracking-widest ${activeRow.actual_team === 'good' ? 'text-success' : 'text-danger'}`}>
                    {activeRow.actual_team === 'good' ? 'GOOD' : 'EVIL'}
                  </p>
                </div>
                <Button variant="primary" className="w-full mt-4" onClick={() => setHasAcknowledgedTruth(true)}>
                  Acknowledge Truth
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-6 animate-fadeIn">
                <p className="text-text-dim text-sm">Now, declare their loyalty to the room.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="h-24 flex flex-col items-center justify-center gap-2 border-success/30 hover:bg-success/5 hover:border-success text-success"
                    onClick={async () => {
                      setLoading(true);
                      await supabase.from('lady_of_lake').update({ holder_declaration: 'arthur' }).eq('id', activeRow.id);
                      setLoading(false);
                    }}
                  >
                    <Shield className="w-6 h-6" />
                    <span className="font-bold">Good / Arthur</span>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="h-24 flex flex-col items-center justify-center gap-2 border-danger/30 hover:bg-danger/5 hover:border-danger text-danger"
                    onClick={async () => {
                      setLoading(true);
                      await supabase.from('lady_of_lake').update({ holder_declaration: 'mordred' }).eq('id', activeRow.id);
                      setLoading(false);
                    }}
                  >
                    <Ghost className="w-6 h-6" />
                    <span className="font-bold">Evil / Mordred</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center animate-fadeIn space-y-4">
            <p className="text-text-dim text-sm uppercase tracking-widest font-bold">Public Declaration</p>
            <p className="text-xl text-text">
              <span className="font-bold">{investigatedPlayer?.name}</span> claimed loyalty to <span className={`font-bold uppercase ${activeRow.investigated_player_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>{activeRow.investigated_player_declaration}</span>.
            </p>
            <div className="mt-8">
              <p className="text-text-dim">Waiting for <span className="font-bold">{enteringHolder?.name}</span> to reveal their finding...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEP 5: Complete
  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-lg text-center animate-scaleIn">
        <Droplets className="w-16 h-16 mx-auto mb-6 text-info" />
        <h2 className="text-3xl font-bold text-text mb-8">Investigation Complete</h2>
        
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-8 text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-text-dim">Investigated Player:</span>
            <span className="font-bold text-lg">{investigatedPlayer?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-dim">They claimed loyalty to:</span>
            <span className={`font-bold uppercase tracking-wider ${activeRow.investigated_player_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>
              {activeRow.investigated_player_declaration}
            </span>
          </div>
          <div className="h-px bg-border w-full my-2" />
          <div className="flex justify-between items-center">
            <span className="text-text-dim">Token Holder:</span>
            <span className="font-bold text-lg">{enteringHolder?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-dim">They declared the target is:</span>
            <span className={`font-bold uppercase tracking-wider ${activeRow.holder_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>
              {activeRow.holder_declaration}
            </span>
          </div>
        </div>

        <p className="text-text-dim italic mb-8">
          The token has passed to <span className="font-bold">{investigatedPlayer?.name}</span>.
        </p>

        {currentPlayer.isHost ? (
          <Button variant="primary" size="lg" className="w-full" disabled={loading} onClick={finishPhase}>
            Continue Game
          </Button>
        ) : (
          <p className="text-text-dim text-sm">Waiting for host to continue...</p>
        )}
      </div>
    </div>
  );
}
