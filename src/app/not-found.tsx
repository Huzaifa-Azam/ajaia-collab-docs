import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900">Document not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          It may have been deleted, or it hasn&apos;t been shared with the account you&apos;re signed in with.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/documents" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Back to documents
          </Link>
          <Link href="/login" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Switch account
          </Link>
        </div>
      </div>
    </main>
  );
}
