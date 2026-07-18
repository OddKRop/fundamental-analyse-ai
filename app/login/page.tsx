interface Props {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect, error } = await searchParams;
  const redirectTo = redirect && redirect.startsWith("/") ? redirect : "/";

  return (
    <div className="max-w-sm mx-auto py-20">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Logg inn</h1>
      <p className="text-zinc-500 mb-8 text-sm">Dette er et privat verktøy. Skriv inn passordet for å fortsette.</p>

      <form action="/api/login" method="POST" className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />
        <input
          type="password"
          name="password"
          placeholder="Passord"
          autoFocus
          required
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        {error && <p className="text-sm text-red-500">Feil passord. Prøv igjen.</p>}
        <button
          type="submit"
          className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 font-medium hover:bg-zinc-700 transition-colors"
        >
          Logg inn
        </button>
      </form>
    </div>
  );
}
