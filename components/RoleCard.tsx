import { MyRole } from '@/types/avalon';
import { useState } from 'react';
import { ROLES, ROLE_ART } from '@/lib/game/roles';

const TEAM_LABELS: Record<string, string> = {
  'Merlin': 'Loyal Servant of Arthur',
  'Percival': 'Loyal Servant of Arthur',
  'Loyal Servant of Arthur': 'Loyal Servant of Arthur',
  'Assassin': 'Servant of Mordred',
  'Morgana': 'Servant of Mordred',
  'Mordred': 'Commander of Evil',
  'Oberon': 'Servant of Mordred',
  'Minion of Mordred': 'Servant of Mordred',
};

export default function RoleCard({ myRole, forceReveal, theme = 'light' }: { myRole: MyRole; forceReveal?: boolean; theme?: 'light' | 'dark' }) {
  const [isHeld, setIsHeld] = useState(false);
  const isFlipped = forceReveal ?? isHeld;
  const isGood = myRole.team === 'good';
  const roleDef = ROLES[myRole.role];
  const artSrc = ROLE_ART[myRole.role];
  const teamLabel = TEAM_LABELS[myRole.role] || (isGood ? 'Loyal Servant of Arthur' : 'Servant of Mordred');
  const isDark = theme === 'dark';

  const accentColor = isGood ? '#3b82f6' : '#dc2626';

  return (
    <div
      className="relative w-full h-[65vh] min-h-[400px] max-h-[600px] max-w-[340px] md:max-w-[400px] mx-auto cursor-pointer select-none"
      style={{
        perspective: '1200px',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
      }}
      onPointerDown={() => setIsHeld(true)}
      onPointerUp={() => setIsHeld(false)}
      onPointerLeave={() => setIsHeld(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >

        {/* ── FRONT FACE ── Card Back */}
        <div
          className={`absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center py-16 sm:py-24 border ${
            isDark ? 'bg-zinc-900 border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'bg-surface border-border shadow-sm'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'border-zinc-700' : ''}`}
            style={isDark ? undefined : { border: '1px solid var(--color-border)' }}
          >
            <span className={`font-heading text-3xl sm:text-4xl ${isDark ? 'text-zinc-400' : 'text-text-dim'}`}>A</span>
          </div>
          <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-text-dim'}`}>
            Hold to Reveal
          </p>
        </div>

        {/* ── BACK FACE ── The Reveal */}
        <div
          className={`absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-lg flex flex-col border ${
            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-surface border-border'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Illustration — full, uncropped */}
          <div className="w-full bg-[#f0ede8] flex-1 flex items-center justify-center overflow-hidden min-h-0">
            <img
              src={artSrc}
              alt={myRole.role}
              className="w-full h-full object-cover object-center block"
              draggable={false}
            />
          </div>

          {/* Info Panel */}
          <div className={`px-5 py-4 shrink-0 overflow-y-auto ${isDark ? 'bg-zinc-900' : 'bg-surface'}`}>
            {/* Role Name */}
            <h2 className={`font-heading text-3xl sm:text-4xl text-center leading-tight ${isDark ? 'text-white' : 'text-text'}`}>
              {myRole.role}
            </h2>

            {/* Team Subtitle */}
            <p className={`text-xs sm:text-sm italic text-center mt-1 mb-4 ${isDark ? 'text-zinc-500' : 'text-text-dim'}`}>
              {teamLabel}
            </p>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-3 mx-auto max-w-[160px]">
              <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-border'}`} />
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: accentColor }}
              />
              <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-border'}`} />
            </div>

            {/* Description */}
            <p className={`text-sm sm:text-base text-center leading-relaxed ${isDark ? 'text-zinc-400' : 'text-text-dim'}`}>
              {roleDef.description}
            </p>

            {/* Known Players */}
            {myRole.seenPlayers && myRole.seenPlayers.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-[0.12em] text-center mb-2 sm:mb-3 ${isDark ? 'text-zinc-500' : 'text-text-dim'}`}>
                  Known Players
                </p>
                <div className="space-y-1">
                  {myRole.seenPlayers.map(sp => (
                    <div
                      key={sp.playerId}
                      className={`flex justify-between items-center rounded-lg px-3 py-2 ${isDark ? 'bg-black/40' : 'bg-[var(--color-bg)]'}`}
                    >
                      <span className={`text-sm sm:text-base font-medium ${isDark ? 'text-zinc-200' : 'text-text'}`}>{sp.name}</span>
                      <span
                        className="text-[10px] sm:text-xs uppercase font-bold tracking-wider"
                        style={{
                          color: sp.visibleAs === 'evil' ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#60a5fa' : '#3b82f6'),
                        }}
                      >
                        {sp.visibleAs}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge text for roles with no visible players */}
            {(!myRole.seenPlayers || myRole.seenPlayers.length === 0) && myRole.knowledgeText && (
              <p className={`text-xs sm:text-sm text-center italic mt-4 sm:mt-5 ${isDark ? 'text-zinc-500' : 'text-text-dim'}`}>
                {myRole.knowledgeText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
