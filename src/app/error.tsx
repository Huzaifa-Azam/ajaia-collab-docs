"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page couldn&apos;t be loaded. Try again in a moment. If you&apos;re running the app locally, check that
          DATABASE_URL and SESSION_SECRET are set (see the README).
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
          {/* Deliberately a full page load, not client-side navigation: after an error it resets any broken client state. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/documents" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Go to documents
          </a>
        </div>
      </div>
    </main>
  );
}
