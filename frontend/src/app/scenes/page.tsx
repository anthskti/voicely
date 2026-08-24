"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SceneCard } from "@/components/SceneCard";
import { getScenes } from "@/lib/api";
import { Scene } from "@/lib/types";
import { useSession } from "@/lib/auth-client";
import { clearSessionAudio } from "@/lib/session-audio";

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stripItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const router = useRouter();
  const { data: session } = useSession();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    clearSessionAudio();
    getScenes()
      .then((data) => {
        setScenes(data);
        if (data.length > 0) {
          setSelectedScene(data[0]);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load scenes");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedScene) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }
    const el = stripItemRefs.current.get(selectedScene.id);
    el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [selectedScene?.id]);

  const handleEnterStudio = () => {
    if (!selectedScene) return;
    if (!session?.user) {
      router.push(`/login?redirect=${encodeURIComponent(`/studio/${selectedScene.id}/prep`)}`);
    } else {
      router.push(`/studio/${selectedScene.id}/prep`);
    }
  };

  const setStripRef = (sceneId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      stripItemRefs.current.set(sceneId, el);
    } else {
      stripItemRefs.current.delete(sceneId);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#262733] text-[#EDEFF1] flex flex-col overflow-hidden scanline-bg">
      {isDesktop === false && selectedScene?.thumbnail_url && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <Image
            src={selectedScene.thumbnail_url}
            alt="background blur"
            fill
            className="object-cover blur-[50px] opacity-25 scale-110 transition-all duration-700"
            unoptimized
          />
          <div className="absolute inset-0 bg-[#262733]/70 backdrop-blur-md" />
        </div>
      )}

      <header className="relative z-20 flex h-16 items-center justify-between border-b border-[#93BADF]/15 bg-[#1a1b24]/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono text-xs text-[#93BADF] group-hover:-translate-x-1 transition-transform">←</span>
            <span className="font-display font-extrabold text-xl text-white">VOICELY</span>
          </Link>
          <span className="text-xs text-[#EDEFF1]/40">•</span>
          <span className="text-xs font-semibold text-[#93BADF] uppercase tracking-widest">
            SCENE SELECT
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {session?.user ? (
            <span className="text-[#708F7F] font-mono">
              ● {session.user.name || session.user.email?.split("@")[0]}
            </span>
          ) : (
            <Link
              href="/login?redirect=/scenes"
              className="rounded-lg border border-[#93BADF]/30 bg-[#93BADF]/10 px-3 py-1.5 font-semibold text-[#93BADF] hover:bg-[#93BADF] hover:text-[#262733] transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </header>

      {isDesktop === false && (
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col gap-5 glass-panel p-4 sm:p-6 rounded-3xl border border-[#93BADF]/25 bg-[#1d1e27]/85 backdrop-blur-2xl shadow-2xl">
          <ScenePanelBody
            loading={loading}
            error={error}
            selectedScene={selectedScene}
            onEnterStudio={handleEnterStudio}
            enterDisabled={loading || !selectedScene}
            strip={
              <SceneStrip
                loading={loading}
                scenes={scenes}
                selectedScene={selectedScene}
                onSelect={setSelectedScene}
                setStripRef={setStripRef}
              />
            }
          />
        </div>
      </main>
      )}

      {isDesktop === true && (
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-2 gap-8 items-stretch min-h-[calc(100vh-64px)]">
        <div className="min-w-0 flex flex-col justify-between glass-panel p-6 sm:p-8 rounded-3xl border border-[#93BADF]/25 bg-[#1d1e27]/85 backdrop-blur-2xl shadow-2xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#93BADF] border-t-transparent" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-96 gap-3 text-center">
                <p className="font-mono text-sm text-[#EDEFF1]/70">Couldn’t load scenes from the API.</p>
                <p className="font-mono text-xs text-[#93BADF]">{error}</p>
              </div>
            ) : !selectedScene ? (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="font-mono text-sm text-[#EDEFF1]/70">No scenes seeded yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#1a1b24]">
                  {selectedScene.thumbnail_url ? (
                    <img
                      src={selectedScene.thumbnail_url}
                      alt={selectedScene.title}
                      className="absolute inset-0 block h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#262733] text-sm font-mono text-[#93BADF]">
                      NO PREVIEW IMAGE
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1d1e27] via-transparent to-transparent opacity-70" />
                  <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-mono text-white">
                    {selectedScene.chunks.length} Dialogue Lines
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="rounded-full border border-[#93BADF]/40 bg-[#93BADF]/15 px-3 py-0.5 text-xs font-semibold text-[#93BADF]">
                      {selectedScene.difficulty}
                    </span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
                    {selectedScene.title}
                  </h1>
                  <p className="text-xs text-[#EDEFF1]/70 mt-3 leading-relaxed">
                    Practice voice acting line-by-line.
                  </p>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#93BADF]">
                    Dialogue Preview
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedScene.chunks.slice(0, 3).map((chunk) => (
                      <div
                        key={chunk.index}
                        className="rounded-lg bg-black/30 p-2 text-xs text-[#EDEFF1]/80 font-mono border border-white/5"
                      >
                        <span className="text-[#708F7F] font-bold mr-2">#{chunk.index + 1}</span>
                        &ldquo;{chunk.transcript}&rdquo;
                      </div>
                    ))}
                    {selectedScene.chunks.length > 3 && (
                      <div className="text-[12px] text-[#EDEFF1]/50 italic pl-1 pb-2">
                        + {selectedScene.chunks.length - 3} more dialogue lines in studio
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-white/10">
              <button
                onClick={handleEnterStudio}
                disabled={loading || !selectedScene}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#93BADF] py-4 text-base font-bold text-[#262733] shadow-xl shadow-[#93BADF]/20 hover:bg-white hover:scale-105 active:scale-95 transition-all tracking-wider uppercase disabled:opacity-50"
              >
                ENTER STUDIO
              </button>
            </div>
          </div>

          <div className="min-w-0 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#93BADF]">
                Available Scenes ({scenes.length})
              </span>
              <span className="text-[11px] font-mono text-[#EDEFF1]/50">
                Click a scene to preview
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-2xl bg-[#1a1b24]/50 animate-pulse border border-white/5"
                  />
                ))
              ) : scenes.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-[#EDEFF1]/50">
                  No scenes available.
                </div>
              ) : (
                scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isSelected={selectedScene?.id === scene.id}
                    onSelect={(s) => setSelectedScene(s)}
                  />
                ))
              )}
            </div>
          </div>
      </main>
      )}
    </div>
  );
}

function ScenePreview({ scene }: { scene: Scene }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#1a1b24]">
      {scene.thumbnail_url ? (
        <img
          src={scene.thumbnail_url}
          alt={scene.title}
          className="absolute inset-0 block h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#262733] text-sm font-mono text-[#93BADF]">
          NO PREVIEW IMAGE
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1d1e27] via-transparent to-transparent opacity-70" />
      <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-mono text-white">
        {scene.chunks.length} Dialogue Lines
      </div>
    </div>
  );
}

function SceneMeta({ scene }: { scene: Scene }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="rounded-full border border-[#93BADF]/40 bg-[#93BADF]/15 px-3 py-0.5 text-xs font-semibold text-[#93BADF]">
            {scene.difficulty}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
          {scene.title}
        </h1>
        <p className="text-xs text-[#EDEFF1]/70 mt-3 leading-relaxed">
          Practice voice acting line-by-line.
        </p>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#93BADF]">
          Dialogue Preview
        </span>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {scene.chunks.slice(0, 3).map((chunk) => (
            <div
              key={chunk.index}
              className="rounded-lg bg-black/30 p-2 text-xs text-[#EDEFF1]/80 font-mono border border-white/5"
            >
              <span className="text-[#708F7F] font-bold mr-2">#{chunk.index + 1}</span>
              &ldquo;{chunk.transcript}&rdquo;
            </div>
          ))}
          {scene.chunks.length > 3 && (
            <div className="text-[10px] text-[#EDEFF1]/50 italic pl-1 pb-2">
              + {scene.chunks.length - 3} more dialogue lines in studio
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SceneStrip({
  loading,
  scenes,
  selectedScene,
  onSelect,
  setStripRef,
}: {
  loading: boolean;
  scenes: Scene[];
  selectedScene: Scene | null;
  onSelect: (scene: Scene) => void;
  setStripRef: (sceneId: string) => (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#93BADF]">
        Choose scene
      </span>
      <div className="flex gap-3 overflow-x-auto px-1 py-2 snap-x snap-mandatory scrollbar-thin">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[4.75rem] w-[4.75rem] shrink-0 snap-center rounded-2xl bg-[#1a1b24]/50 animate-pulse border border-white/5"
            />
          ))
        ) : scenes.length === 0 ? (
          <p className="text-xs font-mono text-[#EDEFF1]/50 py-2">No scenes available.</p>
        ) : (
          scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              ref={setStripRef(scene.id)}
              variant="strip"
              scene={scene}
              isSelected={selectedScene?.id === scene.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ScenePanelBody({
  loading,
  error,
  selectedScene,
  onEnterStudio,
  enterDisabled,
  strip,
}: {
  loading: boolean;
  error: string | null;
  selectedScene: Scene | null;
  onEnterStudio: () => void;
  enterDisabled: boolean;
  strip?: ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 justify-between min-h-0">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 sm:h-96">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#93BADF] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 sm:h-96 gap-3 text-center">
          <p className="font-mono text-sm text-[#EDEFF1]/70">Couldn’t load scenes from the API.</p>
          <p className="font-mono text-xs text-[#93BADF]">{error}</p>
        </div>
      ) : !selectedScene ? (
        <div className="flex flex-col items-center justify-center h-64 sm:h-96">
          <p className="font-mono text-sm text-[#EDEFF1]/70">No scenes seeded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 sm:gap-6">
          <ScenePreview scene={selectedScene} />
          {strip}
          <SceneMeta scene={selectedScene} />
        </div>
      )}

      <div className="pt-6 border-t border-white/10 mt-4">
        <button
          onClick={onEnterStudio}
          disabled={enterDisabled}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#93BADF] py-4 text-base font-bold text-[#262733] shadow-xl shadow-[#93BADF]/20 hover:bg-white hover:scale-105 active:scale-95 transition-all tracking-wider uppercase disabled:opacity-50"
        >
          ENTER STUDIO
        </button>
      </div>
    </div>
  );
}
