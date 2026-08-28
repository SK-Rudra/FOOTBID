type ApiHealth = {
  status: 'ok';
  service: string;
  timestamp: string;
};

async function getApiHealth(): Promise<ApiHealth | null> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/api/v1/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiHealth;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiHealth();
  const connected = health?.status === 'ok';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050a14] px-6 text-white">
      <section className="w-full max-w-3xl rounded-3xl border border-cyan-400/20 bg-[#0b1424] p-8 shadow-2xl shadow-cyan-950/30 sm:p-12">
        <p className="mb-3 text-sm font-semibold tracking-[0.35em] text-cyan-400">FOOTBID</p>

        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">BID. BUILD. BATTLE.</h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
          The technical foundation for the competitive football auction game is now running.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                connected
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'bg-red-400 shadow-lg shadow-red-400/50'
              }`}
            />

            <span className="font-semibold">
              {connected ? 'Frontend connected to backend' : 'Backend unavailable'}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <p>
              API service:{' '}
              <span className="text-slate-200">{health?.service ?? 'Not connected'}</span>
            </p>

            <p>
              API status:{' '}
              <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
                {connected ? 'Operational' : 'Offline'}
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
