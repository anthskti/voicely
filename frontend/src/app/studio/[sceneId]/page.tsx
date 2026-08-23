"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getScene } from "@/lib/api";
import { Scene, Chunk } from "@/lib/types";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { sessionAudioKey } from "@/lib/session-audio";

type StudioState = "idle" | "playing_ref" | "countdown" | "recording" | "playing_take";

export default function StudioPage({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = use(params);
  const router = useRouter();

  const [scene, setScene] = useState<Scene | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);

  // Studio Pipeline State Machine
  const [studioState, setStudioState] = useState<StudioState>("idle");
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [waveformProgress, setWaveformProgress] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const takeAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animProgressRef = useRef<number>(0);

  // Fetch scene payload
  useEffect(() => {
    getScene(sceneId)
      .then((data) => setScene(data))
      .catch((err) => setError(err.message || "Failed to load scene"));
  }, [sceneId]);

  const currentChunk: Chunk | undefined = scene?.chunks[currentChunkIndex];
  const chunkDuration = currentChunk
    ? Math.max(0.5, currentChunk.end_time_sec - currentChunk.start_time_sec)
    : 3;

  // Initialize Mic Stream
  useEffect(() => {
    let mounted = true;
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (mounted) setMediaStream(stream);
      } catch (err) {
        console.warn("Microphone access denied:", err);
        setError("Microphone access is required to record voice-over takes.");
      }
    }
    initMic();
    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      cancelAnimationFrame(animProgressRef.current);
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [mediaStream]);

  // 1. Function to Play Reference (Video with embedded audio for chunk window)
  const playReferenceChunk = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentChunk) return;

    // Stop any take playback
    if (takeAudioRef.current) {
      takeAudioRef.current.pause();
      takeAudioRef.current.currentTime = 0;
    }

    setStudioState("playing_ref");
    setWaveformProgress(0);

    video.muted = false; // Use embedded video audio
    video.currentTime = currentChunk.start_time_sec;

    video.play().catch((e) => {
      console.warn("Auto-play was prevented by browser policy, user can click Listen button:", e);
      setStudioState("idle");
    });
  }, [currentChunk]);

  // Track Video Timeupdate to time-gate the chunk window & animate playhead
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !currentChunk) return;

    if (studioState === "playing_ref") {
      const elapsed = video.currentTime - currentChunk.start_time_sec;
      const progress = Math.max(0, Math.min(1, elapsed / chunkDuration));
      setWaveformProgress(progress);

      if (video.currentTime >= currentChunk.end_time_sec - 0.05) {
        video.pause();
        video.currentTime = currentChunk.start_time_sec;
        setWaveformProgress(1);
        setStudioState("idle");
      }
    }
  };

  // Auto-play chunk when current chunk index changes
  useEffect(() => {
    if (!currentChunk || !videoRef.current) return;
    setWaveformProgress(0);
    // Slight delay to ensure video element is loaded and seeked
    const timer = setTimeout(() => {
      playReferenceChunk();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentChunkIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Start Countdown & Recording Flow
  const handleStartCountdown = () => {
    if (!mediaStream) {
      setError("No microphone available. Please enable mic access.");
      return;
    }

    // Stop video & audio
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      videoRef.current.currentTime = currentChunk?.start_time_sec || 0;
    }
    if (takeAudioRef.current) {
      takeAudioRef.current.pause();
    }

    setStudioState("countdown");
    setCountdownValue(3);
    setWaveformProgress(0);

    let count = 3;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdownValue(null);
        startActualRecording();
      }
    }, 1000);
  };

  // 3. Start Recording Take
  const startActualRecording = () => {
    if (!mediaStream || !currentChunk) return;

    recordedChunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlobs((prev) => {
          const next = [...prev];
          next[currentChunkIndex] = blob;
          return next;
        });
        setStudioState("idle");
      };

      recorder.start(50);
      setStudioState("recording");

      // Play video muted during recording take
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.currentTime = currentChunk.start_time_sec;
        videoRef.current.play().catch(() => {});
      }

      // Track progress during take
      const startTime = performance.now();
      const durationMs = chunkDuration * 1000;

      const trackProgress = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1, elapsed / durationMs);
        setWaveformProgress(p);
        if (p < 1) {
          animProgressRef.current = requestAnimationFrame(trackProgress);
        }
      };
      animProgressRef.current = requestAnimationFrame(trackProgress);

      // Auto-stop at exact chunk duration
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = setTimeout(() => {
        stopActualRecording();
      }, durationMs);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setError("Recording failed. Check microphone permissions.");
      setStudioState("idle");
    }
  };

  // 4. Stop Recording
  const stopActualRecording = () => {
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    cancelAnimationFrame(animProgressRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // 5. In-Scene Take Playback
  const handlePlayTake = () => {
    const blob = recordedBlobs[currentChunkIndex];
    if (!blob) return;

    const audioUrl = URL.createObjectURL(blob);
    if (!takeAudioRef.current) {
      takeAudioRef.current = new Audio(audioUrl);
    } else {
      takeAudioRef.current.src = audioUrl;
    }

    const audio = takeAudioRef.current;
    audio.currentTime = 0;
    setStudioState("playing_take");
    setWaveformProgress(0);

    audio.play().catch(() => setStudioState("idle"));

    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setWaveformProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setWaveformProgress(1);
      setStudioState("idle");
    };
  };

  // 6. Next Line or Finish
  const handleNextLine = async () => {
    if (!scene) return;

    // Pause all audio/video before switching
    if (videoRef.current) videoRef.current.pause();
    if (takeAudioRef.current) takeAudioRef.current.pause();

    if (currentChunkIndex < scene.chunks.length - 1) {
      setCurrentChunkIndex((prev) => prev + 1);
    } else {
      // Finished all chunks! Package blobs and navigate to results
      try {
        const blobDataUrls = await Promise.all(
          recordedBlobs.map(
            (blob) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              })
          )
        );

        sessionStorage.setItem(sessionAudioKey(sceneId), JSON.stringify(blobDataUrls));
        router.push(`/studio/${sceneId}/results`);
      } catch (err) {
        console.error("Failed to package recorded takes:", err);
        setError("Error saving takes. Please retry.");
      }
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#262733] p-4 text-center">
        <div className="glass-card p-8 rounded-2xl max-w-md border border-rose-500/40 bg-rose-500/10">
          <h2 className="font-display text-xl font-bold text-rose-200">Studio Error</h2>
          <p className="text-xs text-rose-300 mt-2">{error}</p>
          <button
            onClick={() => router.push("/scenes")}
            className="mt-6 rounded-xl bg-[#93BADF] px-4 py-2 text-xs font-bold text-[#262733]"
          >
            Back to Scenes
          </button>
        </div>
      </div>
    );
  }

  if (!scene || !currentChunk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#262733]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#93BADF] border-t-transparent" />
      </div>
    );
  }

  const hasRecordedTake = Boolean(recordedBlobs[currentChunkIndex]);

  return (
    <div className="flex min-h-screen flex-col bg-[#262733] text-[#EDEFF1]">
      {/* Header bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#93BADF]/15 bg-[#1d1e27] px-6">
        <div className="flex items-center gap-3">
          <span className="font-display font-extrabold text-[#93BADF]">VOICELY STUDIO</span>
          <span className="text-xs text-[#EDEFF1]/50">•</span>
          <span className="text-xs font-semibold text-[#EDEFF1]/80">{scene.title}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="rounded-full bg-[#93BADF]/15 px-3 py-1 text-[#93BADF]">
            Line {currentChunkIndex + 1} of {scene.chunks.length}
          </span>
          <button
            onClick={() => router.push("/scenes")}
            className="text-xs text-[#EDEFF1]/60 hover:text-white"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main Studio layout */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Player Canvas & Transcript */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#93BADF]/20 bg-[#1d1e27] shadow-2xl">
            <video
              ref={videoRef}
              src={scene.video_url}
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              className="h-full w-full object-cover"
            />

            {/* Countdown Overlay on Video */}
            {studioState === "countdown" && countdownValue !== null && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="font-display text-8xl font-black text-white glow-title animate-bounce">
                  {countdownValue}
                </div>
              </div>
            )}

            {/* Recording Banner */}
            {studioState === "recording" && (
              <div className="absolute top-3 right-3 flex items-center gap-2 rounded-xl bg-[#e63946]/90 backdrop-blur-md px-3 py-1.5 text-xs font-mono font-bold text-white shadow-lg shadow-[#e63946]/40 animate-pulse">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                RECORDING TAKE...
              </div>
            )}

            {/* Timestamp Badge */}
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-[#93BADF]">
              Chunk: {currentChunk.start_time_sec.toFixed(1)}s – {currentChunk.end_time_sec.toFixed(1)}s ({chunkDuration.toFixed(1)}s)
            </div>
          </div>

          {/* Target Transcript Box */}
          <div className="glass-card p-6 rounded-2xl border border-[#93BADF]/20 bg-[#1d1e27]/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#93BADF]">
              Target Transcript
            </span>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-white leading-relaxed">
              &ldquo;{currentChunk.transcript}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Static Waveform Visualizer & Action Controls */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Static Waveform Visualizer */}
          <div className="glass-card p-5 rounded-2xl border border-[#93BADF]/15 bg-[#1d1e27]/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#93BADF] uppercase tracking-wider">
                {studioState === "recording"
                  ? "Live Voice Overlay"
                  : studioState === "playing_take"
                  ? "Your Take Playback"
                  : studioState === "playing_ref"
                  ? "Reference Audio Playback"
                  : "Static Audio Waveform"}
              </span>

              {hasRecordedTake && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#708F7F]/20 px-2.5 py-0.5 text-[10px] font-semibold text-[#708F7F]">
                  ✓ Take Saved
                </span>
              )}
            </div>

            <WaveformVisualizer
              audioUrl={currentChunk.reference_audio_url}
              progress={waveformProgress}
              isRecording={studioState === "recording"}
              stream={mediaStream}
              mode={studioState === "playing_take" ? "take" : "reference"}
            />
          </div>

          {/* Reference Audio / Take Playback Action Bar */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={playReferenceChunk}
              disabled={studioState === "recording" || studioState === "countdown"}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#93BADF]/30 bg-[#93BADF]/10 py-3 text-xs font-bold text-[#93BADF] hover:bg-[#93BADF] hover:text-[#262733] transition-all disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {studioState === "playing_ref" ? "PLAYING..." : "HEAR REFERENCE"}
            </button>

            <button
              onClick={handlePlayTake}
              disabled={!hasRecordedTake || studioState === "recording" || studioState === "countdown"}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#708F7F]/40 bg-[#708F7F]/15 py-3 text-xs font-bold text-[#708F7F] hover:bg-[#708F7F] hover:text-[#262733] transition-all disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              {studioState === "playing_take" ? "PLAYING TAKE..." : "PLAY MY TAKE"}
            </button>
          </div>

          {/* Record CTA Button */}
          <div>
            {studioState === "recording" ? (
              <button
                onClick={stopActualRecording}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#708F7F] py-4 text-sm font-bold text-[#262733] shadow-lg shadow-[#708F7F]/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
              >
                <span className="h-3 w-3 rounded-sm bg-[#262733]" />
                STOP TAKE EARLY
              </button>
            ) : (
              <button
                onClick={handleStartCountdown}
                disabled={studioState === "countdown"}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e63946] py-4 text-sm font-bold text-white shadow-lg shadow-[#e63946]/30 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                <span className="h-3 w-3 rounded-full bg-white animate-pulse" />
                {hasRecordedTake ? "RE-RECORD TAKE (3s COUNTDOWN)" : "RECORD TAKE (3s COUNTDOWN)"}
              </button>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 pt-1">
            {currentChunkIndex > 0 && (
              <button
                onClick={() => setCurrentChunkIndex((prev) => prev - 1)}
                disabled={studioState === "recording" || studioState === "countdown"}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-[#EDEFF1]/80 hover:bg-white/10 disabled:opacity-30"
              >
                Previous Line
              </button>
            )}

            <button
              onClick={handleNextLine}
              disabled={!hasRecordedTake || studioState === "recording" || studioState === "countdown"}
              className={`flex-1 rounded-xl py-3.5 text-xs font-extrabold transition-all shadow-md uppercase tracking-wider ${
                hasRecordedTake && studioState !== "recording" && studioState !== "countdown"
                  ? "bg-[#93BADF] text-[#262733] shadow-[#93BADF]/20 hover:bg-white hover:scale-105"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {currentChunkIndex < scene.chunks.length - 1 ? "NEXT LINE →" : "FINISH & GRADE →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
