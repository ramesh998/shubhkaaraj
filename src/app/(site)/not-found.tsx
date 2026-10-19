import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink">We could not find that page</h1>
      <p className="mt-4 text-lg text-muted">It may have moved or been taken down. Our portfolio is a good place to start.</p>
      <Link href="/portfolio" className="mt-8 inline-block rounded-full bg-brand px-7 py-3.5 font-semibold text-white hover:bg-brand-strong">
        See our work
      </Link>
    </div>
  );
}
