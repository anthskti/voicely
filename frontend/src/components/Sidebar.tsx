"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  return (
    <aside className="w-full lg:w-64 bg-[#1a1b24]/90 border-b lg:border-b-0 lg:border-r border-[#93BADF]/15 backdrop-blur-xl flex flex-col justify-between p-6 shrink-0 z-20">
      <div>
        {/* Top Brand Tag */}
        <Link href="/" className="flex items-center gap-3 mb-10 group">
          <Image
            src="/voicely.png"
            alt="Voicely Logo"
            width={36}
            height={36}
            className="rounded-xl shadow-md shadow-[#93BADF]/20 group-hover:scale-105 transition-transform"
          />
          <span className="font-display text-xl font-bold tracking-wider text-white">
            VOICELY
          </span>
        </Link>

        {/* Menu Items */}
        <nav className="flex flex-col gap-2">
          <Link
            href="/scenes"
            className={`group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
              pathname.startsWith("/scenes")
                ? "bg-white/10 text-white font-bold"
                : "text-[#EDEFF1]/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#93BADF] transition-opacity ${
                pathname.startsWith("/scenes")
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            />
            <span className="text-[#93BADF] font-mono group-hover:scale-110 transition-transform">
              ▶
            </span>
            <span>Scenes</span>
          </Link>

          <Link
            href="/library"
            className={`group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
              pathname === "/library"
                ? "bg-white/10 text-white font-bold"
                : "text-[#EDEFF1]/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#708F7F] transition-opacity ${
                pathname === "/library"
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            />
            <svg
              className="w-4 h-4 text-[#708F7F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>My Library</span>
          </Link>

          {/* Divider */}
          <div className="my-3 border-t border-white/10" />

          <Link
            href="/#about"
            className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#EDEFF1]/60 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <span className="text-amber-400 font-mono text-xs">↓</span>
            <span>About Voicely</span>
          </Link>
        </nav>
      </div>

      {/* User Status at Side Panel Bottom */}
      <div className="mt-8 pt-4 border-t border-white/10">
        {isPending ? (
          <div className="h-6 w-24 animate-pulse rounded bg-white/5" />
        ) : session?.user ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {session.user.name || session.user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-[#708F7F]">Logged In</span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-[11px] text-rose-400 hover:underline"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-[#EDEFF1]/60">
            <span>Guest Actor</span>
            <Link href="/login" className="text-[#93BADF] font-bold hover:underline">
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
