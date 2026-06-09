import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GameState, GameEvent, Player } from '@/types/avalon';

export function useRoom(roomCode: string, sessionId: string) {
  const supabase = createClient();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel(`room:${roomCode}`);

    async function fetchInitialState() {
      try {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (roomError) throw roomError;
        if (isMounted) setRoomId(room.id);

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, room_id, session_id, name, is_host, is_ready, seat_order, team, role')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true });

        if (playersError) throw playersError;

        const players: Player[] = playersData.map((p) => ({
          id: p.id,
          name: p.name,
          sessionId: p.session_id,
          isHost: p.is_host,
          isReady: p.is_ready,
          seatOrder: p.seat_order || 0,
          team: p.team as any,
          role: p.role as any,
        }));

        const { data: questsData } = await supabase
          .from('quests')
          .select('*')
          .eq('room_id', room.id)
          .order('quest_number', { ascending: true });

        const { data: ladyData } = await supabase
          .from('lady_of_lake')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false });

        if (isMounted) {
          setGameState({
            phase: room.status as any,
            currentQuest: room.current_quest || 1,
            questLeaderId: players[room.quest_leader_index || 0]?.id || '',
            rejectionCount: room.rejection_count || 0,
            quests: questsData ? questsData.map(q => ({
              id: q.id,
              questNumber: q.quest_number,
              requiredPlayers: q.required_players,
              requiresTwoFails: false,
              proposedTeam: q.proposed_team || [],
              proposalCount: q.proposal_count,
              teamVoteResult: q.team_vote_result as any,
              questResult: q.quest_result as any
            })) : [],
            players,
            settings: room.settings as any,
            ladyOfLakeHolderId: ladyData && ladyData.length > 0 ? ladyData[0].investigated_player_id : null,
            ladyOfLakeHistory: ladyData || [],
            winner: null,
          });
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Room Load Error:", err);
          setError(`Failed to load room: ${err.message || JSON.stringify(err)}`);
          setLoading(false);
        }
      }
    }

    if (roomCode) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
          fetchInitialState();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
          fetchInitialState();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, () => {
          fetchInitialState();
        })
        .on('broadcast', { event: 'game_event' }, () => {
          fetchInitialState(); 
        })
        .subscribe();

      fetchInitialState();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomCode, supabase, sessionId]);

  return { gameState, roomId, loading, error };
}
