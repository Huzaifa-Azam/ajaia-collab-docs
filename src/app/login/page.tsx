import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/users";

export const metadata = { title: "Sign in · Ajaia Docs" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, current, users] = await Promise.all([searchParams, getCurrentUser(), listUsers()]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center text-xl">
          <Logo />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Choose a demo account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign-in is simulated for this demo, so there are no passwords. To try sharing from both sides, use a
            private window to sign in as a second person.
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              That account doesn&apos;t exist. Pick one of the accounts below.
            </p>
          )}

          {users.length === 0 ? (
            <p className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No demo accounts found. Run <code className="font-mono">npm run db:seed</code> to create them.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {users.map((user) => (
                <li key={user.id}>
                  <form action="/api/auth/login" method="post">
                    <input type="hidden" name="email" value={user.email} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
                    >
                      <Avatar name={user.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{user.name}</span>
                        <span className="block truncate text-sm text-gray-500">{user.email}</span>
                      </span>
                      <span className="text-sm font-medium text-blue-700">
                        {current?.id === user.id ? "Signed in" : "Continue →"}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
