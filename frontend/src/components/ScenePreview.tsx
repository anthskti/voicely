"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Scene } from "@/lib/types";

interface ScenePreviewProps {
  scene: Scene;
}

export function ScenePreview({ scene }: ScenePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scene.video_url) return;

    setIsMuted(true);
    setShowVideo(false);
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    video.src = scene.video_url;

    const startPlayback = () => {
      video
        .play()
        .then(() => {
          setShowVideo(true);
        })
        .catch(() => {
          setShowVideo(false);
        });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
    } else {
      video.addEventListener("canplay", startPlayback, { once: true });
    }

    return () => {
      video.removeEventListener("canplay", startPlayback);
      video.pause();
      video.currentTime = 0;
      setShowVideo(false);
    };
  }, [scene.id, scene.video_url]);

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#1a1b24]">
      {scene.thumbnail_url ? (
        <img
          src={scene.thumbnail_url}
          alt={scene.title}
          className={`absolute inset-0 block h-full w-full object-cover transition-opacity duration-200 ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-[#262733] text-sm font-mono text-[#93BADF] transition-opacity duration-200 ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
        >
          NO PREVIEW IMAGE
        </div>
      )}

      {scene.video_url && (
        <video
          ref={videoRef}
          preload="auto"
          playsInline
          loop
          muted
          poster={scene.thumbnail_url}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#1d1e27] via-transparent to-transparent opacity-70 pointer-events-none" />
      <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-mono text-white">
        {scene.chunks.length} Dialogue Lines
      </div>

      {scene.video_url && showVideo && (
        <button
          type="button"
          aria-label={isMuted ? "Unmute preview" : "Mute preview"}
          onClick={handleToggleMute}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
