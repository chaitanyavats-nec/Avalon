'use client';

import { useEffect, useState } from 'react';
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

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const [sessionId, setSessionId] = useState<string>('');
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);

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
  }[gameState.phase];

  const showRoleButton = ['quest', 'lady_of_lake', 'assassin'].includes(gameState.phase) && myRole;

  return (
    <>
      <PhaseComponent 
        gameState={gameState} 
        currentPlayer={currentPlayer} 
        roomCode={roomCode}
        roomId={roomId as string}
        myRole={myRole}
      />

      {showRoleButton && (
        <button 
          onClick={() => setShowRoleOverlay(true)}
          className="fixed bottom-6 right-6 bg-surface text-text border border-border shadow-lg rounded-full px-5 py-3 font-bold text-sm z-40 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-5 h-5" /> My Role
        </button>
      )}

      {showRoleOverlay && myRole && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
           <RoleCard myRole={myRole} />
           <button 
             onClick={() => setShowRoleOverlay(false)}
             className="mt-8 px-8 py-3 bg-white/10 text-white font-bold rounded-full border border-white/20 hover:bg-white/20 transition-colors shadow-lg"
           >
             Close
           </button>
        </div>
      )}
    </>
  );
}
