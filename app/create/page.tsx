"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CreateGame() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter a valid name.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      let sessionId = localStorage.getItem('avalon_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('avalon_session_id', sessionId);
      }

      const roomCode = generateRoomCode();

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          host_session_id: sessionId,
          status: 'lobby',
          settings: { playerCount: 5, roles: [], ladyOfLake: false }
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          session_id: sessionId,
          name: name.trim(),
          is_host: true
        });

      if (playerError) throw playerError;

      router.push(`/room/${roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-realm flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Create Game</h1>

        <form onSubmit={handleCreate} className="scroll-panel p-6 flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-dim">Your Name (Host)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="medieval-input"
              maxLength={20}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="text-danger text-sm text-center p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full" variant="primary" disabled={loading || name.length < 2}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
          
          <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => router.push('/')} disabled={loading}>
            Back
          </Button>
        </form>
      </div>
    </div>
  );
}
