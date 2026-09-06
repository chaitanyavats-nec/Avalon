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
import GameSidebar from '@/components/GameSidebar';
import { isSoundMuted, setSoundMuted } from '@/lib/sound';
import { Eye, Info, X, ScrollText, BookOpen, LayoutList, Volume2, VolumeX } from 'lucide-react';

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
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [infoTab, setInfoTab] = useState<'info' | 'logs'>('info');
  const [showSidebar, setShowSidebar] = useState(false);
  const [leaderAnnouncement, setLeaderAnnouncement] = useState<{ name: string; isMe: boolean } | null>(null);
  const prevLeaderIdRef = useRef<string | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSoundMuted());
  }, []);

  const toggleMuted = () => {
    setSoundMuted(!muted);
    setMuted(!muted);
  };

  // Transition state
  const [displayedPhase, setDisplayedPhase] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDir, setTransitionDir] = useState<TransitionDir>('fade');
  const prevPhaseRef = useRef<string | null>(null);
  const currentPhaseRef = useRef<string | null>(null);

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
  currentPhaseRef.current = currentPhase;

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
        // Read the latest phase at fire time in case it changed again mid-exit
        setDisplayedPhase(currentPhaseRef.current);
        setTransitionState('entering');

        const enterDuration = dir === 'fade' ? 400 : 600;
        setTimeout(() => {
          setTransitionState('idle');
        }, enterDuration);
      }, exitDuration);
    }
  }, [currentPhase, displayedPhase, transitionState]);

  // Announce leader changes — skips the very first observed leader (game start / page load)
  // so refreshing the page doesn't replay the banner for a leader that hasn't actually changed.
  useEffect(() => {
    const leaderId = gameState?.questLeaderId;
    if (!leaderId) return;

    const previousLeaderId = prevLeaderIdRef.current;
    prevLeaderIdRef.current = leaderId;
    if (previousLeaderId === null || previousLeaderId === leaderId) return;

    const leaderPlayer = gameState?.players.find(p => p.id === leaderId);
    const myId = gameState?.players.find(p => p.sessionId === sessionId)?.id;
    setLeaderAnnouncement({ name: leaderPlayer?.name || 'Someone', isMe: leaderId === myId });

    const timer = setTimeout(() => setLeaderAnnouncement(null), 3200);
    return () => clearTimeout(timer);
  }, [gameState?.questLeaderId, gameState?.players, sessionId]);

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

  if (!showRoleButton && showRoleOverlay) {
    setShowRoleOverlay(false);
  }

  // Build transition classes for the phase wrapper.
  // 'idle' and 'entering' both settle at the resting position — only
  // 'exiting' has a distinct (direction-dependent) class.
  const getTransitionClasses = (): string => {
    if (transitionState === 'exiting') {
      switch (transitionDir) {
        case 'down': return 'opacity-0 translate-y-[100vh]';
        case 'up': return 'opacity-0 -translate-y-[100vh]';
        case 'fade': return 'opacity-0 translate-y-0';
      }
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

      {/* Game Info & Logs — small "i" button, always available, tucked out of the way at the top */}
      <button
        onClick={() => {
          setInfoTab(gameState.settings.ladyOfLake ? 'logs' : 'info');
          setShowInfoOverlay(true);
        }}
        className="fixed top-4 left-4 z-40 w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors shadow-lg"
        title="Game Info & Logs"
      >
        <Info className="w-5 h-5" />
      </button>

      {/* Game Board — leader queue & roles in play */}
      {gameState.phase !== 'lobby' && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-4 left-16 z-40 w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors shadow-lg"
          title="Game Board"
        >
          <LayoutList className="w-5 h-5" />
        </button>
      )}

      {/* Sound mute toggle */}
      <button
        onClick={toggleMuted}
        className="fixed top-4 left-28 z-40 w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors shadow-lg"
        title={muted ? 'Unmute sound' : 'Mute sound'}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      <GameSidebar
        gameState={gameState}
        currentPlayer={currentPlayer}
        roomId={roomId as string}
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Becoming leader yourself — dramatic full-screen dim + big coin drop */}
      {leaderAnnouncement && leaderAnnouncement.isMe && (
        <div key={`self-${leaderAnnouncement.name}`} className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-leaderBackdrop">
          <div className="flex flex-col items-center animate-leaderBanner">
            <img src="/backgrounds/leader.png" alt="Leader" className="w-32 h-32 rounded-full shadow-2xl mb-5" />
            <span className="text-white text-xl font-bold tracking-wide drop-shadow-lg">You are now the Leader!</span>
          </div>
        </div>
      )}

      {/* Leader change announcement for everyone else — slides down from the top, holds, slides back out */}
      {leaderAnnouncement && !leaderAnnouncement.isMe && (
        <div key={`other-${leaderAnnouncement.name}`} className="fixed top-0 inset-x-0 z-[70] flex justify-center pt-6 pointer-events-none animate-leaderBanner">
          <div className="bg-black/85 backdrop-blur-sm border border-white/10 rounded-2xl pl-2.5 pr-5 py-2.5 flex items-center gap-3 shadow-2xl">
            <img src="/backgrounds/leader.png" alt="Leader" className="w-10 h-10 rounded-full shadow-lg" />
            <span className="text-white text-sm font-bold">
              {leaderAnnouncement.name} is now the Leader
            </span>
          </div>
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
              <RoleCard myRole={myRole} forceReveal theme="dark" />
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

      {showInfoOverlay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center p-4 backdrop-blur-sm animate-fadeIn pt-20 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-6 pb-4">
              <h2 className="text-xl font-bold text-text">Game Info & Logs</h2>
              <button onClick={() => setShowInfoOverlay(false)} className="text-text-dim hover:text-text">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 gap-1 border-b border-border">
              <button
                onClick={() => setInfoTab('info')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                  infoTab === 'info' ? 'border-text text-text' : 'border-transparent text-text-dim hover:text-text'
                }`}
              >
                <BookOpen className="w-4 h-4" /> How to Play
              </button>
              <button
                onClick={() => setInfoTab('logs')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                  infoTab === 'logs' ? 'border-text text-text' : 'border-transparent text-text-dim hover:text-text'
                }`}
              >
                <ScrollText className="w-4 h-4" /> Game Logs
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {infoTab === 'info' ? (
                <div className="space-y-4 text-sm text-text-dim">
                  <p>Good and Evil take turns proposing and voting on quest teams. Evil wins by failing 3 quests or by unmasking Merlin at the end; Good wins by passing 3 quests and keeping Merlin hidden.</p>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li>The <strong className="text-text">Leader</strong> proposes a team for each quest; everyone votes to approve or reject it.</li>
                    <li>5 rejected proposals in a row and Evil wins automatically.</li>
                    <li>Players on an approved team secretly play a Success or Fail card.</li>
                    {gameState.settings.ladyOfLake && (
                      <li>The <strong className="text-text">Lady of the Lake</strong> starts with the player to the leader's right. After quests 2, 3, and 4, its holder privately examines one player's true loyalty, then passes the token to them. A player who has already held the token can't be examined again.</li>
                    )}
                    <li>If Good wins 3 quests, the Assassin gets one chance to identify Merlin and steal the win.</li>
                  </ul>
                  <div className="pt-2 border-t border-border space-y-1">
                    <p><span className="text-text font-semibold">{gameState.players.length}</span> players in this room.</p>
                    {gameState.settings.roles && gameState.settings.roles.length > 0 && (
                      <p>Roles in play: <span className="text-text font-semibold">{gameState.settings.roles.join(', ')}</span></p>
                    )}
                    <p>Lady of the Lake: <span className="text-text font-semibold">{gameState.settings.ladyOfLake ? 'Enabled' : 'Disabled'}</span></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* quest_number 0 is just the initial hand-off to the starting holder, not an examination */}
                  {gameState.ladyOfLakeHistory?.filter((r: any) => r.quest_number > 0).map((record: any) => {
                    const holder = gameState.players.find(p => p.id === record.holder_player_id);
                    const target = gameState.players.find(p => p.id === record.investigated_player_id);
                    return (
                      <div key={record.id} className="border border-border rounded-xl p-4 bg-gray-50/50 text-sm">
                        <p className="font-bold text-info mb-2 uppercase tracking-wider text-xs">After Quest {record.quest_number}</p>
                        <p className="text-text-dim">
                          <span className="font-bold text-text">{holder?.name}</span> examined <span className="font-bold text-text">{target?.name}</span>'s loyalty in private, then passed them the token.
                        </p>
                      </div>
                    );
                  })}

                  {(!gameState.ladyOfLakeHistory || gameState.ladyOfLakeHistory.filter((r: any) => r.quest_number > 0).length === 0) && (
                    <div className="text-center py-8 text-text-dim italic">
                      No examinations have happened yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
