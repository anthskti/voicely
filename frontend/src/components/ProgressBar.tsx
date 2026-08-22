interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  statusText?: string;
}

export function ProgressBar({ progress, label, statusText }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-[#93BADF] font-semibold">{label || "Loading Assets"}</span>
        <span className="text-[#EDEFF1] font-bold">{Math.round(clamped)}%</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#1a1b24] p-0.5 border border-[#93BADF]/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#708F7F] via-[#93BADF] to-[#e63946] transition-all duration-300 ease-out shadow-sm shadow-[#93BADF]/30"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {statusText && (
        <span className="text-[11px] text-[#EDEFF1]/60 font-mono text-center animate-pulse">
          {statusText}
        </span>
      )}
    </div>
  );
}
