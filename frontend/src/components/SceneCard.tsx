import Image from "next/image";
import { Scene } from "@/lib/types";
import { GradeDisplay } from "./GradeDisplay";

interface SceneRowProps {
  scene: Scene;
  isSelected: boolean;
  bestGrade?: string;
  onSelect: (scene: Scene) => void;
}

export function SceneCard({ scene, isSelected, bestGrade, onSelect }: SceneRowProps) {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "beginner":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "intermediate":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "advanced":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      default:
        return "bg-[#93BADF]/20 text-[#93BADF] border-[#93BADF]/40";
    }
  };

  return (
    <div
      onClick={() => onSelect(scene)}
      className={`group relative flex items-center justify-between gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
        isSelected
          ? "bg-[#262733]/90 border-[#93BADF]/50 shadow-xl shadow-[#93BADF]/10 translate-x-2 opacity-100"
          : "bg-[#1a1b24]/60 border-white/5 opacity-60 hover:opacity-100 hover:bg-[#1a1b24]/90 hover:translate-x-1.5 hover:border-[#93BADF]/30"
      }`}
    >
      {/* Active Left Indicator Bar */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[#93BADF] transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        }`}
      />

      <div className="flex items-center gap-4 min-w-0">
        {/* Small Thumbnail */}
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-[#1d1e27] border border-white/10">
          {scene.thumbnail_url ? (
            <Image
              src={scene.thumbnail_url}
              alt={scene.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#262733] text-[10px] font-mono text-[#93BADF]">
              NO IMAGE
            </div>
          )}
        </div>

        {/* Scene Info */}
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-white group-hover:text-[#93BADF] transition-colors truncate">
            {scene.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`rounded-full border px-2 py-0.2 text-[10px] font-semibold ${getDifficultyColor(
                scene.difficulty
              )}`}
            >
              {scene.difficulty}
            </span>
            <span className="text-[11px] font-mono text-[#EDEFF1]/60">
              {scene.chunks.length} lines
            </span>
          </div>
        </div>
      </div>

      {/* Right Side Grade or Arrow */}
      <div className="shrink-0 flex items-center gap-3">
        {bestGrade && <GradeDisplay grade={bestGrade} size="sm" />}
        <svg
          className={`w-5 h-5 text-[#93BADF] transition-transform ${
            isSelected ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:opacity-70"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
