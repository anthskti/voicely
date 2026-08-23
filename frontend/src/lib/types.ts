export type Chunk = {
  index: number;
  start_time_sec: number;
  end_time_sec: number;
  transcript: string;
  reference_audio_url: string;
};

export type Scene = {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | string;
  thumbnail_url?: string;
  video_url: string;
  soundtrack_url: string;
  vocals_url?: string;
  chunks: Chunk[];
};

export type ChunkBreakdown = {
  chunk_index: number;
  grade: string;
  score_raw: number;
  pitch: number;
  cadence: number;
  timbre: number;
  notes: string;
};

export type GradeResponse = {
  session_id: string;
  overall_grade: string; // S+ | S | A | B | C | D | F
  overall_score_raw: number; // 0–1
  pros: string[];
  cons: string[];
  chunk_breakdowns: ChunkBreakdown[];
};

export type Session = {
  id: string;
  user_id: string;
  scene_id: string;
  overall_grade: string;
  overall_score_raw: number;
  export_url?: string;
  export_status?: string;
  created_at: string;
};

export type ExportJob = {
  export_id: string;
  status: "processing" | "ready" | "failed";
  export_url?: string;
  error?: string;
};
