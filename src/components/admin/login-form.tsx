"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, errorMessage } from "./api";
import { Button, Field, TextInput } from "./ui";

/** Only allow redirects back into the admin area (blocks open redirects). */
function safeNext(raw: string | null) {
  return raw && /^\/admin(\/|$|\?)/.test(raw) && !raw.startsWith("//") ? raw : "/admin";
}

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      // Full page load on purpose, so the new session cookie is used from the first request.
      window.location.assign(safeNext(params.get("next")));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_28rem]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(140_29_79/0.55),transparent_55%),radial-gradient(circle_at_80%_90%,rgb(201_138_11/0.28),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-14">
          <p className="font-display text-3xl font-semibold text-white">ShubhKaaraj</p>
          <div>
            <p className="max-w-md font-display text-5xl font-medium leading-[1.1] tracking-tight text-white">
              Every mandap, every enquiry, in one place.
            </p>
            <p className="mt-5 max-w-sm text-white/65">Add new events with photos, reply to enquiries and keep the website fresh.</p>
          </div>
          <p className="text-sm text-white/45">Weddings and corporate events: decor and planning</p>
        </div>
      </div>

      <main className="grid place-items-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <p className="font-display text-2xl font-semibold text-ink lg:hidden">ShubhKaaraj</p>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink lg:mt-0">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted">Use the email and password you were given.</p>

          <div className="mt-8 space-y-5">
            <Field label="Email">
              {(p) => (
                <TextInput {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <TextInput
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} disabled={!email || !password} className="mt-6 w-full">
            Sign in
          </Button>
        </form>
      </main>
    </div>
  );
}
