/**
 * End-to-end smoke test against a RUNNING server and a real MongoDB.
 *
 *   docker compose up -d mongo
 *   npm run seed:admin
 *   npm run dev            # in another terminal
 *   npm run smoke
 *
 * Exercises: login, uploads, events CRUD, image cleanup, public lead form,
 * lead management, CSV export and role restrictions. Cleans up after itself.
 */
import sharp from "sharp";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (run via `npm run smoke` so .env is loaded).");
  process.exit(1);
}

let failures = 0;
let step = 0;
function check(name: string, cond: unknown, extra?: unknown) {
  step++;
  if (cond) console.log(`  ok   ${String(step).padStart(2)}. ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${String(step).padStart(2)}. ${name}`, extra !== undefined ? JSON.stringify(extra) : "");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function call(
  path: string,
  opts: { method?: string; cookie?: string; json?: unknown; form?: FormData } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.Cookie = opts.cookie;
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) body = opts.form;
  const res = await fetch(BASE + path, { method: opts.method ?? "GET", headers, body, redirect: "manual" });
  const text = await res.text();
  let json: Json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON (e.g. CSV) */
  }
  return { status: res.status, json, text, res };
}

async function login(email: string, password: string) {
  const r = await call("/api/auth/login", { method: "POST", json: { email, password } });
  const cookie = r.res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("sk_session="));
  return { ...r, cookie };
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);
  const health = await call("/api/health");
  check("health endpoint reports database ok", health.status === 200, health.json);

  // --- auth ---
  const bad = await login(ADMIN_EMAIL!, "definitely-wrong-password-1");
  check("wrong password is rejected", bad.status === 401 && !bad.cookie, bad.json);
  const admin = await login(ADMIN_EMAIL!, ADMIN_PASSWORD!);
  check("admin can log in and receives a cookie", admin.status === 200 && !!admin.cookie, admin.json);
  const cookie = admin.cookie!;
  const me = await call("/api/auth/me", { cookie });
  check("/api/auth/me returns the admin", me.json?.data?.role === "admin", me.json);
  check("admin API refuses anonymous access", (await call("/api/admin/events")).status === 401);

  // --- settings ---
  const settings = await call("/api/admin/settings", {
    method: "PUT",
    cookie,
    json: { businessName: "ShubhKaaraj", whatsapp: "919876543210", phone: "+91 98765 43210", tagline: "Smoke test" },
  });
  check("settings can be saved", settings.status === 200 && settings.json?.data?.whatsapp === "919876543210", settings.json);
  check(
    "invalid WhatsApp number is rejected",
    (await call("/api/admin/settings", { method: "PUT", cookie, json: { whatsapp: "abc" } })).status === 400,
  );

  // --- media upload ---
  const png = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#b4536b" } }).png().toBuffer();
  const form = new FormData();
  form.append("folder", "events");
  form.append("files", new Blob([new Uint8Array(png)], { type: "image/png" }), "mandap-setup.png");
  form.append("files", new Blob([new Uint8Array(png)], { type: "image/png" }), "stage.png");
  const up = await call("/api/admin/media", { method: "POST", cookie, form });
  const images: Json[] = up.json?.data ?? [];
  check("two images upload and are processed", up.status === 201 && images.length === 2, up.json);
  check(
    "variants include webp and avif at 3 widths",
    images[0]?.variants?.length === 3 && images[0].variants[0].avif.endsWith(".avif"),
  );
  const served = await fetch(BASE + images[0].url);
  check(
    "uploaded image is served with an image content-type",
    served.status === 200 && (served.headers.get("content-type") ?? "").startsWith("image/"),
  );
  const notImage = new FormData();
  notImage.append("files", new Blob(["hello"], { type: "text/plain" }), "x.txt");
  check(
    "non-image upload is rejected",
    (await call("/api/admin/media", { method: "POST", cookie, form: notImage })).status === 415,
  );

  // --- events CRUD ---
  const payload = {
    title: `Smoke Test Mandap ${Date.now()}`,
    category: "wedding-decor",
    city: "Udaipur",
    status: "published",
    featured: true,
    images,
    coverImage: images[0],
    tags: ["mandap"],
    eventDate: "2026-02-14",
    guestCount: 300,
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  };
  const created = await call("/api/admin/events", { method: "POST", cookie, json: payload });
  const ev = created.json?.data;
  check(
    "event is created with an auto slug",
    created.status === 201 && /^smoke-test-mandap-\d+$/.test(ev?.slug ?? ""),
    created.json,
  );
  check("publishing stamps publishedAt", !!ev?.publishedAt);
  const dup = await call("/api/admin/events", { method: "POST", cookie, json: { ...payload, title: payload.title } });
  check("same title gets a different slug", dup.status === 201 && dup.json?.data?.slug !== ev.slug, dup.json);
  const list = await call(`/api/admin/events?category=wedding-decor&q=smoke&limit=5`, { cookie });
  check(
    "list filters and omits heavy image arrays",
    list.status === 200 && list.json?.meta?.total >= 2 && list.json.data[0].images === undefined,
    list.json?.meta,
  );
  const one = await call(`/api/admin/events/${ev._id}`, { cookie });
  check("single event includes its gallery", one.json?.data?.images?.length === 2);
  check(
    "bad id is a 400, unknown id a 404",
    (await call("/api/admin/events/not-an-id", { cookie })).status === 400 &&
      (await call("/api/admin/events/507f1f77bcf86cd799439011", { cookie })).status === 404,
  );

  const dropped = images[1];
  const patched = await call(`/api/admin/events/${ev._id}`, {
    method: "PATCH",
    cookie,
    json: { images: [images[0]], title: payload.title + " (edited)" },
  });
  check("event can be edited", patched.status === 200 && patched.json?.data?.images?.length === 1, patched.json);
  const gone = await fetch(BASE + dropped.url);
  check("removed image's files are deleted from storage", gone.status === 404, gone.status);
  const stillThere = await fetch(BASE + images[0].url);
  check("kept image is untouched", stillThere.status === 200);

  // --- public lead form ---
  const leadBody = {
    name: "Smoke Tester",
    phone: "+91 90000 11111",
    email: "smoke@example.com",
    eventType: "wedding-decor",
    city: "Jaipur",
    guestCount: "200",
    utm: { source: "instagram", campaign: "smoke" },
  };
  const lead = await call("/api/leads", { method: "POST", json: leadBody });
  check("public lead form accepts a valid enquiry (no login)", lead.status === 201, lead.json);
  check(
    "invalid phone is rejected",
    (await call("/api/leads", { method: "POST", json: { ...leadBody, phone: "123" } })).status === 400,
  );
  const bot = await call("/api/leads", { method: "POST", json: { ...leadBody, name: "Bot Botson", website: "http://spam" } });
  check("honeypot submissions look successful", bot.status === 201);
  const leads = await call("/api/admin/leads?q=Smoke", { cookie });
  const mine = (leads.json?.data ?? []).find((l: Json) => l.name === "Smoke Tester");
  check("lead appears in the admin inbox with UTM data", !!mine && mine.utm?.source === "instagram", leads.json?.meta);
  const botLeads = await call("/api/admin/leads?q=Bot%20Botson", { cookie });
  check("honeypot lead was not stored", (botLeads.json?.data ?? []).length === 0);
  const upd = await call(`/api/admin/leads/${mine._id}`, {
    method: "PATCH",
    cookie,
    json: { status: "contacted", addNote: "Called, wants a quote" },
  });
  check("lead status and note update", upd.json?.data?.status === "contacted" && upd.json.data.notes?.length === 1, upd.json);
  const csv = await call("/api/admin/leads/export?status=contacted", { cookie });
  check("CSV export works", csv.status === 200 && csv.text.includes("Smoke Tester") && csv.text.includes("createdAt"));

  // --- roles ---
  const editorEmail = `editor-${Date.now()}@example.com`;
  const mk = await call("/api/admin/users", {
    method: "POST",
    cookie,
    json: { name: "Partner", email: editorEmail, password: "partner-pass-123", role: "editor" },
  });
  check("admin can create an editor", mk.status === 201, mk.json);
  const ed = await login(editorEmail, "partner-pass-123");
  check("editor can log in", ed.status === 200 && !!ed.cookie, ed.json);
  check("editor can view events", (await call("/api/admin/events", { cookie: ed.cookie })).status === 200);
  check(
    "editor cannot delete leads",
    (await call(`/api/admin/leads/${mine._id}`, { method: "DELETE", cookie: ed.cookie })).status === 403,
  );
  check("editor cannot list users", (await call("/api/admin/users", { cookie: ed.cookie })).status === 403);
  const dis = await call(`/api/admin/users/${mk.json.data.id}`, { method: "PATCH", cookie, json: { active: false } });
  check("admin can disable the editor", dis.status === 200 && dis.json?.data?.active === false, dis.json);
  check(
    "a disabled user's existing session stops working immediately",
    (await call("/api/auth/me", { cookie: ed.cookie })).status === 401,
  );

  // --- cleanup ---
  check(
    "editor account removed",
    (await call(`/api/admin/users/${mk.json.data.id}`, { method: "DELETE", cookie })).status === 200,
  );
  check("lead removed", (await call(`/api/admin/leads/${mine._id}`, { method: "DELETE", cookie })).status === 200);
  for (const id of [ev._id, dup.json?.data?._id].filter(Boolean)) {
    await call(`/api/admin/events/${id}`, { method: "DELETE", cookie });
  }
  const afterDelete = await fetch(BASE + images[0].url);
  check("deleting an event removes its image files", afterDelete.status === 404, afterDelete.status);
  check(
    "logout clears the cookie",
    (await call("/api/auth/logout", { method: "POST", cookie })).res.headers.getSetCookie().join().includes("Max-Age=0"),
  );

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
