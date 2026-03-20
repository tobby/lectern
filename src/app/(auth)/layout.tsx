"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Lectern" width={110} height={32} />
        </Link>
      </div>

      <div className="flex items-center justify-center px-4 pb-16 pt-4 sm:pt-8">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-8 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
