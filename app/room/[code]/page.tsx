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
import LadyOfLake from './phases/LadyOfLake';
import AssassinPhase from './phases/AssassinPhase';
import GameOver from './phases/GameOver';

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const [sessionId, setSessionId] = useState<string>('');

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
    lady_of_lake: LadyOfLake,
    assassin: AssassinPhase,
    ended: GameOver,
  }[gameState.phase];

  return (
    <PhaseComponent 
      gameState={gameState} 
      currentPlayer={currentPlayer} 
      roomCode={roomCode}
      roomId={roomId as string}
      myRole={myRole}
    />
  );
}
