import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { processImage, variantWidths, keysForImage } from "@/lib/images";
import { deleteObjects, isValidKey, putObject, readLocalObject, publicUrl } from "@/lib/storage";
import { resetEnvCache } from "@/lib/env";

let dir: string;
beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "sk-uploads-"));
  process.env.UPLOAD_DIR = dir;
  process.env.MONGODB_URI = "mongodb://localhost/test";
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";
  delete process.env.R2_BUCKET;
  delete process.env.NEXT_PUBLIC_MEDIA_URL;
  resetEnvCache();
});
afterAll(async () => fs.rm(dir, { recursive: true, force: true }));

const jpeg = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 80, b: 90 } } })
    .jpeg()
    .toBuffer();

describe("variantWidths", () => {
  it("never upscales", () => {
    expect(variantWidths(500)).toEqual([500]);
    expect(variantWidths(1000)).toEqual([640, 1000]);
    expect(variantWidths(4000)).toEqual([640, 1280, 1920]);
  });
});

describe("processImage", () => {
  it("makes webp+avif variants and a blur placeholder", async () => {
    const out = await processImage(await jpeg(3000, 2000), { folder: "events", order: 2 });
    expect(out.image.variants.map((v) => v.width)).toEqual([640, 1280, 1920]);
    expect(out.files).toHaveLength(6);
    expect(out.image.width).toBe(1920);
    expect(out.image.height).toBe(1280);
    expect(out.image.blurDataURL.startsWith("data:image/webp;base64,")).toBe(true);
    expect(out.image.order).toBe(2);
    for (const f of out.files) expect(isValidKey(f.key)).toBe(true);
    const meta = await sharp(out.files[0].body).metadata();
    expect(meta.format).toBe("webp");
  });

  it("applies EXIF orientation to the reported size", async () => {
    const portraitSensor = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#fff" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 }) // rotate 90deg: displayed as 800x1200
      .toBuffer();
    const out = await processImage(portraitSensor, { folder: "events" });
    expect(out.image.width).toBe(800);
    expect(out.image.height).toBe(1200);
  });

  it("rejects non-images and empty files", async () => {
    await expect(processImage(Buffer.from("hello world"), { folder: "events" })).rejects.toMatchObject({ status: 415 });
    await expect(processImage(Buffer.alloc(0), { folder: "events" })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects unsupported formats (gif)", async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer();
    await expect(processImage(gif, { folder: "events" })).rejects.toMatchObject({ status: 415 });
  });
});

describe("local storage", () => {
  it("writes, reads and deletes", async () => {
    const out = await processImage(await jpeg(800, 600), { folder: "services" });
    for (const f of out.files) await putObject(f);
    const read = await readLocalObject(out.files[0].key);
    expect(read?.contentType).toBe("image/webp");
    expect(read?.body.length).toBeGreaterThan(0);

    await deleteObjects(keysForImage(out.image));
    expect(await readLocalObject(out.files[0].key)).toBeNull();
  });

  it("rejects traversal and unexpected keys", async () => {
    expect(isValidKey("events/../../etc/passwd.webp")).toBe(false);
    expect(isValidKey("/etc/passwd.webp")).toBe(false);
    expect(isValidKey("events/a/640.png")).toBe(false);
    expect(isValidKey("events/a/640.webp")).toBe(true);
    expect(await readLocalObject("events/../../x.webp")).toBeNull();
    await expect(putObject({ key: "../evil.webp", body: Buffer.from("x"), contentType: "image/webp" })).rejects.toThrow();
  });

  it("builds URLs from the local route or the media domain", () => {
    expect(publicUrl("events/a/640.webp")).toBe("/api/media/events/a/640.webp");
    process.env.NEXT_PUBLIC_MEDIA_URL = "https://media.example.com/";
    resetEnvCache();
    expect(publicUrl("events/a/640.webp")).toBe("https://media.example.com/events/a/640.webp");
    delete process.env.NEXT_PUBLIC_MEDIA_URL;
    resetEnvCache();
  });
});
