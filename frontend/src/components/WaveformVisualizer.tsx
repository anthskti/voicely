"use client";

import { useEffect, useRef, useState } from "react";

interface WaveformVisualizerProps {
  audioUrl?: string; // Reference audio URL to decode static PCM bars
  progress: number; // 0.0 to 1.0 playhead position
  isRecording?: boolean; // When true, overlays live mic oscilloscope
  stream?: MediaStream | null; // Mic stream for live overlay
  mode?: "reference" | "take" | "idle";
}

export function WaveformVisualizer({
  audioUrl,
  progress,
  isRecording = false,
  stream = null,
  mode = "reference",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pcmData, setPcmData] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // 1. Fetch and decode audio URL into static normalized PCM peaks
  useEffect(() => {
    if (!audioUrl) {
      setPcmData([]);
      return;
    }

    const targetUrl: string = audioUrl;
    let isCancelled = false;
    setLoading(true);

    async function decodeAudio() {
      try {
        const response = await fetch(targetUrl);
        const arrayBuffer = await response.arrayBuffer();

        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        ctx.close();

        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars to draw
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize data to 0 - 1
        const maxVal = Math.max(...filteredData, 0.01);
        const normalized = filteredData.map((val) => Math.min(1, val / maxVal));

        if (!isCancelled) {
          setPcmData(normalized);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to decode reference waveform audio:", err);
        if (!isCancelled) {
          // Generate a synthetic recognizable voice contour if CORS or decode fails
          const synthetic = Array.from({ length: 80 }, (_, i) =>
            Math.sin((i / 80) * Math.PI) * (0.4 + 0.5 * Math.sin(i * 0.3))
          );
          setPcmData(synthetic);
          setLoading(false);
        }
      }
    }

    decodeAudio();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  // 2. Setup Mic Analyser for live recording overlay
  useEffect(() => {
    if (!isRecording || !stream) {
      if (analyserRef.current) {
        analyserRef.current = null;
      }
      return;
    }

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx();
    }
    const audioCtx = audioCtxRef.current;
    void audioCtx.resume();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    // Clone so Web Audio does not steal the track from MediaRecorder (Safari).
    const source = audioCtx.createMediaStreamSource(stream.clone());
    source.connect(analyser);

    return () => {
      source.disconnect();
      source.mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [isRecording, stream]);

  // 3. Draw loop: Static Waveform + Playhead + Live Mic Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw Static PCM Waveform
      const bars = pcmData.length > 0 ? pcmData : Array.from({ length: 80 }, () => 0.15);
      const barWidth = width / bars.length;
      const playheadX = Math.max(0, Math.min(width, progress * width));

      bars.forEach((amplitude, index) => {
        const x = index * barWidth;
        const barH = Math.max(4, amplitude * (height * 0.82));
        const isPlayed = x <= playheadX;

        if (isRecording) {
          // Dim reference waveform while recording
          ctx.fillStyle = "rgba(147, 186, 223, 0.25)";
        } else if (mode === "take") {
          // Take playback (Amber/Emerald)
          ctx.fillStyle = isPlayed ? "#708F7F" : "rgba(112, 143, 127, 0.25)";
        } else {
          // Reference playback (Blue)
          ctx.fillStyle = isPlayed ? "#93BADF" : "rgba(147, 186, 223, 0.2)";
        }

        // Draw symmetric rounded bar from center
        const topY = centerY - barH / 2;
        ctx.fillRect(x + 1, topY, Math.max(2, barWidth - 2), barH);
      });

      // Draw Playhead Line & Indicator Tick
      if (progress > 0 && progress <= 1 && !isRecording) {
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#93BADF";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Playhead triangle at top
        ctx.beginPath();
        ctx.moveTo(playheadX - 6, 0);
        ctx.lineTo(playheadX + 6, 0);
        ctx.lineTo(playheadX, 9);
        ctx.closePath();
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }

      // Draw Live Mic Oscilloscope Overlay if Recording
      if (isRecording && analyserRef.current) {
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#e63946";
        ctx.shadowColor = "#e63946";
        ctx.shadowBlur = 12;

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [pcmData, progress, isRecording, mode]);

  return (
    <div className="relative w-full rounded-2xl border border-[#93BADF]/20 bg-[#161720]/90 p-3 shadow-inner">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#161720]/80 rounded-2xl z-10">
          <span className="text-[11px] font-mono text-[#93BADF] animate-pulse">
            Decoding reference waveform...
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={800}
        height={140}
        className="w-full h-28 sm:h-32 block"
      />
    </div>
  );
}
