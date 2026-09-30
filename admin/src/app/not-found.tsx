import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-900 p-6 text-center text-white">
      <div>
        <p className="font-mono text-sm text-royal-300">404</p>
        <h1 className="mt-2 text-2xl font-semibold">That page isn&rsquo;t part of the admin.</h1>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-royal-600 px-4 py-2 text-sm font-semibold hover:bg-royal-500">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
