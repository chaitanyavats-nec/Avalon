import { useState } from 'react';
import { GameState, Player, MyRole } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function RoleReveal({ gameState, currentPlayer, roomCode, roomId, myRole }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string; myRole?: MyRole | null }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);

  // In a real implementation, the host would iterate through players. 
  // For simplicity, we just let each player see it once.

  if (!myRole) {
    return (
      <div className="min-h-screen bg-textured p-4 flex flex-col items-center justify-center text-parchment text-center">
        <h2 className="font-cinzel text-2xl text-parchment-dim mb-4">Close your eyes.</h2>
        <p>Waiting for the game master to wake you...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-textured p-4 flex flex-col items-center justify-center text-parchment">
      
      {!hasSeen ? (
        <div className="flex flex-col items-center space-y-8 max-w-sm w-full">
          <h2 className="font-cinzel text-3xl text-gold text-center">Your Role</h2>
          
          <div 
            className="relative w-64 h-96 cursor-pointer perspective"
            onPointerDown={() => setIsFlipped(true)}
            onPointerUp={() => setIsFlipped(false)}
            onPointerLeave={() => setIsFlipped(false)}
          >
            <div className={`w-full h-full transition-all duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
              
              {/* Card Back */}
              <div className="absolute inset-0 backface-hidden bg-bg-surface border-2 border-gold-dim rounded-xl flex items-center justify-center shadow-lg shadow-black/50">
                <div className="w-32 h-32 border-2 border-gold-dim rounded-full flex items-center justify-center rotate-45">
                  <div className="font-cinzel text-4xl text-gold-dim -rotate-45">A</div>
                </div>
                {!isFlipped && (
                  <p className="absolute bottom-6 text-sm text-parchment-dim uppercase tracking-wider animate-pulse">Hold to reveal</p>
                )}
              </div>

              {/* Card Front */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-bg-surface border-2 rounded-xl flex flex-col items-center p-6 shadow-xl shadow-black/50" style={{ borderColor: myRole.team === 'good' ? 'var(--color-gold)' : 'var(--color-crimson)' }}>
                <h3 className="font-cinzel text-2xl text-center mb-1" style={{ color: myRole.team === 'good' ? 'var(--color-gold)' : 'var(--color-crimson-bright)' }}>
                  {myRole.role}
                </h3>
                <p className="text-xs uppercase tracking-widest text-parchment-dim mb-6">
                  {myRole.team === 'good' ? 'Servant of Arthur' : 'Servant of Mordred'}
                </p>
                
                {/* Silhouette Placeholder */}
                <div className="flex-1 w-full border border-neutral/30 rounded flex items-center justify-center mb-6 bg-bg-deep/50">
                   {/* In a full implementation, the SVG components would go here based on myRole.role */}
                   <span className="text-neutral italic">Silhouette</span>
                </div>

                <div className="text-sm text-center min-h-[4rem] flex items-center justify-center text-parchment-dim">
                  {myRole.knowledgeText}
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setHasSeen(true)}
            variant="outline"
            className="w-full"
          >
            I've seen my role
          </Button>

        </div>
      ) : (
        <div className="text-center space-y-4">
          <h2 className="font-cinzel text-2xl text-parchment-dim">Waiting for others...</h2>
          <p className="text-sm text-neutral">Keep your eyes closed until instructed.</p>
        </div>
      )}

      {/* Host Controls */}
      {currentPlayer.isHost && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
           {/* In a real implementation we would advance phase when everyone is done */}
           <Button variant="outline" className="w-full max-w-sm" onClick={async () => {
             const supabase = createClient();
             await supabase.from('rooms').update({ status: 'quest' }).eq('id', roomId);
           }}>
             Everyone has seen their role (Start Quests)
           </Button>
        </div>
      )}
    </div>
  );
}
