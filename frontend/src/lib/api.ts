import { Scene, GradeResponse, Session, ExportJob } from "./types";

const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || "http://localhost:8080";

const apiFetch = (input: string, init?: RequestInit) =>
  fetch(input, {
    ...init,
    credentials: "include",
  });

export async function getScenes(): Promise<Scene[]> {
  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/scenes`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch scenes (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.scenes)) return data.scenes;
  throw new Error("Unexpected scenes response shape");
}

export async function getScene(id: string): Promise<Scene> {
  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/scenes/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Scene not found (${res.status})`);
  }
  return await res.json();
}

export async function submitSessionForGrading(
  sceneId: string,
  chunks: Array<{ transcript: string; reference_audio_url: string }>,
  recordedBlobs: Blob[]
): Promise<GradeResponse> {
  const form = new FormData();
  form.append("scene_id", sceneId);

  for (const c of chunks) {
    form.append("chunk_transcripts", c.transcript);
    form.append("reference_audio_urls", c.reference_audio_url);
  }

  for (const blob of recordedBlobs) {
    form.append("audio_chunks", blob, "take.webm");
  }

  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/grade`, {
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
  scene_id: string;
  overall_grade: string;
  overall_score_raw: number;
  export_url?: string;
}): Promise<Session> {
  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || `Save session failed (${res.status})`);
  }
  return await res.json();
}

export async function getUserSessions(): Promise<Session[]> {
  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/sessions`, {
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error(`Failed to fetch sessions (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.sessions)) return data.sessions;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function startExport(
  sceneId: string,
  recordedBlobs: Blob[],
  sessionId?: string
): Promise<ExportJob> {
  const form = new FormData();
  form.append("scene_id", sceneId);
  if (sessionId) {
    form.append("session_id", sessionId);
  }
  for (const blob of recordedBlobs) {
    form.append("audio_chunks", blob, "take.webm");
  }

  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/export`, {
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
    expires_at: data.expires_at,
    error: data.error,
  };
}

export async function getExport(exportId: string): Promise<ExportJob> {
  const res = await apiFetch(`${GO_BACKEND_URL}/api/v1/exports/${exportId}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 410 && data?.export_id) {
    return data as ExportJob;
  }
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Export status failed (${res.status})`);
  }
  return data as ExportJob;
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
