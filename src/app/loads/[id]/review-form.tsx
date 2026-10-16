"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EQUIPMENT_TYPES, normalizeFields } from "@/lib/loads";
import type { Load, LoadFields, LoadStatus } from "@/types";

const STATUS_LABELS: Record<LoadStatus, string> = {
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-60";

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

  const locked = status === "approved" || status === "rejected";

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

  async function save(nextStatus?: LoadStatus) {
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
      return;
    }
    if (data.fields) setFields(data.fields);
    setStatus(data.status);
    setDirty(false);
    setMessage({ text: nextStatus ? `Marked ${STATUS_LABELS[data.status as LoadStatus].toLowerCase()}.` : "Changes saved." });
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
        <fieldset disabled={locked || saving} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Shipper">
              <input className={inputClass} value={fields.shipper_name ?? ""} onChange={(e) => update((f) => { f.shipper_name = e.target.value; })} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Pickup location">
              <input className={inputClass} value={fields.pickup.location ?? ""} onChange={(e) => update((f) => { f.pickup.location = e.target.value; })} />
            </Field>
          </div>
          <Field label="Pickup earliest">
            <input className={inputClass} placeholder="YYYY-MM-DDTHH:MM" value={fields.pickup.earliest ?? ""} onChange={(e) => update((f) => { f.pickup.earliest = e.target.value; })} />
          </Field>
          <Field label="Pickup latest">
            <input className={inputClass} placeholder="YYYY-MM-DDTHH:MM" value={fields.pickup.latest ?? ""} onChange={(e) => update((f) => { f.pickup.latest = e.target.value; })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Delivery location">
              <input className={inputClass} value={fields.delivery.location ?? ""} onChange={(e) => update((f) => { f.delivery.location = e.target.value; })} />
            </Field>
          </div>
          <Field label="Delivery earliest">
            <input className={inputClass} placeholder="YYYY-MM-DDTHH:MM" value={fields.delivery.earliest ?? ""} onChange={(e) => update((f) => { f.delivery.earliest = e.target.value; })} />
          </Field>
          <Field label="Delivery latest">
            <input className={inputClass} placeholder="YYYY-MM-DDTHH:MM" value={fields.delivery.latest ?? ""} onChange={(e) => update((f) => { f.delivery.latest = e.target.value; })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Commodity">
              <input className={inputClass} value={fields.commodity ?? ""} onChange={(e) => update((f) => { f.commodity = e.target.value; })} />
            </Field>
          </div>
          <Field label="Weight (lbs)">
            <input className={inputClass} inputMode="decimal" value={fields.weight_lbs ?? ""} onChange={(e) => update((f) => { f.weight_lbs = e.target.value as unknown as number; })} />
          </Field>
          <Field label="Equipment">
            <select className={inputClass} value={fields.equipment_type} onChange={(e) => update((f) => { f.equipment_type = e.target.value as LoadFields["equipment_type"]; })}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate (USD)">
            <input className={inputClass} inputMode="decimal" value={fields.rate_usd ?? ""} onChange={(e) => update((f) => { f.rate_usd = e.target.value as unknown as number; })} />
          </Field>
          <Field label="Reference numbers (comma separated)">
            <input className={inputClass} value={fields.reference_numbers.join(", ")} onChange={(e) => update((f) => { f.reference_numbers = e.target.value.split(",").map((s) => s.trimStart()); })} />
          </Field>

          <Field label="Contact name">
            <input className={inputClass} value={fields.contact.name ?? ""} onChange={(e) => update((f) => { f.contact.name = e.target.value; })} />
          </Field>
          <Field label="Contact phone">
            <input className={inputClass} value={fields.contact.phone ?? ""} onChange={(e) => update((f) => { f.contact.phone = e.target.value; })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contact email">
              <input className={inputClass} type="email" value={fields.contact.email ?? ""} onChange={(e) => update((f) => { f.contact.email = e.target.value; })} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Special instructions">
              <Textarea value={fields.special_instructions ?? ""} onChange={(e) => update((f) => { f.special_instructions = e.target.value; })} className="min-h-20 text-sm" />
            </Field>
          </div>
        </fieldset>
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

      {message && (
        <p className={message.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>
      )}
    </section>
  );
}
