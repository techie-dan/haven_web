import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-32 text-center">
      <LogoMark className="h-12 w-auto text-ink" />
      <p className="eyebrow mt-8 text-muted">Error 404</p>
      <h1 className="mt-3 font-display text-[34px] font-light leading-tight text-ink">
        This room is empty.
      </h1>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
        The page you were looking for has been moved, retired, or never
        existed. The collection, however, is right where you left it.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/collections/all"
          className="eyebrow bg-ink px-8 py-4 text-white transition-colors hover:bg-terracotta"
        >
          Browse the collection
        </Link>
        <Link
          href="/"
          className="eyebrow border border-ink px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
