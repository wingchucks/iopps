import { randomUUID } from "node:crypto";
import type { Bucket } from "@google-cloud/storage";
import { applicationResumePath } from "../application-resume";

/** Copy a verified generation to a server-only namespace before persisting a receipt.
 * User-managed profile uploads retain their existing overwrite/delete behavior.
 */
export async function archiveApplicationResume(bucket: Bucket, url: string, uid: string, emulatorHost?: string): Promise<string> {
  const path = applicationResumePath(url, uid, bucket.name, emulatorHost);
  const [metadata] = await bucket.file(path).getMetadata();
  const size = Number(metadata.size);
  if (!Number.isFinite(size) || size <= 0 || size >= 5 * 1024 * 1024 || !["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(metadata.contentType || "") || !metadata.generation) throw new Error("Invalid resume file.");
  const destination = `application-documents/${uid}/${randomUUID()}`;
  const token = randomUUID();
  // Pin the inspected source: an overwrite/delete race fails rather than changing the archive.
  await bucket.file(path, { generation: metadata.generation }).copy(bucket.file(destination), {
    preconditionOpts: { ifGenerationMatch: 0 },
    contentType: metadata.contentType, metadata: { firebaseStorageDownloadTokens: token },
  });
  const origin = emulatorHost && /^(localhost|127\.0\.0\.1):\d+$/.test(emulatorHost)
    ? `http://${emulatorHost}` : "https://firebasestorage.googleapis.com";
  return `${origin}/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}
