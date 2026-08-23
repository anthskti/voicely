interface GradeDisplayProps {
  grade: string; // S+, S, A, B, C, D, F
  scoreRaw?: number; // 0..1
  size?: "sm" | "md" | "lg" | "xl";
}

export function GradeDisplay({ grade, scoreRaw, size = "md" }: GradeDisplayProps) {
  const getGradeStyle = (g: string) => {
    switch (g?.toUpperCase()) {
      case "S+":
      case "SS":
        return {
          bg: "from-amber-300 via-yellow-400 to-amber-500",
          text: "text-amber-900",
          border: "border-amber-300",
          glow: "shadow-[0_0_25px_rgba(252,211,77,0.6)]",
        };
      case "S":
        return {
          bg: "from-yellow-400 to-amber-400",
          text: "text-amber-950",
          border: "border-yellow-400",
          glow: "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
        };
      case "A":
        return {
          bg: "from-emerald-400 to-teal-500",
          text: "text-emerald-950",
          border: "border-emerald-400",
          glow: "shadow-[0_0_20px_rgba(52,211,153,0.5)]",
        };
      case "B":
        return {
          bg: "from-[#93BADF] to-blue-500",
          text: "text-blue-950",
          border: "border-[#93BADF]",
          glow: "shadow-[0_0_20px_rgba(147,186,223,0.5)]",
        };
      case "C":
        return {
          bg: "from-purple-400 to-purple-600",
          text: "text-purple-950",
          border: "border-purple-400",
          glow: "shadow-[0_0_15px_rgba(192,132,252,0.4)]",
        };
      case "D":
        return {
          bg: "from-orange-400 to-amber-600",
          text: "text-orange-950",
          border: "border-orange-400",
          glow: "shadow-[0_0_15px_rgba(251,146,60,0.4)]",
        };
      default:
        return {
          bg: "from-[#e63946] to-rose-700",
          text: "text-rose-100",
          border: "border-rose-500",
          glow: "shadow-[0_0_15px_rgba(230,57,70,0.5)]",
        };
    }
  };

  const style = getGradeStyle(grade);

  const sizeClasses = {
    sm: "h-8 w-8 text-sm font-black rounded-md",
    md: "h-12 w-12 text-xl font-extrabold rounded-lg",
    lg: "h-20 w-20 text-4xl font-black rounded-xl",
    xl: "h-28 w-28 text-6xl font-black rounded-2xl",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${style.bg} ${style.text} ${style.glow} ${sizeClasses[size]} border ${style.border} font-display transform transition-transform hover:scale-105`}
      >
        {grade || "F"}
      </div>
      {scoreRaw !== undefined && (
        <span className="text-[11px] font-mono text-[#93BADF]">
          {(scoreRaw * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
