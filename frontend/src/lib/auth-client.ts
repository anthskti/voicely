"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api/v1";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type SessionData = {
  user: AuthUser;
};

type AuthError = {
  message: string;
};

type AuthResult = {
  error?: AuthError;
  data?: SessionData;
};

type MeResult =
  | { status: "authenticated"; data: SessionData }
  | { status: "guest" }
  | { status: "error"; message: string };

async function parseAuthError(res: Response): Promise<AuthError> {
  const body = await res.json().catch(() => ({}));
  const message =
    typeof body?.error === "string"
      ? body.error
      : typeof body?.detail === "string"
        ? body.detail
        : `Request failed (${res.status})`;
  return { message };
}

async function fetchMeResult(): Promise<MeResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401) {
      return { status: "guest" };
    }
    if (!res.ok) {
      return { status: "error", message: (await parseAuthError(res)).message };
    }
    return { status: "authenticated", data: (await res.json()) as SessionData };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach the server";
    return { status: "error", message };
  }
}

let sessionListeners: Array<() => void> = [];
let cachedSession: SessionData | null = null;
let sessionLoaded = false;
let sessionError: string | null = null;
let sessionPromise: Promise<SessionData | null> | null = null;

function notifySessionListeners() {
  sessionListeners.forEach((listener) => listener());
}

async function loadSession(force = false): Promise<SessionData | null> {
  if (!force && sessionLoaded) {
    return cachedSession;
  }
  if (!force && sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = fetchMeResult()
    .then((result) => {
      if (result.status === "authenticated") {
        cachedSession = result.data;
        sessionLoaded = true;
        sessionError = null;
        notifySessionListeners();
        return result.data;
      }
      if (result.status === "guest") {
        cachedSession = null;
        sessionLoaded = true;
        sessionError = null;
        notifySessionListeners();
        return null;
      }
      sessionError = result.message;
      notifySessionListeners();
      return cachedSession;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
}

export function useSession() {
  const [data, setData] = useState<SessionData | null>(cachedSession);
  const [error, setError] = useState<string | null>(sessionError);
  const [isPending, setIsPending] = useState(!sessionLoaded && !sessionError);
  const [isResolved, setIsResolved] = useState(sessionLoaded);

  const refresh = useCallback(async () => {
    setIsPending(true);
    setError(null);
    sessionError = null;
    sessionLoaded = false;
    try {
      const next = await loadSession(true);
      setData(next);
      setError(sessionError);
      setIsResolved(sessionLoaded);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const listener = () => {
      setData(cachedSession);
      setError(sessionError);
      setIsResolved(sessionLoaded);
      setIsPending(false);
    };

    sessionListeners.push(listener);

    if (!sessionLoaded && !sessionError) {
      loadSession()
        .then(() => {
          if (!cancelled) {
            setData(cachedSession);
            setError(sessionError);
            setIsResolved(sessionLoaded);
            setIsPending(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(sessionError);
            setIsPending(false);
          }
        });
    } else {
      setIsPending(false);
      setIsResolved(sessionLoaded);
      setError(sessionError);
    }

    return () => {
      cancelled = true;
      sessionListeners = sessionListeners.filter((item) => item !== listener);
    };
  }, []);

  return { data, isPending, error, isResolved, refresh };
}

async function postAuth(path: string, body: Record<string, string>): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { error: await parseAuthError(res) };
  }

  await res.json().catch(() => undefined);

  const me = await fetchMeResult();
  if (me.status !== "authenticated") {
    return {
      error: {
        message:
          me.status === "error"
            ? me.message
            : "Signed in, but the session cookie was blocked. Server side issue.",
      },
    };
  }

  cachedSession = me.data;
  sessionLoaded = true;
  sessionError = null;
  notifySessionListeners();
  return { data: me.data };
}

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    return postAuth("login", { email, password });
  },
};

export const signUp = {
  email: async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    return postAuth("signup", { name, email, password });
  },
};

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);

  cachedSession = null;
  sessionLoaded = true;
  sessionError = null;
  notifySessionListeners();
}
