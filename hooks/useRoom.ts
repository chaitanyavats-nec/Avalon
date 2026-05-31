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
    let channel: any;

    async function fetchInitialState() {
      try {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (roomError) throw roomError;
        setRoomId(room.id);

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
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
        }));

        const { data: questsData } = await supabase
          .from('quests')
          .select('*')
          .eq('room_id', room.id)
          .order('quest_number', { ascending: true });

        setGameState({
          phase: room.status as any,
          currentQuest: room.current_quest || 1,
          questLeaderId: players[room.quest_leader_index || 0]?.id || '',
          rejectionCount: room.rejection_count || 0,
          quests: questsData ? questsData.map(q => ({
            id: q.id,
            questNumber: q.quest_number,
            requiredPlayers: q.required_players,
            requiresTwoFails: false, // We'd compute this based on room settings
            proposedTeam: q.proposed_team || [],
            proposalCount: q.proposal_count,
            teamVoteResult: q.team_vote_result as any,
            questResult: q.quest_result as any
          })) : [],
          players,
          settings: room.settings as any,
          ladyOfLakeHolderId: null, // Fetch from lady_of_lake table if needed
          winner: null,
        });

        // Set up Realtime subscription
        channel = supabase.channel(`room:${roomCode}`);
        
        channel
          .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEvent }) => {
            // Handle different event types here to optimistically update state
            // For now, we can just refetch on any event to ensure consistency, 
            // though it's better to update state directly
            fetchInitialState(); // simple but less efficient
          })
          .subscribe();

        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load room');
        setLoading(false);
      }
    }

    if (roomCode) {
      fetchInitialState();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode, supabase, sessionId]);

  return { gameState, roomId, loading, error };
}
