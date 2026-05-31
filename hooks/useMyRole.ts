import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MyRole } from '@/types/avalon';

export function useMyRole(roomCode: string, sessionId: string) {
  const supabase = createClient();
  const [myRole, setMyRole] = useState<MyRole | null>(null);

  useEffect(() => {
    let channel: any;

    if (roomCode && sessionId) {
      // Listen to private broadcast for role assignment
      channel = supabase.channel(`room:${roomCode}:player:${sessionId}`);
      
      channel
        .on('broadcast', { event: 'role_assigned' }, ({ payload }: { payload: MyRole }) => {
          setMyRole(payload);
          // Optional: cache it in case of refresh during reveal phase
          localStorage.setItem(`role_${roomCode}`, JSON.stringify(payload));
        })
        .subscribe();
        
      // Try to load from cache if we missed it
      const cached = localStorage.getItem(`role_${roomCode}`);
      if (cached && !myRole) {
        setMyRole(JSON.parse(cached));
      }
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode, sessionId, supabase]);

  return { myRole };
}
