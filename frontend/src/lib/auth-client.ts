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

async function fetchMe(): Promise<SessionData | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error((await parseAuthError(res)).message);
  }
  return (await res.json()) as SessionData;
}

let sessionListeners: Array<() => void> = [];
let cachedSession: SessionData | null = null;
let sessionLoaded = false;
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

  sessionPromise = fetchMe()
    .then((data) => {
      cachedSession = data;
      sessionLoaded = true;
      notifySessionListeners();
      return data;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
}

export function useSession() {
  const [data, setData] = useState<SessionData | null>(cachedSession);
  const [isPending, setIsPending] = useState(!sessionLoaded);

  const refresh = useCallback(async () => {
    setIsPending(true);
    try {
      const next = await loadSession(true);
      setData(next);
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const listener = () => {
      setData(cachedSession);
      setIsPending(false);
    };

    sessionListeners.push(listener);

    if (!sessionLoaded) {
      loadSession()
        .then((next) => {
          if (!cancelled) {
            setData(next);
            setIsPending(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData(null);
            setIsPending(false);
          }
        });
    } else {
      setIsPending(false);
    }

    return () => {
      cancelled = true;
      sessionListeners = sessionListeners.filter((item) => item !== listener);
    };
  }, []);

  return { data, isPending, refresh };
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

  // Login JSON is not enough — the browser must actually store the session cookie.
  const me = await fetchMe();
  if (!me?.user) {
    return {
      error: {
        message:
          "Signed in, but the session cookie was blocked. Server side issue.",
      },
    };
  }

  cachedSession = me;
  sessionLoaded = true;
  notifySessionListeners();
  return { data: me };
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
  notifySessionListeners();
}
