"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { GradeDisplay } from "@/components/GradeDisplay";
import { getScene, submitSessionForGrading, saveSession, startExport, getExport } from "@/lib/api";
import { Scene, GradeResponse } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

export default function ResultsPage({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = use(params);
  const router = useRouter();
  const { data: authSession } = useSession();

  const [scene, setScene] = useState<Scene | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);
  const [exportUrl, setExportUrl] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "processing" | "ready" | "failed">("idle");
  const [exportError, setExportError] = useState("");
  const [exportNonce, setExportNonce] = useState(0);

  useEffect(() => {
    async function evaluateTakes() {
      try {
        const sceneData = await getScene(sceneId);
        setScene(sceneData);

        // Retrieve recorded blob Data URLs from sessionStorage
        const stored = sessionStorage.getItem(`voicely_session_${sceneId}`);
        if (!stored) {
          throw new Error("No recorded takes found in session. Please record first.");
        }

        const dataUrls: string[] = JSON.parse(stored);
        const blobs = await Promise.all(
          dataUrls.map(async (dataUrl) => {
            const res = await fetch(dataUrl);
            return res.blob();
          })
        );
        setRecordedBlobs(blobs);

        const userId = authSession?.user?.id || "guest_user_proto";

        // Submit to Go backend grading endpoint
        const gradeRes = await submitSessionForGrading(
          sceneId,
          userId,
          sceneData.chunks.map((c) => ({
            transcript: c.transcript,
            reference_audio_url: c.reference_audio_url,
          })),
          blobs
        );

        setGradeResult(gradeRes);
      } catch (err: unknown) {
        console.error("Grading error:", err);
        const msg = err instanceof Error ? err.message : "Failed to grade session.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    evaluateTakes();
  }, [sceneId, authSession?.user?.id]);

  const handleSaveSession = async () => {
    if (!gradeResult || saving) return;
    setSaving(true);
    try {
      await saveSession({
        user_id: authSession?.user?.id || "guest_user_proto",
        scene_id: sceneId,
        overall_grade: gradeResult.overall_grade,
        overall_score_raw: gradeResult.overall_score_raw,
        export_url: exportUrl || undefined,
      });
      setSaved(true);
    } catch (err) {
      console.warn("Failed to save session:", err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!gradeResult || recordedBlobs.length === 0) return;

    let cancelled = false;
    const userId = authSession?.user?.id || "guest_user_proto";
    const takes = recordedBlobs;

    async function muxClip() {
      setExportStatus("processing");
      setExportError("");
      try {
        const started = await startExport(sceneId, userId, takes);
        const deadline = Date.now() + 180_000;
        while (!cancelled && Date.now() < deadline) {
          const job = await getExport(started.export_id);
          if (job.status === "ready" && job.export_url) {
            setExportUrl(job.export_url);
            setExportStatus("ready");
            return;
          }
          if (job.status === "failed") {
            throw new Error(job.error || "Export failed");
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!cancelled) {
          throw new Error("Export timed out. Retry the page.");
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Export failed";
        setExportError(msg);
        setExportStatus("failed");
      }
    }

    muxClip();
    return () => {
      cancelled = true;
    };
  }, [gradeResult, recordedBlobs, sceneId, authSession?.user?.id, exportNonce]);

  const handleDownloadClip = async () => {
    if (!exportUrl) return;
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `voicely-${sceneId}.mp4`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.warn("Blob download failed, opening S3 URL:", err);
      window.open(exportUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#262733] text-[#EDEFF1] relative scanline-bg">
      {/* LEFT SIDEBAR PANEL */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#93BADF] border-t-transparent mb-6" />
              <h2 className="font-display text-2xl font-bold text-white">EVALUATING YOUR VOICE TAKES</h2>
              <p className="text-xs text-[#93BADF] font-mono mt-2 animate-pulse">
                Running Librosa pitch/cadence analysis & Resemblyzer timbre embedding...
              </p>
            </div>
          ) : error ? (
            <div className="glass-card p-10 text-center rounded-3xl border border-rose-500/40 bg-rose-500/10 max-w-lg mx-auto my-12">
              <h2 className="font-display text-2xl font-bold text-rose-200">Grading System Note</h2>
              <p className="text-xs text-rose-300 mt-3 leading-relaxed">{error}</p>
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-xl bg-[#93BADF] px-5 py-2.5 text-xs font-bold text-[#262733]"
                >
                  Retry Grading
                </button>
                <Link
                  href={`/studio/${sceneId}`}
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Back to Studio
                </Link>
              </div>
            </div>
          ) : gradeResult ? (
            <div className="space-y-8">
              
              {/* 1. Merged scene video */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[#93BADF]/25 bg-[#1d1e27]/90 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#93BADF]">
                      Final Dubbed Performance
                    </span>
                    <h2 className="font-display text-xl font-bold text-white mt-0.5">
                      Scene Render Preview
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {exportStatus === "ready" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#708F7F]/40 bg-[#708F7F]/10 px-3 py-1 text-[11px] font-semibold text-[#708F7F]">
                        <span className="h-2 w-2 rounded-full bg-[#708F7F]" />
                        Ready
                      </span>
                    ) : exportStatus === "failed" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
                        Export failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        Muxing video
                      </span>
                    )}
                    {exportStatus === "ready" && exportUrl ? (
                      <button
                        onClick={handleDownloadClip}
                        className="rounded-xl bg-[#93BADF] px-4 py-2 text-xs font-bold text-[#262733] hover:bg-white transition-colors"
                      >
                        Save Video ↓
                      </button>
                    ) : (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/40"
                      >
                        Save Video ↓
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#161720] flex flex-col items-center justify-center text-center shadow-inner">
                  {exportStatus === "ready" && exportUrl ? (
                    <video
                      src={exportUrl}
                      controls
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      {scene?.video_url && (
                        <video
                          src={scene.video_url}
                          muted
                          playsInline
                          className="absolute inset-0 h-full w-full object-cover opacity-30"
                        />
                      )}
                      <div className="relative z-10 max-w-md flex flex-col items-center gap-2 p-6">
                        {exportStatus === "failed" ? (
                          <>
                            <span className="font-display text-lg font-bold text-white">Could not mux clip</span>
                            <p className="text-xs text-rose-300 leading-relaxed">{exportError}</p>
                            <button
                              onClick={() => {
                                setExportStatus("idle");
                                setExportNonce((n) => n + 1);
                              }}
                              className="mt-2 rounded-xl bg-[#93BADF] px-4 py-2 text-xs font-bold text-[#262733]"
                            >
                              Retry export
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#93BADF] border-t-transparent mb-1" />
                            <span className="font-display text-lg font-bold text-white">
                              Stitching your takes
                            </span>
                            <p className="text-xs text-[#EDEFF1]/70 leading-relaxed">
                              Muting the scene video, laying the soundtrack, and placing each line on the timeline.
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Header Scorecard Card */}
              <div className="glass-card p-8 sm:p-10 rounded-3xl border border-[#93BADF]/25 bg-[#1d1e27]/90 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <GradeDisplay
                    grade={gradeResult.overall_grade}
                    scoreRaw={gradeResult.overall_score_raw}
                    size="xl"
                  />
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#93BADF]">
                      Session Complete
                    </span>
                    <h1 className="font-display text-3xl font-extrabold text-white mt-1">
                      {scene?.title || sceneId}
                    </h1>
                    <p className="text-xs text-[#EDEFF1]/70 mt-1">
                      Session ID: {gradeResult.session_id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveSession}
                    disabled={saving || saved}
                    className={`rounded-xl px-5 py-3 text-xs font-bold transition-all shadow-md ${
                      saved
                        ? "bg-[#708F7F] text-[#262733]"
                        : "bg-[#93BADF] text-[#262733] hover:bg-white hover:scale-105"
                    }`}
                  >
                    {saved ? "✓ SESSION SAVED" : saving ? "SAVING..." : "SAVE SESSION"}
                  </button>
                  <Link
                    href={`/studio/${sceneId}/prep`}
                    className="rounded-xl border border-[#93BADF]/30 bg-[#93BADF]/10 px-5 py-3 text-xs font-bold text-[#93BADF] hover:bg-[#93BADF] hover:text-[#262733] transition-colors uppercase tracking-wider"
                  >
                    TRY AGAIN
                  </Link>
                  <Link
                    href="/scenes"
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-[#EDEFF1]/80 hover:bg-white/10 uppercase tracking-wider"
                  >
                    CAROUSEL
                  </Link>
                </div>
              </div>

              {/* 3. Pros & Cons Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pros */}
                <div className="glass-card p-6 rounded-2xl border border-[#708F7F]/30 bg-[#1d1e27]/80">
                  <h3 className="font-display text-lg font-bold text-[#708F7F] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Strengths & Highlights
                  </h3>
                  <ul className="space-y-2 text-xs text-[#EDEFF1]/90">
                    {gradeResult.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#708F7F] font-bold">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div className="glass-card p-6 rounded-2xl border border-rose-500/30 bg-[#1d1e27]/80">
                  <h3 className="font-display text-lg font-bold text-rose-300 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2 text-xs text-[#EDEFF1]/90">
                    {gradeResult.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. Line Breakdown Table */}
              <div className="glass-card p-8 rounded-3xl border border-[#93BADF]/20 bg-[#1d1e27]/80 overflow-x-auto">
                <h3 className="font-display text-xl font-bold text-white mb-6">
                  Line-by-Line Metric Breakdown
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#93BADF]/15 font-mono uppercase tracking-wider text-[#93BADF]">
                      <th className="pb-3 px-2">Line</th>
                      <th className="pb-3 px-2">Grade</th>
                      <th className="pb-3 px-2">Pitch</th>
                      <th className="pb-3 px-2">Cadence</th>
                      <th className="pb-3 px-2">Timbre</th>
                      <th className="pb-3 px-2">AI Feedback Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gradeResult.chunk_breakdowns.map((cb) => (
                      <tr key={cb.chunk_index} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-2 font-mono font-semibold text-white">
                          Line {cb.chunk_index + 1}
                        </td>
                        <td className="py-4 px-2">
                          <GradeDisplay grade={cb.grade} size="sm" />
                        </td>
                        <td className="py-4 px-2 font-mono text-[#93BADF]">
                          {(cb.pitch * 100).toFixed(0)}%
                        </td>
                        <td className="py-4 px-2 font-mono text-[#708F7F]">
                          {(cb.cadence * 100).toFixed(0)}%
                        </td>
                        <td className="py-4 px-2 font-mono text-purple-300">
                          {(cb.timbre * 100).toFixed(0)}%
                        </td>
                        <td className="py-4 px-2 text-[#EDEFF1]/80 max-w-xs">
                          {cb.notes || "Solid line delivery!"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </main>

        <Footer />
      </div>
    </div>
  );
}
