"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { USER_ROLES } from "@/lib/constants";
import { api, errorMessage, fieldErrors } from "./api";
import { useApi } from "./use-api";
import { useAdmin } from "./providers";
import { useMe } from "./shell";
import { Button, EmptyState, ErrorBlock, Field, formatDate, LoadingBlock, PageHeader, Pill, SelectInput, Switch, TextInput } from "./ui";
import type { Role, UserRecord } from "./types";

type Draft = { id?: string; name: string; email: string; password: string; role: Role; active: boolean };
const BLANK: Draft = { name: "", email: "", password: "", role: "editor", active: true };
const ROLE_LABEL: Record<Role, string> = { admin: "Admin", editor: "Editor" };

export function UsersManager() {
  const me = useMe();
  const { success, error: toastError, confirm } = useAdmin();
  const users = useApi<UserRecord[]>(me.role === "admin" ? "/api/admin/users" : null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (draft && !el.open) el.showModal();
    if (!draft && el.open) el.close();
  }, [draft]);

  if (me.role !== "admin") {
    return (
      <>
        <PageHeader title="Team" />
        <EmptyState title="Only admins can manage the team" description="Ask an admin if you need to add someone or change a password." />
      </>
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setErrors({});
    try {
      if (draft.id) {
        await api(`/api/admin/users/${draft.id}`, {
          method: "PATCH",
          json: { name: draft.name, role: draft.role, active: draft.active, ...(draft.password ? { password: draft.password } : {}) },
        });
        success("Changes saved");
      } else {
        await api("/api/admin/users", {
          method: "POST",
          json: { name: draft.name, email: draft.email, password: draft.password, role: draft.role },
        });
        success("Team member added");
      }
      setDraft(null);
      users.reload();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) toastError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(u: UserRecord) {
    if (!(await confirm({ title: `Remove ${u.name}?`, message: "They will no longer be able to sign in.", confirmLabel: "Remove", danger: true }))) return;
    try {
      await api(`/api/admin/users/${u._id}`, { method: "DELETE" });
      success("Team member removed");
      users.reload();
    } catch (err) {
      toastError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Admins can do everything. Editors can manage events, services, testimonials and enquiries."
        actions={<Button onClick={() => (setErrors({}), setDraft(BLANK))}>Add team member</Button>}
      />

      {users.error ? (
        <ErrorBlock message={users.error} onRetry={users.reload} />
      ) : users.loading && !users.data ? (
        <LoadingBlock />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {users.data?.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-semibold text-ink">
                  {u.name} {u._id === me.id && <span className="font-normal text-muted">(you)</span>}
                </p>
                <p className="truncate text-sm text-muted">{u.email}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Pill tone={u.role === "admin" ? "brand" : "neutral"}>{ROLE_LABEL[u.role]}</Pill>
                  {!u.active && <Pill tone="danger">Disabled</Pill>}
                  <span className="text-xs text-muted">{u.lastLoginAt ? `Last signed in ${formatDate(u.lastLoginAt, true)}` : "Never signed in"}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => (setErrors({}), setDraft({ id: u._id, name: u.name, email: u.email, password: "", role: u.role, active: u.active }))}>
                  Edit
                </Button>
                {u._id !== me.id && (
                  <Button variant="danger" className="min-h-9 px-3" onClick={() => remove(u)}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          setDraft(null);
        }}
        className="m-auto w-[min(94vw,28rem)] rounded-xl border border-line bg-card p-0 text-text shadow-2xl"
      >
        {draft && (
          <form onSubmit={save} noValidate autoComplete="off">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-ink">{draft.id ? "Edit team member" : "Add team member"}</h2>
            </div>
            <div className="space-y-5 px-5 py-5">
              <Field label="Name" error={errors.name}>
                {(p) => <TextInput {...p} required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
              </Field>
              <Field label="Email" error={errors.email}>
                {(p) => (
                  <TextInput {...p} type="email" required disabled={!!draft.id} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                )}
              </Field>
              <Field
                label={draft.id ? "New password" : "Password"}
                hint={draft.id ? "Leave empty to keep the current password. Changing it signs them out everywhere." : "At least 10 characters, with letters and numbers."}
                error={errors.password}
              >
                {(p) => (
                  <TextInput {...p} type="password" autoComplete="new-password" required={!draft.id} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                )}
              </Field>
              <Field label="Role" error={errors.role}>
                {(p) => (
                  <SelectInput {...p} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>
              {draft.id && draft.id !== me.id && (
                <Switch
                  checked={draft.active}
                  onChange={(v) => setDraft({ ...draft, active: v })}
                  label="Can sign in"
                  description="Turn off to block access without deleting the account."
                />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                {draft.id ? "Save changes" : "Add team member"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
