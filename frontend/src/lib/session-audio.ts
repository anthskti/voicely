const AUDIO_KEY_PREFIX = "voicely_session_";

export function sessionAudioKey(sceneId: string) {
  return `${AUDIO_KEY_PREFIX}${sceneId}`;
}

export function clearSessionAudio(sceneId?: string) {
  if (typeof window === "undefined") return;

  if (sceneId) {
    sessionStorage.removeItem(sessionAudioKey(sceneId));
    return;
  }

  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(AUDIO_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  for (const key of keys) {
    sessionStorage.removeItem(key);
  }
}
