'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function JoinGame() {
  const router = useRouter();
  const supabase = createClient();
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || code.length !== 6) {
      setError('Please enter a valid 6-character room code.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      const upperCode = code.toUpperCase();
      
      // Look up room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', upperCode)
        .single();

      if (roomError || !room) {
        throw new Error('Room not found. Check the code and try again.');
      }

      if (room.status !== 'lobby') {
        throw new Error('This game has already started.');
      }

      let sessionId = localStorage.getItem('avalon_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('avalon_session_id', sessionId);
      }

      // Check if player already exists in this room (rejoining lobby)
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .eq('session_id', sessionId)
        .single();

      if (!existingPlayer) {
        // Create new player
        const { error: playerError } = await supabase
          .from('players')
          .insert({
            room_id: room.id,
            session_id: sessionId,
            name: name.trim(),
            is_host: false,
          });

        if (playerError) throw playerError;
      }

      router.push(`/room/${upperCode}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join game');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-textured p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-bg-surface border border-neutral rounded-lg p-6 shadow-xl">
        <h1 className="font-cinzel text-3xl text-gold mb-6 text-center">Join Game</h1>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-parchment-dim text-sm uppercase tracking-wider block">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-bg-deep border border-neutral rounded p-3 text-parchment font-mono text-center tracking-widest uppercase focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              placeholder="ABCDEF"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-parchment-dim text-sm uppercase tracking-wider block">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-deep border border-neutral rounded p-3 text-parchment focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              placeholder="e.g. Lancelot"
              maxLength={20}
              required
            />
          </div>

          {error && <div className="text-crimson-bright text-sm">{error}</div>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      </div>
    </main>
  );
}
