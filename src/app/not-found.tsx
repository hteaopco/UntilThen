import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl font-extrabold text-navy/10 mb-4">404</div>
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-2">
          Page not found
        </h1>
        <p className="text-sm text-ink-mid leading-[1.6] mb-6">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          Go to your vault
        </Link>
      </div>
    </main>
  );
}
