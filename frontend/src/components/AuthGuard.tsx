"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error, isResolved, refresh } = useSession();

  useEffect(() => {
    if (!isPending && isResolved && !error && !session?.user) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isPending, isResolved, error, session?.user, pathname, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#262733] text-[#93BADF] font-mono text-sm">
        Checking session...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#262733] px-4">
        <div className="glass-card max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
          <h2 className="font-display text-lg font-bold text-rose-200">Couldn&apos;t verify session</h2>
          <p className="mt-2 text-xs text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-6 rounded-xl bg-[#93BADF] px-5 py-2.5 text-xs font-bold text-[#262733] uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}
