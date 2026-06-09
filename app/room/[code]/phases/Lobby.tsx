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

  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(gameState.settings.roles || []);
  const [ladyOfLake, setLadyOfLake] = useState(gameState.settings.ladyOfLake || false);

  const openRolesModal = () => {
    const currentRoles = gameState.settings.roles || [];
    if (currentRoles.length === 0) {
      setSelectedRoles(['Assassin']);
    } else {
      setSelectedRoles(currentRoles);
    }
    setLadyOfLake(gameState.settings.ladyOfLake || false);
    setShowRolesModal(true);
  };

  const beginGame = async () => {
    setLoading(true);
    try {
      const backgrounds = ['castle.png', 'forest.png', 'hills.png', 'sea.png', 'village.png'];
      const questBackgrounds = [...backgrounds].sort(() => Math.random() - 0.5);

      const newSettings = {
        ...gameState.settings,
        roles: selectedRoles,
        ladyOfLake,
        playerCount: gameState.players.length,
        questBackgrounds
      };

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ settings: newSettings })
        .eq('id', roomId);

      if (updateError) throw updateError;

      const { error: invokeError } = await supabase.functions.invoke('assign-roles', {
        body: { room_id: roomId }
      });

      if (invokeError) throw invokeError;

      setShowRolesModal(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to start game: ' + (err.message || JSON.stringify(err)));
    }
    setLoading(false);
  };

  const addBots = async () => {
    if (gameState.players.length >= 10) return;
    setLoading(true);
    const botNames = ['Sir Lancelot', 'Sir Gawain', 'Lady Guinevere', 'Sir Tristan', 'Sir Galahad', 'Sir Percival', 'Sir Bors', 'Sir Bedivere', 'Lady Elaine'];
    const i = gameState.players.length;
    await supabase.from('players').insert({
      room_id: roomId,
      session_id: crypto.randomUUID(),
      name: botNames[i % botNames.length] + ' (Bot)',
      is_host: false,
      is_ready: true,
    });
    setLoading(false);
  };

  const allReady = gameState.players.length > 0 && gameState.players.every(p => p.isReady);
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
            {currentCount} / 10 Max
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
                {p.isHost && <span title="Host"><Crown className="w-4 h-4 text-info" /></span>}
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
          {Array.from({ length: Math.max(0, 5 - currentCount) }).map((_, i) => (
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
            variant={currentPlayer.isReady ? "ghost" : "primary"}
            className={`w-full ${currentPlayer.isReady ? 'text-text-dim hover:text-text' : 'bg-text text-surface'}`}
          >
            {currentPlayer.isReady ? 'Stand Down' : 'I Am Ready'}
          </Button>

          {currentPlayer.isHost && (
            <>
              <div className="h-px bg-border my-4" />

              <div className="space-y-3">
                {currentCount < 10 && (
                  <Button
                    onClick={addBots}
                    disabled={loading}
                    variant="ghost"
                    className="w-full text-xs"
                  >
                    Add Bot (Test Mode)
                  </Button>
                )}
                <Button
                  onClick={openRolesModal}
                  disabled={loading || !allReady || currentCount < 5 || currentCount > 10}
                  variant="primary"
                  className="w-full"
                >
                  {!allReady ? 'Waiting for players to ready...' :
                    currentCount < 5 ? `Need ${5 - currentCount} more player${5 - currentCount === 1 ? '' : 's'}` :
                    currentCount > 10 ? 'Maximum 10 players' :
                      'Start Game'}
                </Button>
              </div>
            </>
          )}

          {/* Game Settings Preview (Visible to all) */}
          <div className="mt-4 border-t border-border pt-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-2.5">Enabled Settings</h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-green-50 border border-success/20 text-success rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Merlin
              </span>
              {(!gameState.settings.roles || gameState.settings.roles.length === 0 || gameState.settings.roles.includes('Assassin')) && (
                <span className="px-2.5 py-1 bg-red-50 border border-danger/20 text-danger rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> Assassin
                </span>
              )}
              {gameState.settings.roles?.map(role => {
                const isGood = role === 'Percival';
                return (
                  <span
                    key={role}
                    className={`px-2.5 py-1 border rounded-md text-[11px] font-semibold shadow-sm flex items-center gap-1 ${isGood
                        ? 'bg-green-50 border-success/20 text-success'
                        : 'bg-red-50 border-danger/20 text-danger'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-success' : 'bg-danger'}`} /> {role}
                  </span>
                );
              })}
              {gameState.settings.ladyOfLake && (
                <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-info rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" /> Lady of the Lake
                </span>
              )}
              {(!gameState.settings.roles || gameState.settings.roles.length === 0) && !gameState.settings.ladyOfLake && (
                <span className="text-xs text-text-dim italic">No optional roles enabled.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Roles Selection Modal for Host */}
      {(() => {
        if (!showRolesModal) return null;

        const evilCounts: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
        const goodCounts: Record<number, number> = { 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6 };

        const goodTeamSize = goodCounts[currentCount] || 3;
        const evilTeamSize = evilCounts[currentCount] || 2;

        const hasPercival = selectedRoles.includes('Percival');
        const hasAssassin = selectedRoles.includes('Assassin');
        const hasMorgana = selectedRoles.includes('Morgana');
        const hasMordred = selectedRoles.includes('Mordred');
        const hasOberon = selectedRoles.includes('Oberon');

        const totalEvilSelected = (hasAssassin ? 1 : 0) + (hasMorgana ? 1 : 0) + (hasMordred ? 1 : 0) + (hasOberon ? 1 : 0);
        const isEvilRolesSelectionValid = totalEvilSelected <= evilTeamSize && (hasAssassin || hasMordred);

        const toggleRole = (role: string) => {
          if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
          } else {
            setSelectedRoles([...selectedRoles, role]);
          }
        };

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn">

              {/* Modal Header */}
              <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <div className="text-left">
                  <h2 className="text-xl font-bold text-text">Select Roles & Rules</h2>
                  <p className="text-xs text-text-dim mt-0.5">Configure your game of Avalon ({currentCount} Players)</p>
                </div>
                <button
                  onClick={() => setShowRolesModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-text-dim hover:text-text transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-left">

                {/* Good Team Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-success mb-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" /> Good Team ({goodTeamSize} Players)
                  </h3>
                  <div className="space-y-2.5">
                    {/* Merlin (Core) */}
                    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-success/20 bg-success/5 opacity-85 select-none">
                      <input type="checkbox" checked disabled className="mt-1 accent-success cursor-default" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-text">Merlin</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-success/20 text-success tracking-wider font-mono">Required</span>
                        </div>
                        <p className="text-xs text-text-dim mt-0.5">Knows who is Evil (except Mordred). Must remain hidden from the Assassin.</p>
                      </div>
                    </div>

                    {/* Percival (Optional) */}
                    <div
                      onClick={() => toggleRole('Percival')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${hasPercival
                          ? 'border-success bg-success/10'
                          : 'border-border bg-surface hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasPercival}
                        onChange={() => { }}
                        className="mt-1 accent-success pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-sm text-text">Percival</span>
                        <p className="text-xs text-text-dim mt-0.5">Knows who Merlin and Morgana are. Protects Merlin by acting as a decoy.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evil Team Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-danger mb-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-danger" /> Evil Team ({evilTeamSize} Players)
                  </h3>
                  <div className="space-y-2.5">
                    {/* Assassin */}
                    <div
                      onClick={() => toggleRole('Assassin')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${hasAssassin
                          ? 'border-danger bg-danger/10'
                          : 'border-border bg-surface hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasAssassin}
                        onChange={() => { }}
                        className="mt-1 accent-danger pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-sm text-text">Assassin</span>
                        <p className="text-xs text-text-dim mt-0.5">Has a final chance to steal victory at the end of the game by guessing Merlin.</p>
                      </div>
                    </div>

                    {/* Morgana */}
                    <div
                      onClick={() => toggleRole('Morgana')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${hasMorgana
                          ? 'border-danger bg-danger/10'
                          : 'border-border bg-surface hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasMorgana}
                        onChange={() => { }}
                        className="mt-1 accent-danger pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-sm text-text">Morgana</span>
                        <p className="text-xs text-text-dim mt-0.5">Appears as Merlin to Percival, confusing the forces of Good.</p>
                      </div>
                    </div>

                    {/* Mordred */}
                    <div
                      onClick={() => toggleRole('Mordred')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${hasMordred
                          ? 'border-danger bg-danger/10'
                          : 'border-border bg-surface hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasMordred}
                        onChange={() => { }}
                        className="mt-1 accent-danger pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-sm text-text">Mordred</span>
                        <p className="text-xs text-text-dim mt-0.5">Hidden from Merlin. Merlin remains blind to Mordred's identity.</p>
                      </div>
                    </div>

                    {/* Oberon */}
                    <div
                      onClick={() => toggleRole('Oberon')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${hasOberon
                          ? 'border-danger bg-danger/10'
                          : 'border-border bg-surface hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasOberon}
                        onChange={() => { }}
                        className="mt-1 accent-danger pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-sm text-text">Oberon</span>
                        <p className="text-xs text-text-dim mt-0.5">Isolated from Evil. Does not know the other Evil players, nor do they know him.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Rules Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-info mb-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-info" /> Special Rules
                  </h3>
                  <div
                    onClick={() => setLadyOfLake(!ladyOfLake)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${ladyOfLake
                        ? 'border-info bg-info/10'
                        : 'border-border bg-surface hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={ladyOfLake}
                      onChange={() => { }}
                      className="mt-1 accent-info pointer-events-none"
                    />
                    <div>
                      <span className="font-bold text-sm text-text">Lady of the Lake</span>
                      <p className="text-xs text-text-dim mt-0.5">Allows players to investigate another player's alignment after quests 2, 3, and 4.</p>
                    </div>
                  </div>
                </div>

                {/* Validation & Live Composition Panel */}
                <div className="bg-gray-50 border border-border rounded-xl p-4 space-y-3 text-left">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider">Game Composition Summary</h4>

                  {/* Visual Ratio Indicator */}
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-200">
                    <div
                      className="bg-success transition-all duration-300"
                      style={{ width: `${(goodTeamSize / currentCount) * 100}%` }}
                    />
                    <div
                      className="bg-danger transition-all duration-300"
                      style={{ width: `${(evilTeamSize / currentCount) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-success block">Good Team ({goodTeamSize})</span>
                      <ul className="list-disc pl-4 text-text-dim mt-1 space-y-0.5">
                        <li>Merlin</li>
                        {hasPercival && <li>Percival</li>}
                        {goodTeamSize - 1 - (hasPercival ? 1 : 0) > 0 && (
                          <li>{goodTeamSize - 1 - (hasPercival ? 1 : 0)}x Loyal Servant</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-danger block">Evil Team ({evilTeamSize})</span>
                      <ul className="list-disc pl-4 text-text-dim mt-1 space-y-0.5">
                        {hasAssassin && <li>Assassin</li>}
                        {hasMorgana && <li>Morgana</li>}
                        {hasMordred && <li>Mordred</li>}
                        {hasOberon && <li>Oberon</li>}
                        {evilTeamSize - totalEvilSelected > 0 && (
                          <li>{evilTeamSize - totalEvilSelected}x Minion of Mordred</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Helpful Custom Warnings */}
                  {hasMorgana && !hasPercival && (
                    <div className="p-2.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-xs font-medium">
                      ⚠️ <strong>Morgana</strong> is active but <strong>Percival</strong> is not. Morgana's ability only works if Percival is enabled to be deceived.
                    </div>
                  )}

                  {/* Validation Warnings */}
                  {!hasAssassin && !hasMordred && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-danger rounded-lg text-xs font-bold animate-pulse">
                      ⚠️ <strong>Assassination required!</strong> Either the <strong>Assassin</strong> or <strong>Mordred</strong> must be selected to enable the endgame assassination phase.
                    </div>
                  )}
                  {totalEvilSelected > evilTeamSize && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-danger rounded-lg text-xs font-bold animate-pulse">
                      🚫 Too many Evil roles selected! At {currentCount} players, you can select at most {evilTeamSize} Evil roles. Please deselect some.
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex gap-4 bg-gray-50/50 rounded-b-2xl">
                <Button
                  variant="ghost"
                  onClick={() => setShowRolesModal(false)}
                  className="flex-1 text-text-dim hover:text-text border border-transparent"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={beginGame}
                  className="flex-1"
                  disabled={loading || !isEvilRolesSelectionValid}
                >
                  {loading ? 'Starting Game...' : 'Begin Quest'}
                </Button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
