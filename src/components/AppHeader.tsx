import Link from "next/link";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export function AppHeader({ user }: { user: { name: string; email: string } }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/documents" aria-label="Ajaia Docs, all documents">
          <Logo />
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <div className="mr-2 hidden items-center gap-2 sm:flex" title={user.email}>
            <Avatar name={user.name} size="sm" />
            <span className="text-gray-700">{user.name}</span>
          </div>
          <Link href="/login" className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100">
            Switch account
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
