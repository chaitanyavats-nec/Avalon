import { useState } from 'react';
import { GameState, Player, MyRole } from '@/types/avalon';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import RoleCard from '@/components/RoleCard';
import { Moon, Lock } from 'lucide-react';

export default function RoleReveal({ gameState, currentPlayer, roomCode, roomId, myRole }: { gameState: GameState; currentPlayer: Player; roomCode: string; roomId: string; myRole?: MyRole | null }) {
  const [hasSeen, setHasSeen] = useState(false);

  if (!myRole) {
    return (
      <div className="min-h-screen bg-realm p-4 flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center animate-fadeIn">
          <Moon className="w-14 h-14 mb-4 text-text-dim animate-float" />
          <h2 className="text-2xl font-bold text-text mb-2">Close your eyes.</h2>
          <p className="text-text-dim text-sm">Waiting for the game master...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 flex flex-col items-center justify-center ${currentPlayer.isHost ? 'pb-28' : ''} ${!hasSeen ? 'bg-black' : 'bg-realm'}`}>
      
      {!hasSeen ? (
        <div className="flex flex-col items-center space-y-6 max-w-sm md:max-w-md w-full animate-slideUpFromBottom">
          <div className="text-center mb-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Your Role
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Hold the card to reveal your identity</p>
          </div>
          
          <RoleCard myRole={myRole} theme="dark" />

          <Button 
            onClick={() => setHasSeen(true)}
            variant="ghost"
            className="w-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            I have seen my role
          </Button>
        </div>

      ) : (
        <div className="text-center space-y-4 flex flex-col items-center animate-fadeIn">
          <Lock className="w-14 h-14 mb-2 text-text-dim animate-breathe" />
          <h2 className="text-2xl font-bold text-text">Your secret is safe.</h2>
          <p className="text-sm text-text-dim">Waiting for everyone...</p>
        </div>
      )}

      {/* Host Controls */}
      {currentPlayer.isHost && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4" style={{ zIndex: 10 }}>
          <Button variant="primary" className="w-full max-w-sm" onClick={async () => {
            const supabase = createClient();
            await supabase.from('rooms').update({ status: 'quest' }).eq('id', roomId);
          }}>
            Begin Quests
          </Button>
        </div>
      )}
    </div>
  );
}
