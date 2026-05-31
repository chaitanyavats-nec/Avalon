import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-textured p-4">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="font-cinzel text-5xl md:text-7xl tracking-wider text-parchment text-center drop-shadow-lg">
          AVALON
        </h1>
        
        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <Link 
            href="/create"
            className="w-full py-4 px-6 rounded border border-gold-dim text-gold text-center font-medium transition-all hover:border-gold hover:text-parchment hover:shadow-glow-gold bg-bg-surface bg-opacity-50 backdrop-blur-sm"
          >
            Create game
          </Link>
          <Link 
            href="/join"
            className="w-full py-4 px-6 rounded border border-neutral text-parchment-dim text-center font-medium transition-all hover:border-parchment hover:text-parchment hover:shadow-glow-gold bg-bg-surface bg-opacity-50 backdrop-blur-sm"
          >
            Join game
          </Link>
        </div>
      </div>
    </main>
  );
}
