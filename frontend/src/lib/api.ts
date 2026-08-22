import { Scene, GradeResponse, Session, ExportJob } from "./types";

const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || "https://voicely-api-72hu.onrender.com";

// Fallback Valorant Scene from S3 when Go scene list API is unavailable/unseeded
export const FALLBACK_VALORANT_SCENE: Scene = {
  id: "scene_valorant",
  title: "Valorant",
  difficulty: "Intermediate",
  video_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/video.mp4",
  soundtrack_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/soundtrack.mp3",
  vocals_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/vocals.mp3",
  chunks: [
    {
      index: 0,
      start_time_sec: 1.3,
      end_time_sec: 3.0,
      transcript: "You cannot let her plant.",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_00.wav",
    },
    {
      index: 1,
      start_time_sec: 3.0,
      end_time_sec: 4.8,
      transcript: "Alright, I'm going in.",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_01.wav",
    },
    {
      index: 2,
      start_time_sec: 4.8,
      end_time_sec: 6.1,
      transcript: "What about the hostile.",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_02.wav",
    },
    {
      index: 3,
      start_time_sec: 6.1,
      end_time_sec: 7.9,
      transcript: "I wouldn't worry bout her.",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_03.wav",
    },
    {
      index: 4,
      start_time_sec: 11.4,
      end_time_sec: 12.0,
      transcript: "Are you certain?",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_04.wav",
    },
    {
      index: 5,
      start_time_sec: 12.0,
      end_time_sec: 15.9,
      transcript: "One hundred, I got this.",
      reference_audio_url: "https://voicely-proto-0821.s3.amazonaws.com/scenes/scene_valorant/refs/chunk_05.wav",
    },
  ],
};

export async function getScenes(): Promise<Scene[]> {
  try {
    const res = await fetch(`${GO_BACKEND_URL}/api/v1/scenes`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [FALLBACK_VALORANT_SCENE];
    }
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : [FALLBACK_VALORANT_SCENE];
  } catch (err) {
    console.warn("Failed to fetch scenes from Go API, using fallback scene:", err);
    return [FALLBACK_VALORANT_SCENE];
  }
}

export async function getScene(id: string): Promise<Scene> {
  try {
    const res = await fetch(`${GO_BACKEND_URL}/api/v1/scenes/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (id === FALLBACK_VALORANT_SCENE.id) return FALLBACK_VALORANT_SCENE;
      throw new Error(`Scene not found (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    if (id === FALLBACK_VALORANT_SCENE.id) return FALLBACK_VALORANT_SCENE;
    throw err;
  }
}

export async function submitSessionForGrading(
  sceneId: string,
  userId: string,
  chunks: Array<{ transcript: string; reference_audio_url: string }>,
  recordedBlobs: Blob[]
): Promise<GradeResponse> {
  const form = new FormData();
  form.append("scene_id", sceneId);
  form.append("user_id", userId);

  for (const c of chunks) {
    form.append("chunk_transcripts", c.transcript);
    form.append("reference_audio_urls", c.reference_audio_url);
  }

  for (const blob of recordedBlobs) {
    form.append("audio_chunks", blob, "take.webm");
  }

  const res = await fetch(`${GO_BACKEND_URL}/api/v1/grade`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = formatGradeError(err.detail || err.error || "");
    if (isGraderColdStart(res.status, detail)) {
      throw new Error("Grader microservice is waking up from sleep. Please retry in ~30s.");
    }
    throw new Error(detail || `Grading failed with status ${res.status}`);
  }

  return await res.json();
}

export async function saveSession(payload: {
  user_id: string;
  scene_id: string;
  overall_grade: string;
  overall_score_raw: number;
  export_url?: string;
}): Promise<Session> {
  try {
    const res = await fetch(`${GO_BACKEND_URL}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("Save session returned non-200, creating local session object.");
      return {
        id: `sess_local_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...payload,
      };
    }
    return await res.json();
  } catch (err) {
    console.warn("Failed to save session via Go backend, mock saved locally:", err);
    return {
      id: `sess_local_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...payload,
    };
  }
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  try {
    const res = await fetch(`${GO_BACKEND_URL}/api/v1/sessions?user_id=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.sessions)) return data.sessions;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) {
    console.warn("Failed to fetch sessions for user:", err);
    return [];
  }
}

export async function startExport(
  sceneId: string,
  userId: string,
  recordedBlobs: Blob[],
  sessionId?: string
): Promise<ExportJob> {
  const form = new FormData();
  form.append("scene_id", sceneId);
  form.append("user_id", userId);
  if (sessionId) {
    form.append("session_id", sessionId);
  }
  for (const blob of recordedBlobs) {
    form.append("audio_chunks", blob, "take.webm");
  }

  const res = await fetch(`${GO_BACKEND_URL}/api/v1/export`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Export failed (${res.status})`);
  }
  const data = await res.json();
  return {
    export_id: data.export_id,
    status: data.status,
    export_url: data.export_url,
    error: data.error,
  };
}

export async function getExport(exportId: string): Promise<ExportJob> {
  const res = await fetch(`${GO_BACKEND_URL}/api/v1/exports/${exportId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Export status failed (${res.status})`);
  }
  return await res.json();
}

function isGraderColdStart(status: number, detail: string): boolean {
  if (status === 503) return true;
  return /connection refused|i\/o timeout|no such host|temporarily unavailable|connection reset|deadline exceeded/i.test(
    detail
  );
}

function formatGradeError(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw !== "string") return String(raw);
  const nested = raw.match(/\{.*\}$/);
  if (nested) {
    try {
      const parsed = JSON.parse(nested[0]);
      if (parsed?.detail) {
        const inner = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
        return inner;
      }
    } catch {
      /* keep original */
    }
  }
  return raw;
}
