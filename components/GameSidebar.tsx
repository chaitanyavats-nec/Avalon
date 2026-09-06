import { GameState, Player } from '@/types/avalon';
import { ROLE_ART } from '@/lib/game/roles';
import { X, Droplets } from 'lucide-react';

export default function GameSidebar({ gameState, currentPlayer, open, onClose }: {
  gameState: GameState;
  currentPlayer: Player;
  open: boolean;
  onClose: () => void;
}) {
  const leaderIdx = gameState.players.findIndex(p => p.id === gameState.questLeaderId);
  const queue = leaderIdx === -1
    ? gameState.players
    : [...gameState.players.slice(leaderIdx), ...gameState.players.slice(0, leaderIdx)];

  const rolesInPlay = Array.from(new Set(['Merlin', ...(gameState.settings.roles || [])]));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-surface border-l border-border shadow-2xl z-[60] flex flex-col ${
          open ? 'animate-sidebarSlideIn' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text">Game Board</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
          {/* Player Queue */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-3">Leader Queue</h3>
            <div className="space-y-2">
              {queue.map((p, i) => {
                const isLeader = p.id === gameState.questLeaderId;
                const isHolder = p.id === gameState.ladyOfLakeHolderId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                      p.id === currentPlayer.id ? 'border-text bg-gray-50' : 'border-border bg-surface'
                    }`}
                  >
                    <span className="text-xs font-mono text-text-dim w-4 text-center">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-text truncate">{p.name}</span>
                    <div className="flex items-center gap-1.5">
                      {isLeader && (
                        <img src="/backgrounds/leader.png" alt="Leader" title="Current Leader" className="w-6 h-6 rounded-full shadow-sm" />
                      )}
                      {isHolder && (
                        <span title="Lady of the Lake Holder" className="w-6 h-6 rounded-full bg-info/10 border border-info/30 flex items-center justify-center">
                          <Droplets className="w-3.5 h-3.5 text-info" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roles in Play */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-3">Roles in Play</h3>
            <div className="grid grid-cols-4 gap-2">
              {rolesInPlay.map(role => (
                <div key={role} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square rounded-lg overflow-hidden border border-border bg-[#f0ede8]">
                    <img src={ROLE_ART[role as keyof typeof ROLE_ART]} alt={role} className="w-full h-full object-cover object-top" />
                  </div>
                  <span className="text-[9px] text-text-dim text-center leading-tight">{role}</span>
                </div>
              ))}
              {gameState.settings.ladyOfLake && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square rounded-lg overflow-hidden border border-border bg-info/10 flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-info" />
                  </div>
                  <span className="text-[9px] text-text-dim text-center leading-tight">Lady of the Lake</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
