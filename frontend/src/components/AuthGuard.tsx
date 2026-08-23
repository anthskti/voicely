"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isPending, session?.user, pathname, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#262733] text-[#93BADF] font-mono text-sm">
        Checking session...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}
