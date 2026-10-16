"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EQUIPMENT_TYPES, MISSING_FIELD_LABELS, computeMissing, isFlagged, normalizeFields } from "@/lib/loads";
import { cn } from "@/lib/utils";
import type { Load, LoadFields, LoadStatus } from "@/types";

const STATUS_LABELS: Record<LoadStatus, string> = {
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-60";
const missingClass = "border-red-500 bg-red-50 dark:bg-red-950/40";
const lowClass = "border-amber-500 bg-amber-50 dark:bg-amber-950/40";

function labelFor(key: string) {
  return MISSING_FIELD_LABELS[key] ?? key.replace(/[._]/g, " ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ReviewForm({ load, extractionError }: { load: Load; extractionError: string | null }) {
  const [fields, setFields] = useState<LoadFields | null>(load.fields);
  const [status, setStatus] = useState<LoadStatus>(load.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(load.followup_draft ?? "");
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const locked = status === "approved" || status === "rejected";
  // Missing is recomputed live from the edited values; low-confidence comes from the model
  const missing = fields ? computeMissing(normalizeFields(fields)) : [];
  const lowConfidence = fields?.low_confidence_fields ?? [];

  function cls(path: string) {
    const [section, leaf] = path.split(".");
    const group = leaf === "earliest" || leaf === "latest" ? `${section}.date` : undefined;
    if (isFlagged(missing, path, group)) return cn(inputClass, missingClass);
    if (isFlagged(lowConfidence, path, group)) return cn(inputClass, lowClass);
    return inputClass;
  }

  function update(mutate: (f: LoadFields) => void) {
    setFields((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  async function save(nextStatus?: LoadStatus): Promise<boolean> {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/loads/${load.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(fields && dirty ? { fields: normalizeFields(fields) } : {}),
        ...(nextStatus ? { status: nextStatus } : {}),
      }),
    }).catch(() => null);
    setSaving(false);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) {
      setMessage({ text: data?.error ?? "Could not save. Please try again.", error: true });
      return false;
    }
    if (data.fields) setFields(data.fields);
    setStatus(data.status);
    setDirty(false);
    setMessage({ text: nextStatus ? `Marked ${STATUS_LABELS[data.status as LoadStatus].toLowerCase()}.` : "Changes saved." });
    return true;
  }

  async function regenerate() {
    // Draft from what's saved, so save pending edits first
    if (dirty && !(await save())) return;
    setDrafting(true);
    const res = await fetch(`/api/loads/${load.id}/followup`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setDrafting(false);
    if (!res?.ok || !data) {
      setMessage({ text: data?.error ?? "Could not draft a follow-up email.", error: true });
      return;
    }
    setDraft(data.draft ?? "");
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Review load</h1>
          <Badge variant={status === "approved" ? "default" : status === "needs_review" ? "secondary" : "outline"}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        <Link href="/loads/new" className="text-sm underline">New load</Link>
      </div>

      {!fields ? (
        <div className="rounded-lg border p-4 text-sm">
          <p className="text-destructive">{extractionError ?? "Extraction failed for this load."}</p>
          {status !== "rejected" && (
            <Button variant="outline" className="mt-3" disabled={saving} onClick={() => save("rejected")}>
              Reject
            </Button>
          )}
        </div>
      ) : (
        <>
        {(missing.length > 0 || lowConfidence.length > 0) && (
          <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
            {missing.length > 0 && (
              <p>
                <span className="font-medium text-red-600 dark:text-red-400">Missing:</span>{" "}
                {missing.map(labelFor).join(", ")}
              </p>
            )}
            {lowConfidence.length > 0 && (
              <p>
                <span className="font-medium text-amber-600 dark:text-amber-400">Double-check:</span>{" "}
                {lowConfidence.map(labelFor).join(", ")}
              </p>
            )}
          </div>
        )}
        <fieldset disabled={locked || saving} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Shipper">
              <input className={cls("shipper_name")} value={fields.shipper_name ?? ""} onChange={(e) => update((f) => { f.shipper_name = e.target.value; })} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Pickup location">
              <input className={cls("pickup.location")} value={fields.pickup.location ?? ""} onChange={(e) => update((f) => { f.pickup.location = e.target.value; })} />
            </Field>
          </div>
          <Field label="Pickup earliest">
            <input className={cls("pickup.earliest")} placeholder="YYYY-MM-DDTHH:MM" value={fields.pickup.earliest ?? ""} onChange={(e) => update((f) => { f.pickup.earliest = e.target.value; })} />
          </Field>
          <Field label="Pickup latest">
            <input className={cls("pickup.latest")} placeholder="YYYY-MM-DDTHH:MM" value={fields.pickup.latest ?? ""} onChange={(e) => update((f) => { f.pickup.latest = e.target.value; })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Delivery location">
              <input className={cls("delivery.location")} value={fields.delivery.location ?? ""} onChange={(e) => update((f) => { f.delivery.location = e.target.value; })} />
            </Field>
          </div>
          <Field label="Delivery earliest">
            <input className={cls("delivery.earliest")} placeholder="YYYY-MM-DDTHH:MM" value={fields.delivery.earliest ?? ""} onChange={(e) => update((f) => { f.delivery.earliest = e.target.value; })} />
          </Field>
          <Field label="Delivery latest">
            <input className={cls("delivery.latest")} placeholder="YYYY-MM-DDTHH:MM" value={fields.delivery.latest ?? ""} onChange={(e) => update((f) => { f.delivery.latest = e.target.value; })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Commodity">
              <input className={cls("commodity")} value={fields.commodity ?? ""} onChange={(e) => update((f) => { f.commodity = e.target.value; })} />
            </Field>
          </div>
          <Field label="Weight (lbs)">
            <input className={cls("weight_lbs")} inputMode="decimal" value={fields.weight_lbs ?? ""} onChange={(e) => update((f) => { f.weight_lbs = e.target.value as unknown as number; })} />
          </Field>
          <Field label="Equipment">
            <select className={cls("equipment_type")} value={fields.equipment_type} onChange={(e) => update((f) => { f.equipment_type = e.target.value as LoadFields["equipment_type"]; })}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate (USD)">
            <input className={cls("rate_usd")} inputMode="decimal" value={fields.rate_usd ?? ""} onChange={(e) => update((f) => { f.rate_usd = e.target.value as unknown as number; })} />
          </Field>
          <Field label="Reference numbers (comma separated)">
            <input className={cls("reference_numbers.join")} value={fields.reference_numbers.join(", ")} onChange={(e) => update((f) => { f.reference_numbers = e.target.value.split(",").map((s) => s.trimStart()); })} />
          </Field>

          <Field label="Contact name">
            <input className={cls("contact.name")} value={fields.contact.name ?? ""} onChange={(e) => update((f) => { f.contact.name = e.target.value; })} />
          </Field>
          <Field label="Contact phone">
            <input className={cls("contact.phone")} value={fields.contact.phone ?? ""} onChange={(e) => update((f) => { f.contact.phone = e.target.value; })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contact email">
              <input className={cls("contact.email")} type="email" value={fields.contact.email ?? ""} onChange={(e) => update((f) => { f.contact.email = e.target.value; })} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Special instructions">
              <Textarea value={fields.special_instructions ?? ""} onChange={(e) => update((f) => { f.special_instructions = e.target.value; })} className="min-h-20 text-sm" />
            </Field>
          </div>
        </fieldset>
        </>
      )}

      {fields && (
        <div className="flex flex-wrap items-center gap-2">
          {locked ? (
            <Button variant="outline" disabled={saving} onClick={() => save("needs_review")}>
              Reopen for edits
            </Button>
          ) : (
            <>
              <Button disabled={saving} onClick={() => save("approved")}>Approve</Button>
              <Button variant="outline" disabled={saving} onClick={() => save("rejected")}>Reject</Button>
              <Button variant="ghost" disabled={saving || !dirty} onClick={() => save()}>Save changes</Button>
            </>
          )}
        </div>
      )}

      {fields && (missing.length > 0 || draft) && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Follow-up email draft</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!draft} onClick={copyDraft}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button size="sm" variant="ghost" disabled={drafting || saving || missing.length === 0} onClick={regenerate}>
                {drafting ? "Drafting…" : "Regenerate"}
              </Button>
            </div>
          </div>
          {draft ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-36 text-sm" />
          ) : (
            <p className="text-sm text-muted-foreground">No draft yet. Click Regenerate to write one.</p>
          )}
          <p className="text-xs text-muted-foreground">Copy this into your own email. The app never sends email.</p>
        </div>
      )}

      {message && (
        <p className={message.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>
      )}
    </section>
  );
}
