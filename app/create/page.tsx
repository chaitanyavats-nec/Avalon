'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { generateRoomCode } from '@/lib/game/room-code';
import { RoleName } from '@/types/avalon';
import { validateRoles } from '@/lib/game/roles';

export default function CreateGame() {
  const router = useRouter();
  const supabase = createClient();
  
  const [playerCount, setPlayerCount] = useState<number>(5);
  const [hostName, setHostName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleName[]>([]);
  const [ladyOfLake, setLadyOfLake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const optionalRoles: { name: RoleName; description: string }[] = [
    { name: 'Percival', description: 'Sees Merlin and Morgana' },
    { name: 'Morgana', description: 'Appears as Merlin to Percival' },
    { name: 'Mordred', description: 'Hidden from Merlin' },
    { name: 'Oberon', description: 'Hidden from other evil players' },
  ];

  const handleToggleRole = (role: RoleName) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hostName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!validateRoles(playerCount, selectedRoles)) {
      setError('Too many evil roles selected for this player count.');
      return;
    }

    setLoading(true);

    try {
      const code = generateRoomCode();
      const sessionId = crypto.randomUUID(); // Mocking anonymous session for host
      localStorage.setItem('avalon_session_id', sessionId);

      const settings = { playerCount, roles: selectedRoles, ladyOfLake };

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          host_session_id: sessionId,
          settings,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Create host player
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          session_id: sessionId,
          name: hostName.trim(),
          is_host: true,
        });

      if (playerError) throw playerError;

      router.push(`/room/${code}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create game');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-textured p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-bg-surface border border-neutral rounded-lg p-6 shadow-xl">
        <h1 className="font-cinzel text-3xl text-gold mb-6 text-center">Setup Game</h1>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-parchment-dim text-sm uppercase tracking-wider block">Your Name</label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full bg-bg-deep border border-neutral rounded p-3 text-parchment focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              placeholder="e.g. Arthur"
              maxLength={20}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-parchment-dim text-sm uppercase tracking-wider block">Player Count ({playerCount})</label>
            <input
              type="range"
              min="5"
              max="10"
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-xs text-neutral">
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-parchment-dim text-sm uppercase tracking-wider block">Optional Roles</label>
            {optionalRoles.map((role) => (
              <label key={role.name} className="flex items-start space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.name)}
                  onChange={() => handleToggleRole(role.name)}
                  className="mt-1 accent-gold w-4 h-4 rounded border-neutral"
                />
                <div>
                  <div className="text-parchment group-hover:text-gold transition-colors">{role.name}</div>
                  <div className="text-xs text-neutral">{role.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={ladyOfLake}
                onChange={(e) => setLadyOfLake(e.target.checked)}
                className="mt-1 accent-gold w-4 h-4 rounded border-neutral"
              />
              <div>
                <div className="text-parchment group-hover:text-gold transition-colors">Lady of the Lake</div>
                <div className="text-xs text-neutral">Adds alignment investigation after quests 2, 3, 4</div>
              </div>
            </label>
          </div>

          {error && <div className="text-crimson-bright text-sm">{error}</div>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Room'}
          </Button>
        </form>
      </div>
    </main>
  );
}
