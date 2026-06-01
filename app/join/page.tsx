"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (code.length !== 6) {
      setError('Room code must be exactly 6 characters.');
      setLoading(false);
      return;
    }

    if (name.trim().length < 2) {
      setError('Please enter a valid name.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const codeUpper = code.toUpperCase();

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', codeUpper)
        .single();

      if (roomError || !room) {
        throw new Error('Room not found. Please check the code.');
      }

      if (room.status !== 'lobby') {
        throw new Error('Game has already started.');
      }

      const { data: existingPlayers, error: countError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id);

      if (countError) throw countError;

      if (existingPlayers.length >= 10) {
        throw new Error('Room is full (max 10 players).');
      }

      let sessionId = localStorage.getItem('avalon_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('avalon_session_id', sessionId);
      }

      const { error: joinError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          session_id: sessionId,
          name: name.trim()
        });

      if (joinError) throw joinError;

      router.push(`/room/${codeUpper}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-realm flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Join Game</h1>
        
        <form onSubmit={handleJoin} className="scroll-panel p-6 flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-dim">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDEF"
              className="medieval-input uppercase text-center tracking-widest font-mono"
              maxLength={6}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-text-dim">Your Name</label>
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
            <Button type="submit" className="w-full" variant="primary" disabled={loading || code.length !== 6 || name.length < 2}>
              {loading ? 'Joining...' : 'Join Game'}
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

export default function JoinGame() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-realm flex items-center justify-center p-6"><div className="text-text">Loading...</div></div>}>
      <JoinGameContent />
    </Suspense>
  );
}
