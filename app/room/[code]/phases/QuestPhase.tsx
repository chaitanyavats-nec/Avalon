import { useState, useEffect } from 'react';
import { GameState, Player, Quest } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Hourglass, Crown } from 'lucide-react';

export default function QuestPhase({ gameState, currentPlayer, roomCode, roomId }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string }) {
  const supabase = createClient();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);
  const [questCards, setQuestCards] = useState<any[]>([]);
  const [hasSubmittedCard, setHasSubmittedCard] = useState(false);

  const currentQuest = gameState.quests.find(q => q.questNumber === gameState.currentQuest && !q.questResult) || gameState.quests.find(q => q.questNumber === gameState.currentQuest) || gameState.quests[gameState.currentQuest - 1];

  const allVoted = votes.length >= gameState.players.length;
  const allCardsSubmitted = currentQuest ? questCards.length >= currentQuest.requiredPlayers : false;

  const isLeader = gameState.questLeaderId === currentPlayer.id;
  const isProposing = !currentQuest?.proposedTeam || currentQuest.proposedTeam.length === 0;
  const isVotingOnTeam = (currentQuest?.proposedTeam?.length ?? 0) > 0 && !currentQuest?.teamVoteResult;
  const isVotingOnQuest = currentQuest?.teamVoteResult === 'approved' && !currentQuest?.questResult;
  const isOnProposedTeam = currentQuest?.proposedTeam?.includes(currentPlayer.id) ?? false;

  // Reset local submission state when the quest changes
  useEffect(() => {
    setHasSubmittedCard(false);
  }, [currentQuest?.id]);
  
  // Realtime subscription for votes and quest cards
  useEffect(() => {
    if (!currentQuest?.id) return;
    const fetchData = async () => {
      const [{ data: votesData }, { data: cardsData }] = await Promise.all([
        supabase.from('votes').select('*').eq('quest_id', currentQuest.id),
        supabase.from('quest_cards').select('*').eq('quest_id', currentQuest.id)
      ]);
      if (votesData) setVotes(votesData);
      if (cardsData) setQuestCards(cardsData);
    };
    fetchData();

    const channel = supabase.channel(`quest_data:${currentQuest.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `quest_id=eq.${currentQuest.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_cards', filter: `quest_id=eq.${currentQuest.id}` }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentQuest?.id, supabase]);

  // Fallback polling (in case Supabase Realtime isn't fully enabled on the user's dashboard)
  useEffect(() => {
    if (!currentQuest?.id) return;
    
    let interval: NodeJS.Timeout;
    
    // Only poll when we are actively waiting for player actions
    if (isVotingOnTeam || isVotingOnQuest) {
      interval = setInterval(async () => {
        const [{ data: votesData }, { data: cardsData }] = await Promise.all([
          supabase.from('votes').select('*').eq('quest_id', currentQuest.id),
          supabase.from('quest_cards').select('*').eq('quest_id', currentQuest.id)
        ]);
        if (votesData) setVotes(votesData);
        if (cardsData) setQuestCards(cardsData);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentQuest?.id, isVotingOnTeam, isVotingOnQuest, supabase]);

  if (!currentQuest) return (
    <div className="min-h-screen bg-realm p-4 flex items-center justify-center">
      <div className="animate-fadeIn text-center flex flex-col items-center">
        <Hourglass className="w-12 h-12 mb-4 animate-pulse text-text-dim" />
        <p className="text-parchment-dim">Loading quest data...</p>
      </div>
    </div>
  );

  
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
    const { error } = await supabase.from('votes').upsert({
      quest_id: currentQuest.id,
      player_id: currentPlayer.id,
      vote
    }, { onConflict: 'quest_id,player_id' });
    
    if (error) {
      console.error("Failed to submit vote:", error);
      alert("Failed to submit vote: " + error.message);
    } else {
      // Re-fetch immediately to bypass any realtime delay
      const { data } = await supabase.from('votes').select('*').eq('quest_id', currentQuest.id);
      if (data) setVotes(data);
    }
    setLoading(false);
  };

  const botVotes = async () => {
    const botPlayers = gameState.players.filter(p => p.name.startsWith('Sir ') || p.name.startsWith('Lady '));
    // Filter bots that haven't voted yet
    const botsNeedingVote = botPlayers.filter(bot => !votes.some(v => v.player_id === bot.id));
    
    if (botsNeedingVote.length === 0) return;

    for (const bot of botsNeedingVote) {
      await supabase.from('votes').upsert({
        quest_id: currentQuest.id,
        player_id: bot.id,
        // 80% chance to approve
        vote: Math.random() > 0.2 ? 'approve' : 'reject'
      }, { onConflict: 'quest_id,player_id' });
    }
  };

  // Auto-vote for bots when voting starts
  useEffect(() => {
    if (currentPlayer.isHost && isVotingOnTeam && !allVoted) {
      botVotes();
    }
  }, [currentPlayer.isHost, isVotingOnTeam, votes.length]);

  // Auto-submit quest cards for bots
  useEffect(() => {
    if (currentPlayer.isHost && isVotingOnQuest && currentQuest?.id) {
      const storageKey = `bot_quest_cards_${currentQuest.id}_submitted`;
      if (!localStorage.getItem(storageKey)) {
        const botsOnTeam = gameState.players.filter(p => 
          (p.name.startsWith('Sir ') || p.name.startsWith('Lady ')) && 
          currentQuest.proposedTeam.includes(p.id)
        );
        
        if (botsOnTeam.length > 0) {
          const submitPromises = botsOnTeam.map(bot => {
             const card = bot.team === 'evil' ? 'fail' : 'success';
             return supabase.from('quest_cards').insert({
               quest_id: currentQuest.id,
               card
             });
          });
          Promise.all(submitPromises).catch(console.error);
        }
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [currentPlayer.isHost, isVotingOnQuest, currentQuest?.id, currentQuest?.proposedTeam, gameState.players]);

  // Auto-propose team if leader is a bot
  useEffect(() => {
    if (currentPlayer.isHost && isProposing && currentQuest?.id) {
      const leader = gameState.players.find(p => p.id === gameState.questLeaderId);
      if (leader && (leader.name.startsWith('Sir ') || leader.name.startsWith('Lady '))) {
        const storageKey = `bot_proposal_${currentQuest.id}_${currentQuest.proposalCount}`;
        if (!localStorage.getItem(storageKey)) {
          // Bots always pick themselves, then random other players
          const others = [...gameState.players].filter(p => p.id !== leader.id).sort(() => 0.5 - Math.random());
          const selectedTeam = [leader.id, ...others.slice(0, currentQuest.requiredPlayers - 1).map(p => p.id)];
          
          supabase.from('quests').update({ proposed_team: selectedTeam }).eq('id', currentQuest.id)
            .then(() => {
              localStorage.setItem(storageKey, 'true');
            }, console.error);
        }
      }
    }
  }, [currentPlayer.isHost, isProposing, gameState.questLeaderId, currentQuest?.id, currentQuest?.proposalCount, gameState.players, currentQuest?.requiredPlayers, supabase]);

  // Auto-reveal quest results if leader is a bot
  useEffect(() => {
    if (currentPlayer.isHost && isVotingOnQuest && allCardsSubmitted && currentQuest?.id) {
      const leader = gameState.players.find(p => p.id === gameState.questLeaderId);
      if (leader && (leader.name.startsWith('Sir ') || leader.name.startsWith('Lady '))) {
        const storageKey = `bot_reveal_quest_${currentQuest.id}`;
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, 'true');
          // Short delay so humans can see the UI says everyone is Ready
          setTimeout(() => {
            processQuestCards();
          }, 2500);
        }
      }
    }
  }, [currentPlayer.isHost, isVotingOnQuest, allCardsSubmitted, currentQuest?.id, gameState.questLeaderId, gameState.players]);

  // Auto-reveal team votes if leader is a bot
  useEffect(() => {
    if (currentPlayer.isHost && isVotingOnTeam && allVoted && currentQuest?.id) {
      const leader = gameState.players.find(p => p.id === gameState.questLeaderId);
      if (leader && (leader.name.startsWith('Sir ') || leader.name.startsWith('Lady '))) {
        const storageKey = `bot_reveal_votes_${currentQuest.id}_${currentQuest.proposalCount}`;
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, 'true');
          setTimeout(() => {
            processTeamVotes();
          }, 2500);
        }
      }
    }
  }, [currentPlayer.isHost, isVotingOnTeam, allVoted, currentQuest?.id, currentQuest?.proposalCount, gameState.questLeaderId, gameState.players]);

  const approves = votes.filter(v => v.vote === 'approve').length;
  const rejects = votes.filter(v => v.vote === 'reject').length;

  const processTeamVotes = async () => {
    setLoading(true);
    const isApproved = approves > rejects;

    if (isApproved) {
      await supabase.from('quests').update({ team_vote_result: 'approved' }).eq('id', currentQuest.id);
      await supabase.from('rooms').update({ rejection_count: 0 }).eq('id', roomId);
    } else {
      const newRejectionCount = gameState.rejectionCount + 1;
      if (newRejectionCount >= 5) {
        await supabase.from('quests').update({ team_vote_result: 'rejected' }).eq('id', currentQuest.id);
        await supabase.from('rooms').update({ status: 'ended', rejection_count: newRejectionCount }).eq('id', roomId);
      } else {
        const nextLeaderIndex = (gameState.players.findIndex(p => p.id === gameState.questLeaderId) + 1) % gameState.players.length;
        
        await supabase.from('quests').update({
          proposed_team: [],
          team_vote_result: null,
          proposal_count: currentQuest.proposalCount + 1
        }).eq('id', currentQuest.id);
        
        await supabase.from('votes').delete().eq('quest_id', currentQuest.id);
        
        await supabase.from('rooms').update({ 
          rejection_count: newRejectionCount,
          quest_leader_index: nextLeaderIndex 
        }).eq('id', roomId);
      }
    }
    setLoading(false);
  };

  const submitQuestCard = async (card: 'success' | 'fail') => {
    setLoading(true);
    const { error } = await supabase.from('quest_cards').insert({
      quest_id: currentQuest.id,
      card
    });
    if (error) {
      console.error(error);
      alert('Failed to submit card: ' + error.message);
    } else {
      setHasSubmittedCard(true);
      // Re-fetch immediately to bypass any realtime delay
      const { data } = await supabase.from('quest_cards').select('*').eq('quest_id', currentQuest.id);
      if (data) setQuestCards(data);
    }
    setLoading(false);
  };

  const processQuestCards = async () => {
    setLoading(true);
    
    // Shuffle the cards so anonymity is preserved
    const shuffled = [...questCards].sort(() => Math.random() - 0.5).map(c => c.card);
    
    const newSettings = {
      ...gameState.settings,
      shuffledQuestCards: shuffled,
      revealedCardsCount: 0
    };

    await supabase.from('rooms').update({ 
      status: 'quest_reveal',
      settings: newSettings
    }).eq('id', roomId);
    
    setLoading(false);
  };

  const myVote = votes.find(v => v.player_id === currentPlayer.id);

  // Deduce who has acted based on bot logic, local state, and total card count
  const actedPlayerIds = new Set<string>();
  const botsOnTeam = currentQuest.proposedTeam.filter(id => {
    const p = gameState.players.find(x => x.id === id);
    return p?.name.startsWith('Sir ') || p?.name.startsWith('Lady ');
  });
  
  // Bots act instantly
  botsOnTeam.forEach(id => actedPlayerIds.add(id));
  
  // Local human player
  if (hasSubmittedCard) {
    actedPlayerIds.add(currentPlayer.id);
  }

  // Any remaining cards must belong to other human players
  const remainingTeam = currentQuest.proposedTeam.filter(id => !actedPlayerIds.has(id));
  let unassignedCards = questCards.length - actedPlayerIds.size;
  while (unassignedCards > 0 && remainingTeam.length > 0) {
    actedPlayerIds.add(remainingTeam.pop()!);
    unassignedCards--;
  }

  return (
    <div className="min-h-screen bg-realm p-4 flex flex-col items-center">
      
      {/* Header */}
      <div className="text-center mt-6 mb-4">
        <h1 className="text-2xl font-bold text-text">
          Quest {currentQuest.questNumber}
        </h1>
        <p className="text-xs text-text-dim mt-2">
          Rejections: <span className="text-danger font-semibold">{gameState.rejectionCount}</span>/5
        </p>
      </div>

      {/* Quest Track */}
      <div className="flex gap-2 mb-6">
        {gameState.quests.map(q => {
          const isCurrent = q.questNumber === gameState.currentQuest;
          return (
            <div key={q.id} 
                 className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold`}
                 style={{
                   backgroundColor: q.questResult === 'pass' 
                     ? 'var(--color-success)' 
                     : q.questResult === 'fail' 
                       ? 'var(--color-danger)'
                       : isCurrent ? 'var(--color-text)' : 'var(--color-surface)',
                   color: (q.questResult || isCurrent) ? 'var(--color-surface)' : 'var(--color-text-dim)',
                   border: `1px solid ${q.questResult ? 'transparent' : isCurrent ? 'var(--color-text)' : 'var(--color-border)'}`
                 }}>
              {q.requiredPlayers}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-sm p-6 mt-2">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center bg-gray-50 border border-border px-4 py-2 rounded-full shadow-sm text-sm font-medium">
            <Crown className="w-4 h-4 text-info mr-2" /> 
            <span className="text-text-dim">Leader:</span> 
            <span className="text-info font-bold ml-1">{gameState.players.find(p => p.id === gameState.questLeaderId)?.name}</span>
          </div>
        </div>

        {isProposing && (
          <>
            <h2 className="text-lg font-bold text-center mb-1 text-text">
              {isLeader ? 'Propose Your Team' : 'Awaiting Leader Proposal'}
            </h2>
            <p className="text-sm text-center mb-4 text-text-dim">
              Select {currentQuest.requiredPlayers} player{currentQuest.requiredPlayers > 1 ? 's' : ''} for this quest
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              {gameState.players.map(p => (
                <button
                  key={p.id}
                  disabled={!isLeader}
                  onClick={() => togglePlayer(p.id)}
                  className={`p-3 rounded-md text-sm text-left border ${selectedPlayers.includes(p.id) ? 'bg-text text-surface border-text' : 'bg-surface text-text border-border'} ${isLeader ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
                >
                  {selectedPlayers.includes(p.id) && '✓ '}{p.name}
                  {p.id === gameState.questLeaderId && ' (Leader)'}
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
        )}

        {isVotingOnTeam && (
          <>
            <h2 className="text-lg font-bold text-center mb-4 text-text">
              Vote on Team
            </h2>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {currentQuest.proposedTeam.map(pid => {
                const player = gameState.players.find(p => p.id === pid);
                return (
                  <span key={pid} className="px-3 py-1 bg-gray-100 border border-border text-text rounded-full text-sm font-medium">
                    {player?.name}
                  </span>
                );
              })}
            </div>

            {!myVote ? (
              <div className="flex gap-4 justify-center">
                <Button onClick={() => submitVote('approve')} className="flex-1 bg-success hover:bg-green-700 text-white" disabled={loading}>
                  Approve
                </Button>
                <Button onClick={() => submitVote('reject')} variant="danger" className="flex-1" disabled={loading}>
                  Reject
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm mb-1 text-text">
                  You voted: <strong className={myVote.vote === 'approve' ? 'text-success' : 'text-danger'}>{myVote.vote === 'approve' ? 'Approve' : 'Reject'}</strong>
                </p>
                <p className="text-xs text-text-dim">
                  Waiting for others... ({votes.length}/{gameState.players.length})
                </p>
                {allVoted && (
                  <div className="my-4 border border-border rounded-lg bg-gray-50 flex w-full">
                    <div className="flex-1 text-center py-4 px-2 border-r border-border">
                      <p className="text-2xl font-bold text-success">{approves}</p>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold mb-3">Approve</p>
                      <div className="flex flex-col gap-1">
                        {votes.filter(v => v.vote === 'approve').map(v => {
                          const p = gameState.players.find(p => p.id === v.player_id);
                          return <span key={v.id} className="text-xs font-medium text-text">{p?.name}</span>;
                        })}
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center py-4 px-2">
                      <p className="text-2xl font-bold text-danger">{rejects}</p>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold mb-3">Reject</p>
                      <div className="flex flex-col gap-1">
                        {votes.filter(v => v.vote === 'reject').map(v => {
                          const p = gameState.players.find(p => p.id === v.player_id);
                          return <span key={v.id} className="text-xs font-medium text-text">{p?.name}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {isLeader && allVoted && (
                  <Button size="sm" onClick={processTeamVotes} disabled={loading} variant="primary" className="mt-2 w-full">
                    Reveal Votes & Proceed
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {isVotingOnQuest && (
          <>
            <h2 className="text-lg font-bold text-center mb-4 text-text">
              Quest Action
            </h2>
            <p className="text-sm text-center mb-6 text-text-dim">
              The team has departed. Choose the outcome.
            </p>

            {isOnProposedTeam && !hasSubmittedCard && (
              <div className="flex gap-4 w-full justify-center mb-8">
                <Button onClick={() => submitQuestCard('success')} className="flex-1 bg-success hover:bg-green-700 text-white" disabled={loading}>
                  Success
                </Button>
                <Button onClick={() => submitQuestCard('fail')} variant="danger" className="flex-1" disabled={loading}>
                  Fail
                </Button>
              </div>
            )}

            <div className="bg-gray-50 border border-border rounded-lg p-4 w-full">
              <p className="text-xs uppercase text-text-dim font-bold text-center mb-4">Quest Party</p>
              <div className="flex flex-col gap-3">
                {currentQuest.proposedTeam.map(pid => {
                  const p = gameState.players.find(x => x.id === pid);
                  const hasActed = actedPlayerIds.has(pid);
                  
                  return (
                    <div key={pid} className="flex justify-between items-center bg-surface border border-border p-3 rounded-md">
                      <span className="font-semibold text-sm text-text">{p?.name}</span>
                      {hasActed ? (
                        <span className="text-success flex items-center gap-1 text-sm font-bold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          Ready
                        </span>
                      ) : (
                        <span className="text-text-dim flex items-center gap-1 text-sm">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Deciding...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isLeader && allCardsSubmitted && (
              <div className="mt-6 text-center">
                <Button size="sm" onClick={processQuestCards} disabled={loading} variant="primary" className="w-full">
                  Reveal Quest Result
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
