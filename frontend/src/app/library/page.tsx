"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { GradeDisplay } from "@/components/GradeDisplay";
import { getUserSessions } from "@/lib/api";
import { Session } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

export default function LibraryPage() {
  const { data: authSession, isPending } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authSession?.user?.id) {
      getUserSessions(authSession.user.id).then((data) => {
        setSessions(Array.isArray(data) ? data : []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [authSession?.user?.id]);

  return (
    <div className="flex min-h-screen bg-[#262733] text-[#EDEFF1] relative scanline-bg">
      {/* LEFT SIDEBAR PANEL */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
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
          </div>

          {isPending || loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-[#1d1e27] animate-pulse" />
              ))}
            </div>
          ) : !authSession?.user ? (
            <div className="glass-card p-12 text-center rounded-3xl border border-[#93BADF]/20 max-w-md mx-auto my-12">
              <h3 className="font-display text-2xl font-bold text-white mb-2">Log In to View Library</h3>
              <p className="text-xs text-[#EDEFF1]/70 mb-6">
                Track your voice acting improvements and save your session scorecards.
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
                  className="glass-card flex items-center justify-between p-6 rounded-2xl border border-[#93BADF]/15 bg-[#1d1e27]/80 hover:border-[#93BADF]/40 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <GradeDisplay grade={sess.overall_grade} scoreRaw={sess.overall_score_raw} size="md" />
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        Scene: {sess.scene_id}
                      </h3>
                      {/* debugging scene id */}
                      {/* <p className="text-xs text-[#93BADF] font-mono mt-0.5">
                        Session ID: {sess.id}
                      </p> */}
                      <span className="text-[11px] text-[#EDEFF1]/50">
                        {new Date(sess.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {sess.export_url && (
                      <a
                        href={sess.export_url}
                        download={`voicely-${sess.scene_id}.mp4`}
                        className="rounded-xl bg-[#93BADF] px-4 py-2 text-xs font-bold text-[#262733] hover:bg-white transition-colors uppercase tracking-wider"
                      >
                        Download clip
                      </a>
                    )}
                    <Link
                      href={`/studio/${sess.scene_id}/prep`}
                      className="rounded-xl border border-[#93BADF]/30 bg-[#93BADF]/10 px-4 py-2 text-xs font-semibold text-[#93BADF] hover:bg-[#93BADF] hover:text-[#262733] transition-colors uppercase tracking-wider"
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
