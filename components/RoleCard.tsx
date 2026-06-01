import { MyRole } from '@/types/avalon';
import { useState } from 'react';
import { Sparkles, Eye, Shield, Sword, VenetianMask, Skull, Flame, User, Swords } from 'lucide-react';

export default function RoleCard({ myRole }: { myRole: MyRole }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isGood = myRole.team === 'good';

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Merlin': return <Sparkles className="w-16 h-16" strokeWidth={1.5} />;
      case 'Percival': return <Eye className="w-16 h-16" strokeWidth={1.5} />;
      case 'Loyal Servant of Arthur': return <Shield className="w-16 h-16" strokeWidth={1.5} />;
      case 'Assassin': return <Sword className="w-16 h-16" strokeWidth={1.5} />;
      case 'Morgana': return <VenetianMask className="w-16 h-16" strokeWidth={1.5} />;
      case 'Mordred': return <Skull className="w-16 h-16" strokeWidth={1.5} />;
      case 'Minion of Mordred': return <Flame className="w-16 h-16" strokeWidth={1.5} />;
      case 'Oberon': return <User className="w-16 h-16" strokeWidth={1.5} />;
      default: return <Swords className="w-16 h-16" strokeWidth={1.5} />;
    }
  };

  return (
    <div className="relative w-full max-w-xs aspect-[3/4] cursor-pointer mx-auto"
         style={{ perspective: '1000px' }}
         onPointerDown={() => setIsFlipped(true)}
         onPointerUp={() => setIsFlipped(false)}
         onPointerLeave={() => setIsFlipped(false)}>
         
      {/* Inner Flip Container */}
      <div className="w-full h-full relative transition-transform duration-500 ease-out"
           style={{ 
             transformStyle: 'preserve-3d', 
             transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
           }}>
           
        {/* Front Face (Hidden when flipped) */}
        <div className="absolute inset-0 w-full h-full bg-surface border border-border rounded-xl shadow-sm flex flex-col items-center justify-center p-6 text-center select-none"
             style={{ backfaceVisibility: 'hidden' }}>
          <div className="text-5xl text-text-dim mb-4">A</div>
          <p className="text-sm font-bold text-text-dim uppercase tracking-widest">
            Hold to reveal
          </p>
        </div>

        {/* Back Face (Visible when flipped) */}
        <div className={`absolute inset-0 w-full h-full rounded-xl shadow-xl flex flex-col items-center justify-center p-6 text-center select-none ${isGood ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
             style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="mb-4 drop-shadow-lg flex items-center justify-center">
            {getRoleIcon(myRole.role)}
          </div>
          
          <h3 className="text-3xl font-bold mb-1 tracking-tight text-white drop-shadow-sm">
            {myRole.role}
          </h3>
          <p className="text-xs uppercase font-bold opacity-75 mb-6 tracking-wider">
            {isGood ? 'Good' : 'Evil'} Team
          </p>
          
          <div className="w-16 h-px bg-white/30 mb-6" />

          <p className="text-sm font-medium leading-snug drop-shadow-sm">
            {myRole.knowledgeText || (isGood ? 'You see nothing beyond your loyalty.' : 'You serve the darkness.')}
          </p>

          {myRole.seenPlayers && myRole.seenPlayers.length > 0 && (
            <div className="w-full text-left space-y-2 mt-6">
              <p className="text-xs uppercase opacity-75 font-bold text-center tracking-wider">Known Players</p>
              {myRole.seenPlayers.map(sp => (
                <div key={sp.playerId} className="bg-black/20 p-2 rounded-lg flex justify-between items-center backdrop-blur-sm border border-white/10">
                  <span className="font-semibold text-white text-sm">{sp.name}</span>
                  <span className={`text-xs uppercase font-bold ${sp.visibleAs === 'evil' ? 'text-red-300' : 'text-blue-300'}`}>
                    {sp.visibleAs}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
