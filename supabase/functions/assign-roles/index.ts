import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ROLES = {
  'Loyal Servant of Arthur': { team: 'good' },
  'Merlin': { team: 'good' },
  'Percival': { team: 'good' },
  'Minion of Mordred': { team: 'evil' },
  'Assassin': { team: 'evil' },
  'Morgana': { team: 'evil' },
  'Mordred': { team: 'evil' },
  'Oberon': { team: 'evil' },
};

function getRoleKnowledge(myRole: string, allPlayers: any[]) {
  const seenPlayers: any[] = [];
  
  if (myRole === 'Loyal Servant of Arthur') return { knowledgeText: 'You know nothing. Trust no one.', seenPlayers };

  if (myRole === 'Merlin') {
    for (const p of allPlayers) {
      if (ROLES[p.role as keyof typeof ROLES].team === 'evil' && p.role !== 'Mordred') {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'evil' });
      }
    }
    return { knowledgeText: 'You know the forces of evil (except Mordred).', seenPlayers };
  }

  if (myRole === 'Percival') {
    for (const p of allPlayers) {
      if (p.role === 'Merlin' || p.role === 'Morgana') {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'possible Merlin' });
      }
    }
    return { knowledgeText: 'You see two players who could be Merlin.', seenPlayers };
  }

  if (myRole === 'Oberon') {
    return { knowledgeText: 'You are isolated from the rest of your team.', seenPlayers };
  }

  if (ROLES[myRole as keyof typeof ROLES].team === 'evil') {
    for (const p of allPlayers) {
      if (ROLES[p.role as keyof typeof ROLES].team === 'evil' && p.role !== 'Oberon' && p.role !== myRole) {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'evil' });
      }
    }
    
    // If Mordred is in the game but there is no Assassin, Mordred becomes the assassin.
    const hasAssassin = allPlayers.some(p => p.role === 'Assassin');
    if (myRole === 'Mordred' && !hasAssassin) {
      return { knowledgeText: 'You know the other agents of evil (except Oberon). Note: Since there is no Assassin, you have the assassination power!', seenPlayers };
    }
    
    return { knowledgeText: 'You know the other agents of evil (except Oberon).', seenPlayers };
  }

  return { knowledgeText: '', seenPlayers };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { room_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Room Settings and Players
    const { data: room, error: roomError } = await supabase.from('rooms').select('*').eq('id', room_id).single();
    const { data: players, error: playersError } = await supabase.from('players').select('*').eq('room_id', room_id);

    if (roomError || playersError || !room || !players) {
      return new Response(JSON.stringify({ error: 'Failed to fetch room/players' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Determine exact roles pool
    const optionalRoles = room.settings.roles || [];
    
    const evilCounts = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 } as any;
    const goodCounts = { 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6 } as any;
    
    const evilNeeded = evilCounts[players.length] || 2;
    const goodNeeded = goodCounts[players.length] || 3;

    const finalRolesPool: string[] = [];
    let evilAdded = 0;
    let goodAdded = 0;

    // A. Merlin is always in the game
    finalRolesPool.push('Merlin');
    goodAdded++;

    // B. Push optional/configured roles up to the team cap limits
    for (const r of optionalRoles) {
      if (r === 'Merlin') continue;
      const team = ROLES[r as keyof typeof ROLES].team;
      if (team === 'evil') {
        if (evilAdded < evilNeeded) {
          finalRolesPool.push(r);
          evilAdded++;
        }
      } else {
        if (goodAdded < goodNeeded) {
          finalRolesPool.push(r);
          goodAdded++;
        }
      }
    }

    // C. Safety Fallback: Ensure at least one of Assassin or Mordred is present for assassination phase
    const hasAssassin = finalRolesPool.includes('Assassin');
    const hasMordred = finalRolesPool.includes('Mordred');
    if (!hasAssassin && !hasMordred) {
      if (evilAdded < evilNeeded) {
        finalRolesPool.push('Assassin');
        evilAdded++;
      } else {
        // If evil team slots are fully occupied by other special evil roles, replace one with Assassin to maintain balance
        const lastEvilIdx = finalRolesPool.findLastIndex(r => ROLES[r as keyof typeof ROLES].team === 'evil');
        if (lastEvilIdx !== -1) {
          finalRolesPool[lastEvilIdx] = 'Assassin';
        } else {
          finalRolesPool.push('Assassin');
          evilAdded++;
        }
      }
    }

    // D. Fill the remaining spots with generic/base roles
    while (evilAdded < evilNeeded) {
      finalRolesPool.push('Minion of Mordred');
      evilAdded++;
    }
    while (goodAdded < goodNeeded) {
      finalRolesPool.push('Loyal Servant of Arthur');
      goodAdded++;
    }

    const rolesPool = finalRolesPool;

    // Shuffle roles and assign
    rolesPool.sort(() => Math.random() - 0.5);
    players.sort(() => Math.random() - 0.5);

    const assignedPlayers = players.map((p: any, idx: number) => ({
      ...p,
      role: rolesPool[idx],
      team: ROLES[rolesPool[idx] as keyof typeof ROLES].team
    }));

    // Save to database
    for (const p of assignedPlayers) {
      await supabase.from('players').update({ role: p.role, team: p.team }).eq('id', p.id);
    }

    // 3. Send private broadcasts
    for (const p of assignedPlayers) {
      const knowledge = getRoleKnowledge(p.role, assignedPlayers);
      const channel = supabase.channel(`room:${room.code}:player:${p.session_id}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'role_assigned',
        payload: { role: p.role, team: p.team, ...knowledge }
      });
    }

    // 4. Generate the 5 quests for the game
    const questCounts: Record<number, number[]> = {
      5: [2, 3, 2, 3, 3],
      6: [2, 3, 4, 3, 4],
      7: [2, 3, 3, 4, 4],
      8: [3, 4, 4, 5, 5],
      9: [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5]
    };

    const counts = questCounts[players.length] || questCounts[5];
    const questsToInsert = counts.map((count, index) => ({
      room_id: room_id,
      quest_number: index + 1,
      required_players: count,
      proposed_team: [],
      proposal_count: 1
    }));

    await supabase.from('quests').insert(questsToInsert);

    // 5. Update room status and pick first leader (randomly)
    const firstLeaderIndex = Math.floor(Math.random() * players.length);
    await supabase.from('rooms').update({ 
      status: 'role_reveal',
      quest_leader_index: firstLeaderIndex
    }).eq('id', room_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
