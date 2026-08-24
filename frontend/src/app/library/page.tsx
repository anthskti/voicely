"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { GradeDisplay } from "@/components/GradeDisplay";
import { getUserSessions } from "@/lib/api";
import { Session } from "@/lib/types";
import { useSession, signOut } from "@/lib/auth-client";

export default function LibraryPage() {
  const { data: authSession, isPending, isResolved, error, refresh } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;

    if (!authSession?.user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserSessions()
      .then((data) => {
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setSessions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authSession?.user, isPending]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#262733] text-[#EDEFF1] relative scanline-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-[#93BADF]/15 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#708F7F]/30 bg-[#708F7F]/10 px-3 py-1 text-xs font-semibold text-[#708F7F] mb-3">
                MY PRACTICE LIBRARY
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                Recorded Takes & High Scores
              </h1>
              <p className="text-sm text-[#EDEFF1]/70 mt-1">
                Review your past session evaluations, AI grades, and pitch/cadence metrics.
              </p>
            </div>
            {authSession?.user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="lg:hidden self-start md:self-auto rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/20 transition-colors uppercase tracking-wider"
              >
                Log out
              </button>
            )}
          </div>

          {isPending || (authSession?.user && loading) ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-[#1d1e27] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="glass-card p-10 text-center rounded-3xl border border-rose-500/40 bg-rose-500/10 max-w-lg mx-auto my-12">
              <h3 className="font-display text-xl font-bold text-rose-200 mb-2">Couldn&apos;t verify session</h3>
              <p className="text-xs text-rose-300 mb-6">{error}</p>
              <button
                type="button"
                onClick={() => refresh()}
                className="inline-block rounded-xl bg-[#93BADF] px-6 py-2.5 text-sm font-bold text-[#262733] uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          ) : isResolved && !authSession?.user ? (
            <div className="glass-card p-10 text-center rounded-3xl border border-[#93BADF]/15 max-w-lg mx-auto my-12">
              <div className="h-16 w-16 mx-auto rounded-full bg-[#93BADF]/10 flex items-center justify-center text-[#93BADF] mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Log in to view your library</h3>
              <p className="text-xs text-[#EDEFF1]/70 mb-6">
                Save grades, download clips, and track your practice history across scenes.
              </p>
              <Link
                href="/login?redirect=/library"
                className="inline-block rounded-xl bg-[#93BADF] px-6 py-2.5 text-sm font-bold text-[#262733] shadow-md shadow-[#93BADF]/20 hover:bg-white transition-all uppercase tracking-wider"
              >
                Log In
              </Link>
            </div>
          ) : !Array.isArray(sessions) || sessions.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-3xl border border-[#93BADF]/15 max-w-lg mx-auto my-12">
              <div className="h-16 w-16 mx-auto rounded-full bg-[#93BADF]/10 flex items-center justify-center text-[#93BADF] mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">No Recorded Sessions Yet</h3>
              <p className="text-xs text-[#EDEFF1]/70 mb-6">
                Pick a scene from the carousel, complete a recording loop, and save your grade!
              </p>
              <Link
                href="/scenes"
                className="inline-block rounded-xl bg-[#93BADF] px-6 py-2.5 text-sm font-bold text-[#262733] shadow-md shadow-[#93BADF]/20 hover:bg-white transition-all uppercase tracking-wider"
              >
                Explore Scenes
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="glass-card flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#93BADF]/15 bg-[#1d1e27]/80 hover:border-[#93BADF]/40 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <GradeDisplay grade={sess.overall_grade} scoreRaw={sess.overall_score_raw} size="md" />
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-white truncate">
                        Scene: {sess.scene_id}
                      </h3>
                      <span className="text-[11px] text-[#EDEFF1]/50">
                        {new Date(sess.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col w-full gap-2 sm:flex-row sm:w-auto sm:shrink-0">
                    {sess.export_url && (
                      <a
                        href={sess.export_url}
                        download={`voicely-${sess.scene_id}.mp4`}
                        className="flex w-full sm:w-auto items-center justify-center rounded-xl bg-[#93BADF] px-4 py-2.5 text-xs font-bold text-[#262733] hover:bg-white transition-colors uppercase tracking-wider"
                      >
                        Download clip
                      </a>
                    )}
                    <Link
                      href={`/studio/${sess.scene_id}/prep`}
                      className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-[#93BADF]/30 bg-[#93BADF]/10 px-4 py-2.5 text-xs font-semibold text-[#93BADF] hover:bg-[#93BADF] hover:text-[#262733] transition-colors uppercase tracking-wider"
                    >
                      Practice Again
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
