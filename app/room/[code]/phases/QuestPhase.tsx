import { useState, useEffect } from 'react';
import { GameState, Player, Quest } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function QuestPhase({ gameState, currentPlayer, roomCode, roomId }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string }) {
  const supabase = createClient();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);

  const currentQuest = gameState.quests.find(q => q.questNumber === gameState.currentQuest && !q.questResult) || gameState.quests[gameState.currentQuest - 1];
  if (!currentQuest) return <div className="min-h-screen bg-textured p-4 flex items-center justify-center text-parchment">Loading quest data...</div>;

  const isLeader = gameState.questLeaderId === currentPlayer.id;
  const isProposing = !currentQuest.proposedTeam || currentQuest.proposedTeam.length === 0;
  
  // Realtime subscription for votes
  useEffect(() => {
    if (!currentQuest?.id) return;
    const fetchVotes = async () => {
      const { data } = await supabase.from('votes').select('*').eq('quest_id', currentQuest.id);
      if (data) setVotes(data);
    };
    fetchVotes();

    const channel = supabase.channel(`votes:${currentQuest.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `quest_id=eq.${currentQuest.id}` }, fetchVotes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentQuest?.id, supabase]);

  const togglePlayer = (id: string) => {
    if (selectedPlayers.includes(id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== id));
    } else if (selectedPlayers.length < currentQuest.requiredPlayers) {
      setSelectedPlayers([...selectedPlayers, id]);
    }
  };

  const proposeTeam = async () => {
    setLoading(true);
    await supabase.from('quests').update({ proposed_team: selectedPlayers }).eq('id', currentQuest.id);
    setLoading(false);
  };

  const submitVote = async (vote: 'approve' | 'reject') => {
    setLoading(true);
    await supabase.from('votes').upsert({
      quest_id: currentQuest.id,
      player_id: currentPlayer.id,
      vote
    });
    setLoading(false);
  };

  const botVotes = async () => {
    // Test mode: have bots vote automatically
    setLoading(true);
    const botPlayers = gameState.players.filter(p => p.name.startsWith('Bot '));
    for (const bot of botPlayers) {
      await supabase.from('votes').upsert({
        quest_id: currentQuest.id,
        player_id: bot.id,
        vote: Math.random() > 0.3 ? 'approve' : 'reject' // slightly favor approve
      });
    }
    setLoading(false);
  };

  const myVote = votes.find(v => v.player_id === currentPlayer.id);
  const allVoted = votes.length === gameState.players.length;

  return (
    <div className="min-h-screen bg-textured p-4 text-parchment flex flex-col items-center">
      <h1 className="font-cinzel text-3xl text-gold mb-2">Quest {currentQuest.questNumber}</h1>
      <p className="text-parchment-dim mb-8">Rejections: {gameState.rejectionCount}/5</p>

      {/* Quest Track (simplified) */}
      <div className="flex space-x-2 mb-8">
        {gameState.quests.map(q => (
          <div key={q.id} className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
            q.questNumber === gameState.currentQuest ? 'border-gold shadow-glow-gold' : 'border-neutral'
          } ${
            q.questResult === 'pass' ? 'bg-success' : q.questResult === 'fail' ? 'bg-danger' : 'bg-bg-elevated'
          }`}>
            {q.requiredPlayers}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md bg-bg-surface border border-neutral rounded-lg p-6 shadow-xl text-center">
        {isProposing ? (
          <>
            <h2 className="text-xl mb-4">
              {isLeader ? 'Propose a Team' : 'Waiting for Leader to Propose'}
            </h2>
            <p className="text-sm text-parchment-dim mb-4">Required players: {currentQuest.requiredPlayers}</p>
            
            <div className="grid grid-cols-2 gap-2 mb-6 text-left">
              {gameState.players.map(p => (
                <button
                  key={p.id}
                  disabled={!isLeader}
                  onClick={() => togglePlayer(p.id)}
                  className={`p-2 rounded border text-sm ${
                    selectedPlayers.includes(p.id) ? 'bg-gold/20 border-gold text-gold' : 'border-neutral text-parchment-dim'
                  }`}
                >
                  {p.name} {p.id === gameState.questLeaderId && '👑'}
                </button>
              ))}
            </div>

            {isLeader && (
              <Button 
                className="w-full" 
                variant="primary" 
                disabled={selectedPlayers.length !== currentQuest.requiredPlayers || loading}
                onClick={proposeTeam}
              >
                Propose Team
              </Button>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl mb-4">Vote on Proposed Team</h2>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {currentQuest.proposedTeam.map(pid => {
                const player = gameState.players.find(p => p.id === pid);
                return <span key={pid} className="px-3 py-1 bg-bg-elevated border border-gold-dim text-gold rounded-full text-sm">{player?.name}</span>;
              })}
            </div>

            {!myVote ? (
              <div className="flex space-x-4 justify-center">
                <Button onClick={() => submitVote('approve')} variant="outline" disabled={loading} className="text-success border-success hover:bg-success hover:text-white">Approve</Button>
                <Button onClick={() => submitVote('reject')} variant="danger" disabled={loading}>Reject</Button>
              </div>
            ) : (
              <div>
                <p className="text-gold mb-2">You voted: {myVote.vote}</p>
                <p className="text-sm text-parchment-dim">Waiting for others... ({votes.length}/{gameState.players.length})</p>
                {currentPlayer.isHost && !allVoted && (
                  <Button size="sm" onClick={botVotes} disabled={loading} className="mt-4">Simulate Bot Votes</Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {currentPlayer.isHost && allVoted && (
        <div className="mt-8">
           <p className="text-gold mb-2">Everyone has voted. (Normally this triggers reveal & next state automatically)</p>
           {/* We would have a next phase / reveal logic here */}
        </div>
      )}
    </div>
  );
}
