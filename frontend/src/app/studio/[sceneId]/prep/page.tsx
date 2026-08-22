"use client";

import { use, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getScene } from "@/lib/api";
import { Scene } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";

export default function PrepPage({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = use(params);
  const router = useRouter();

  const [scene, setScene] = useState<Scene | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Fetching scene details...");
  const [isReady, setIsReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getScene(sceneId)
      .then((data) => {
        setScene(data);
        setStatusText("Preloading S3 video & soundtrack...");
        setProgress(30);
      })
      .catch((err) => {
        setError(err.message || "Failed to load scene");
      });
  }, [sceneId]);

  useEffect(() => {
    if (!scene) return;

    let videoLoaded = false;
    let audioLoaded = false;

    const checkReady = () => {
      if (videoLoaded && audioLoaded) {
        setProgress(100);
        setStatusText("All media loaded! Studio ready.");
        setIsReady(true);
      }
    };

    const videoEl = videoRef.current;
    const audioEl = audioRef.current;

    if (videoEl) {
      videoEl.src = scene.video_url;
      videoEl.oncanplaythrough = () => {
        videoLoaded = true;
        setProgress((p) => Math.max(p, 65));
        checkReady();
      };
      videoEl.onerror = () => {
        // Soft fallback for video load error
        videoLoaded = true;
        checkReady();
      };
    }

    if (audioEl) {
      audioEl.src = scene.soundtrack_url;
      audioEl.oncanplaythrough = () => {
        audioLoaded = true;
        setProgress((p) => Math.max(p, 85));
        checkReady();
      };
      audioEl.onerror = () => {
        audioLoaded = true;
        checkReady();
      };
    }

    // Safety timeout in case canplaythrough event doesn't fire fast enough
    const timer = setTimeout(() => {
      setProgress(100);
      setStatusText("Studio ready!");
      setIsReady(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [scene]);

  const handleStart = () => {
    router.push(`/studio/${sceneId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#262733] px-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute w-[500px] h-[500px] bg-[#93BADF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden media elements for preloading */}
      <video ref={videoRef} preload="auto" muted className="hidden" />
      <audio ref={audioRef} preload="auto" className="hidden" />

      <div className="z-10 flex flex-col items-center text-center max-w-md w-full glass-card p-10 rounded-3xl border border-[#93BADF]/20 bg-[#1d1e27]/90 shadow-2xl">
        {/* Animated Logo */}
        <Image
          src="/voicely.png"
          alt="Voicely Logo"
          width={80}
          height={80}
          className="rounded-2xl shadow-xl shadow-[#93BADF]/30 animate-pulse mb-6"
        />

        <h1 className="font-display text-3xl font-extrabold text-white tracking-wider">
          VOICELY STUDIO
        </h1>
        <p className="text-xs text-[#93BADF] font-mono mt-1 mb-8">
          {scene ? scene.title : "Loading..."}
        </p>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
            {error}
          </div>
        ) : (
          <div className="w-full space-y-6">
            <ProgressBar progress={progress} statusText={statusText} />

            <button
              onClick={handleStart}
              disabled={!isReady}
              className={`w-full rounded-2xl py-4 text-base font-bold transition-all duration-300 shadow-xl ${
                isReady
                  ? "bg-[#93BADF] text-[#262733] shadow-[#93BADF]/30 hover:bg-white hover:scale-105"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {isReady ? "ENTER STUDIO & RECORD" : "PRELOADING ASSETS..."}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
