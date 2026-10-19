import path from "node:path";
import { promises as fs } from "node:fs";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { env } from "./env";

/**
 * Media storage with two interchangeable backends:
 *  - Cloudflare R2 (S3 API) when all R2_* variables are set
 *  - the local disk (UPLOAD_DIR) otherwise, served by /api/media/[...key]
 */

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*\.(webp|avif)$/;

/** Only keys we generate ourselves are accepted; blocks traversal and odd names. */
export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("//") && key.length <= 300;
}

function r2Config() {
  const e = env();
  if (e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET) {
    return {
      accountId: e.R2_ACCOUNT_ID,
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
      bucket: e.R2_BUCKET,
    };
  }
  return null;
}

let s3: S3Client | undefined;
function client(cfg: NonNullable<ReturnType<typeof r2Config>>) {
  s3 ??= new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return s3;
}

export function storageMode(): "r2" | "local" {
  return r2Config() ? "r2" : "local";
}

export function publicUrl(key: string): string {
  const base = env().NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");
  return `${base ?? "/api/media"}/${key}`;
}

function localPath(key: string): string {
  const root = path.resolve(env().UPLOAD_DIR);
  const full = path.resolve(root, ...key.split("/"));
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function putObject(input: { key: string; body: Buffer; contentType: string }) {
  if (!isValidKey(input.key)) throw new Error(`Invalid storage key: ${input.key}`);
  const cfg = r2Config();
  if (cfg) {
    await client(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return;
  }
  const file = localPath(input.key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, input.body);
}

/** Idempotent: keys that do not exist are ignored. */
export async function deleteObjects(keys: string[]) {
  const valid = [...new Set(keys)].filter(isValidKey);
  if (valid.length === 0) return;
  const cfg = r2Config();
  if (cfg) {
    for (let i = 0; i < valid.length; i += 1000) {
      await client(cfg).send(
        new DeleteObjectsCommand({
          Bucket: cfg.bucket,
          Delete: { Objects: valid.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
    return;
  }
  await Promise.all(valid.map((k) => fs.rm(localPath(k), { force: true })));
}

/** Local-backend read, used by the /api/media route. Returns null when missing. */
export async function readLocalObject(key: string) {
  if (!isValidKey(key)) return null;
  try {
    const body = await fs.readFile(localPath(key));
    return { body, contentType: key.endsWith(".avif") ? "image/avif" : "image/webp" };
  } catch {
    return null;
  }
}
