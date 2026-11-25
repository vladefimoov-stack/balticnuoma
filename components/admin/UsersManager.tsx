"use client";

import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/booking-actions";
import {
  changeMyPassword,
  createUser,
  deleteUser,
  setUserPassword,
  setUserRole,
  updateMyName,
} from "@/lib/admin/settings-actions";
import { adminInput, adminLabel, Card, CardTitle, Notice } from "./ui";

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "manager";
  lastSignIn: string | null;
};

const ROLE_LABEL = { admin: "Administratorius", manager: "Vadybininkas" };

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "manager" });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const run = (action: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) after?.();
    });

  return (
    <div className="flex flex-col gap-5">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}

      <Card>
        <CardTitle>Naudotojai</CardTitle>
        <ul className="flex flex-col divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {u.name || "—"} {u.id === meId && <span className="text-xs text-muted">(jūs)</span>}
                  </p>
                  <p className="text-sm text-muted">{u.email}</p>
                  <p className="text-xs text-muted">
                    Paskutinis prisijungimas:{" "}
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString("lt-LT") : "dar nesijungė"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`${u.email} rolė`}
                    value={u.role}
                    disabled={pending || u.id === meId}
                    onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
                    className={`${adminInput} h-9 w-auto`}
                  >
                    <option value="manager">{ROLE_LABEL.manager}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => setResetFor(resetFor === u.id ? null : u.id)}>
                    <KeyRound className="size-3.5" aria-hidden /> Slaptažodis
                  </Button>
                  {u.id !== meId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      aria-label={`Ištrinti ${u.email}`}
                      onClick={() => window.confirm(`Ištrinti naudotoją ${u.email}?`) && run(() => deleteUser(u.id))}
                      className="hover:text-busy"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
              {resetFor === u.id && (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      () => setUserPassword(u.id, newPassword),
                      () => {
                        setResetFor(null);
                        setNewPassword("");
                      },
                    );
                  }}
                >
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className={adminLabel}>Naujas slaptažodis (bent 10 simbolių)</span>
                    <input
                      type="text"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={adminInput}
                    />
                  </label>
                  <Button type="submit" size="sm" disabled={pending} className="h-11">
                    Nustatyti
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Naujas naudotojas</CardTitle>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createUser(form),
              () => setForm({ email: "", password: "", name: "", role: "manager" }),
            );
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Vardas, pavardė</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>El. paštas</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Laikinas slaptažodis (bent 10 simbolių)</span>
            <input
              required
              type="text"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Rolė</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={adminInput}
            >
              <option value="manager">{ROLE_LABEL.manager} — be nustatymų ir trynimo</option>
              <option value="admin">{ROLE_LABEL.admin} — visos teisės</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="size-4" aria-hidden />
              )}
              Sukurti naudotoją
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function AccountForms({ name }: { name: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [fullName, setFullName] = useState(name);
  const [password, setPassword] = useState({ next: "", repeat: "" });

  return (
    <div className="flex flex-col gap-5">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}
      <Card>
        <CardTitle>Vardas</CardTitle>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setResult(await updateMyName(fullName)));
          }}
        >
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={adminLabel}>Vardas, pavardė</span>
            <input
              value={fullName}
              maxLength={120}
              onChange={(e) => setFullName(e.target.value)}
              className={adminInput}
            />
          </label>
          <Button type="submit" size="sm" disabled={pending} className="h-11">
            Išsaugoti
          </Button>
        </form>
      </Card>
      <Card>
        <CardTitle>Slaptažodžio keitimas</CardTitle>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await changeMyPassword(password.next, password.repeat);
              setResult(res);
              if (res.ok) setPassword({ next: "", repeat: "" });
            });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Naujas slaptažodis (bent 10 simbolių)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password.next}
              onChange={(e) => setPassword({ ...password, next: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Pakartokite</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password.repeat}
              onChange={(e) => setPassword({ ...password, repeat: e.target.value })}
              className={adminInput}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              Pakeisti slaptažodį
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
