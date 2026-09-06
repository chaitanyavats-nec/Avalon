import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-wallpaper flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center max-w-sm w-full">
        
        {/* Simple Icon */}
        <div className="w-16 h-16 rounded-lg bg-text text-surface flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-text mb-2">
            Avalon
          </h1>
          <p className="text-text-dim text-sm uppercase tracking-wider">
            Companion App
          </p>
        </div>

        <div className="scroll-panel w-full p-6 flex flex-col space-y-4">
          <Link href="/create" className="w-full">
            <button className="btn-primary w-full">
              Create Game
            </button>
          </Link>
          
          <Link href="/join" className="w-full">
            <button className="btn-ghost w-full border border-border">
              Join Game
            </button>
          </Link>
        </div>

      </div>
    </main>
  );
}
