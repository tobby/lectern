import Image from "next/image";
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar — same as landing page */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/logo.png" alt="Lectern" width={110} height={32} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6">
        <article className="py-16 prose-slate prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-900 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-slate-600 [&_p]:mb-4 [&_ul]:text-sm [&_ul]:text-slate-600 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_li]:leading-relaxed [&_a]:text-primary-600 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:text-primary-700">
          {children}
        </article>
      </div>

      {/* Footer — same as landing page */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Lectern. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
