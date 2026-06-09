'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { GamePhase } from '@/types/avalon';

import { useMyRole } from '@/hooks/useMyRole';

// Placeholders for phase components
import Lobby from './phases/Lobby';
import RoleReveal from './phases/RoleReveal';
import QuestPhase from './phases/QuestPhase';
import QuestReveal from './phases/QuestReveal';
import LadyOfLake from './phases/LadyOfLake';
import AssassinPhase from './phases/AssassinPhase';
import GameOver from './phases/GameOver';
import RoleCard from '@/components/RoleCard';
import { Eye } from 'lucide-react';

// Transition directions: which way the OLD phase exits and the NEW phase enters
// 'down' = old slides down, new slides up from below
// 'up'   = old slides up, new slides down from above
// 'fade' = crossfade (same visual space)
type TransitionDir = 'down' | 'up' | 'fade';

function getTransitionDir(from: string | null, to: string): TransitionDir {
  // Quest → Quest Reveal: same dark screen, just fade
  if (from === 'quest' && to === 'quest_reveal') return 'fade';
  // Quest Reveal → Quest (next round): fade back on the same dark screen, QuestPhase handles its own slide-up internally
  if (from === 'quest_reveal' && to === 'quest') return 'fade';
  // Quest Reveal → Lady of Lake or Assassin: slide up (cards exit upward, new screen enters from below)
  if (from === 'quest_reveal' && (to === 'lady_of_lake' || to === 'assassin' || to === 'ended')) return 'up';
  // Role Reveal → Quest: slide down (role card exits downward, quest slides up)
  if (from === 'role_reveal' && to === 'quest') return 'down';
  // Lady of Lake → Quest: fade (smooth return)
  if (from === 'lady_of_lake' && to === 'quest') return 'fade';
  // Quest → Assassin: slide up
  if (from === 'quest' && to === 'assassin') return 'up';
  // Assassin → Ended: fade
  if (from === 'assassin' && to === 'ended') return 'fade';
  // Default: fade
  return 'fade';
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const [sessionId, setSessionId] = useState<string>('');
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);

  // Transition state
  const [displayedPhase, setDisplayedPhase] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDir, setTransitionDir] = useState<TransitionDir>('fade');
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    let sid = localStorage.getItem('avalon_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('avalon_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  const { gameState, roomId, loading, error } = useRoom(roomCode, sessionId);
  const { myRole } = useMyRole(roomCode, sessionId);

  const currentPhase = gameState?.phase || null;

  // Handle phase transitions
  useEffect(() => {
    if (!currentPhase) return;
    
    // First load — no transition, just display
    if (displayedPhase === null) {
      setDisplayedPhase(currentPhase);
      prevPhaseRef.current = currentPhase;
      return;
    }

    // Phase changed
    if (currentPhase !== displayedPhase && transitionState === 'idle') {
      const dir = getTransitionDir(displayedPhase, currentPhase);
      setTransitionDir(dir);
      setTransitionState('exiting');
      prevPhaseRef.current = displayedPhase;

      // After exit animation completes, swap content and enter
      const exitDuration = dir === 'fade' ? 400 : 600;
      setTimeout(() => {
        setDisplayedPhase(currentPhase);
        setTransitionState('entering');

        const enterDuration = dir === 'fade' ? 400 : 600;
        setTimeout(() => {
          setTransitionState('idle');
        }, enterDuration);
      }, exitDuration);
    }
  }, [currentPhase, displayedPhase, transitionState]);

  if (!sessionId || loading) {
    return <main className="min-h-screen bg-textured p-4 flex items-center justify-center text-parchment">Loading...</main>;
  }

  if (error || !gameState) {
    return <main className="min-h-screen bg-textured p-4 flex items-center justify-center text-crimson-bright">{error || 'Room not found'}</main>;
  }

  const currentPlayer = gameState.players.find(p => p.sessionId === sessionId);
  if (!currentPlayer) {
    return <main className="min-h-screen bg-textured p-4 flex items-center justify-center text-crimson-bright">You are not in this room. Please join from the home page.</main>;
  }

  const PhaseComponent = {
    lobby: Lobby,
    role_reveal: RoleReveal,
    quest: QuestPhase,
    quest_reveal: QuestReveal,
    lady_of_lake: LadyOfLake,
    assassin: AssassinPhase,
    ended: GameOver,
  }[displayedPhase || 'lobby'];

  const showRoleButton = ['quest', 'lady_of_lake', 'assassin'].includes(gameState.phase) && myRole;

  // Build transition classes for the phase wrapper
  const getTransitionClasses = (): string => {
    if (transitionState === 'idle') return 'opacity-100 translate-y-0';

    if (transitionState === 'exiting') {
      switch (transitionDir) {
        case 'down': return 'opacity-0 translate-y-[100vh]';
        case 'up': return 'opacity-0 -translate-y-[100vh]';
        case 'fade': return 'opacity-0 translate-y-0';
      }
    }

    if (transitionState === 'entering') {
      // Entering starts from the opposite direction and moves to center
      return 'opacity-100 translate-y-0';
    }

    return 'opacity-100 translate-y-0';
  };

  return (
    <>
      <div className="overflow-hidden">
        <div
          className={`min-h-screen transition-all ease-[cubic-bezier(0.23,1,0.32,1)] ${getTransitionClasses()}`}
          style={{
            transitionDuration: transitionDir === 'fade' ? '400ms' : '600ms',
          }}
        >
          <PhaseComponent 
            gameState={gameState} 
            currentPlayer={currentPlayer} 
            roomCode={roomCode}
            roomId={roomId as string}
            myRole={myRole}
          />
        </div>
      </div>

      {showRoleButton && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          {(gameState.ladyOfLakeHistory?.length > 0 || gameState.settings.ladyOfLake) && (
            <button 
              onClick={() => setShowHistoryOverlay(true)}
              className="bg-surface text-text border border-border shadow-lg rounded-full px-5 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Game History
            </button>
          )}
        </div>
      )}

      {/* Role Card Drawer — peeks from bottom, slides up on tap */}
      {showRoleButton && myRole && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${
              showRoleOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setShowRoleOverlay(false)}
          />

          {/* The sliding container */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              transform: showRoleOverlay ? 'translateY(0)' : 'translateY(calc(100% - 48px))'
            }}
          >
            {/* Peek tab — visible when collapsed, positioned at the very top of the sliding container */}
            <div 
              className={`absolute top-0 w-full max-w-[340px] md:max-w-[400px] cursor-pointer transition-opacity duration-300 ${
                showRoleOverlay ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
              }`}
              onClick={() => setShowRoleOverlay(true)}
            >
              <div className="bg-surface border border-border border-b-0 rounded-t-2xl h-[48px] px-5 flex items-center justify-center gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                <Eye className="w-4 h-4 text-text-dim" />
                <span className="text-xs uppercase font-bold tracking-[0.15em] text-text-dim">Your Role</span>
              </div>
            </div>

            {/* Full card — visible when expanded, centered in the container */}
            <div className={`flex flex-col items-center space-y-6 max-w-sm md:max-w-md w-full px-4 transition-opacity duration-500 delay-100 ${
              showRoleOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              <RoleCard myRole={myRole} forceReveal />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRoleOverlay(false);
                }}
                className="px-8 py-3 bg-white/10 text-white font-bold rounded-full border border-white/20 hover:bg-white/20 transition-colors shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryOverlay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center p-4 backdrop-blur-sm animate-fadeIn pt-20 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Game History
              </h2>
              <button onClick={() => setShowHistoryOverlay(false)} className="text-text-dim hover:text-text">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {gameState.ladyOfLakeHistory?.filter((r: any) => r.investigated_player_declaration && r.holder_declaration).map((record: any) => {
                const holder = gameState.players.find(p => p.id === record.holder_player_id);
                const target = gameState.players.find(p => p.id === record.investigated_player_id);
                return (
                  <div key={record.id} className="border border-border rounded-xl p-4 bg-gray-50/50 text-sm">
                    <p className="font-bold text-info mb-2 uppercase tracking-wider text-xs">After Quest {record.quest_number}</p>
                    <div className="space-y-2">
                      <p className="text-text-dim"><span className="font-bold text-text">{target?.name}</span> declared loyalty to <span className={`font-bold uppercase ${record.investigated_player_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>{record.investigated_player_declaration}</span>.</p>
                      <p className="text-text-dim"><span className="font-bold text-text">{holder?.name}</span> investigated them and declared they are loyal to <span className={`font-bold uppercase ${record.holder_declaration === 'arthur' ? 'text-success' : 'text-danger'}`}>{record.holder_declaration}</span>.</p>
                    </div>
                  </div>
                );
              })}
              
              {(!gameState.ladyOfLakeHistory || gameState.ladyOfLakeHistory.filter((r: any) => r.investigated_player_declaration && r.holder_declaration).length === 0) && (
                <div className="text-center py-8 text-text-dim italic">
                  No public events have been recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
