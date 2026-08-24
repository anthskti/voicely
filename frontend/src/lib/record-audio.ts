const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
];

export function pickAudioRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function audioUploadFilename(blob: Blob, index = 0): string {
  const type = blob.type.toLowerCase();
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) {
    return `take_${index}.m4a`;
  }
  if (type.includes("mpeg") || type.includes("mp3")) {
    return `take_${index}.mp3`;
  }
  if (type.includes("ogg")) {
    return `take_${index}.ogg`;
  }
  if (type.includes("wav")) {
    return `take_${index}.wav`;
  }
  return `take_${index}.webm`;
}

export async function requestMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
