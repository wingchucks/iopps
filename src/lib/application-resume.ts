/** Accept only an owned Firebase object, never arbitrary URLs or another bucket. */
export function applicationResumePath(value: string, uid: string, bucket: string, emulatorHost?: string): string {
  const url = new URL(value);
  const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  const emulator = !!emulatorHost && url.protocol === "http:" && url.host === emulatorHost && ["127.0.0.1", "localhost"].includes(url.hostname);
  if ((!emulator && (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com")) || !match || decodeURIComponent(match[1]) !== bucket) throw new Error("Invalid resume file.");
  const path = decodeURIComponent(match[2]);
  if (!path.startsWith(`resumes/${uid}/`) || path.split("/").length !== 3 || !path.split("/")[2]) throw new Error("Invalid resume ownership.");
  return path;
}
