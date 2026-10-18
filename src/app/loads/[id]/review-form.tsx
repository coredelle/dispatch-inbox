"use client";

import { useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EQUIPMENT_TYPES, MISSING_FIELD_LABELS, STATUS_LABELS, computeMissing, formatDateTime, isFlagged, normalizeFields } from "@/lib/loads";
import { cn } from "@/lib/utils";
import type { Load, LoadFields, LoadStatus } from "@/types";

function labelFor(key: string) {
  return MISSING_FIELD_LABELS[key] ?? key.replace(/[._]/g, " ");
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", wide && "sm:col-span-2")}>
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="section-bar">{title}</div>
      <div className="grid gap-3 px-1 sm:grid-cols-2">{children}</div>
    </div>
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
  // Only animate the stamp when the reviewer changes the status, not on page load
  const [stamped, setStamped] = useState(false);

  const locked = status === "approved" || status === "rejected";
  // Missing is recomputed live from the edited values; low-confidence comes from the model
  const missing = fields ? computeMissing(normalizeFields(fields)) : [];
  const lowConfidence = fields?.low_confidence_fields ?? [];

  // Each input carries a data-flag that the stylesheet colors red (missing) or amber (unclear)
  function flag(path: string): "missing" | "low" | undefined {
    const [section, leaf] = path.split(".");
    const group = leaf === "earliest" || leaf === "latest" ? `${section}.date` : undefined;
    if (isFlagged(missing, path, group)) return "missing";
    if (isFlagged(lowConfidence, path, group)) return "low";
    return undefined;
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
    if (data.status !== status) setStamped(true);
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

  // A fresh extraction arrives without a follow-up; write it now, while the reviewer reads the record
  const autoDrafted = useRef(false);
  useEffect(() => {
    if (autoDrafted.current || !fields || draft || status !== "needs_review") return;
    if (computeMissing(normalizeFields(fields)).length === 0) return;
    autoDrafted.current = true;
    regenerate();
    // Runs once on arrival; later drafts come from the Regenerate button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      setMessage({ text: "Couldn't copy automatically. Select the draft text and copy it.", error: true });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const input = (path: string, value: string | number | null, onChange: (v: string) => void, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="field-input" data-flag={flag(path)} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...extra} />
  );
  const dateProps = { placeholder: "YYYY-MM-DDTHH:MM" };
  const internalId = load.id.slice(0, 8).toUpperCase();
  const primaryRef = fields?.reference_numbers.find((r) => r.trim()) ?? null;

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
        <div className="flex flex-col gap-1">
          {/* Dispatchers look loads up by the shipper's PO or reference, so lead with it */}
          <span className="eyebrow">{primaryRef ? "Shipper reference" : "Load №"}</span>
          <h1 className="doc-title break-all text-4xl">{primaryRef ?? internalId}</h1>
          <span className="font-mono text-xs text-muted-foreground">
            Received {formatDateTime(load.created_at.slice(0, 10))}
            {primaryRef && ` · ID ${internalId}`}
          </span>
        </div>
        <Stamp key={status} status={status} size="lg" land={stamped} className="mt-2 mr-1 shrink-0 max-sm:text-base" />
      </div>

      {!fields ? (
        <div className="sheet p-4 text-sm">
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
            <div className="flex flex-col gap-1.5 text-sm">
              {missing.length > 0 && (
                <p className="flex flex-wrap items-center gap-2">
                  <span data-status="missing" className="stamp stamp-sm">Missing</span>
                  {missing.map(labelFor).join(", ")}
                </p>
              )}
              {lowConfidence.length > 0 && (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow rounded-sm bg-flag-low-bg px-1.5 py-0.5 text-flag-low">Double-check</span>
                  {lowConfidence.map(labelFor).join(", ")}
                </p>
              )}
            </div>
          )}

          <fieldset disabled={locked || saving} className="sheet flex flex-col gap-5 p-4">
            <FormSection title="Shipper">
              <Field label="Company" wide>{input("shipper_name", fields.shipper_name, (v) => update((f) => { f.shipper_name = v; }))}</Field>
            </FormSection>

            <FormSection title="Pickup">
              <Field label="Location" wide>{input("pickup.location", fields.pickup.location, (v) => update((f) => { f.pickup.location = v; }))}</Field>
              <Field label="Earliest">{input("pickup.earliest", fields.pickup.earliest, (v) => update((f) => { f.pickup.earliest = v; }), dateProps)}</Field>
              <Field label="Latest">{input("pickup.latest", fields.pickup.latest, (v) => update((f) => { f.pickup.latest = v; }), dateProps)}</Field>
            </FormSection>

            <FormSection title="Delivery">
              <Field label="Location" wide>{input("delivery.location", fields.delivery.location, (v) => update((f) => { f.delivery.location = v; }))}</Field>
              <Field label="Earliest">{input("delivery.earliest", fields.delivery.earliest, (v) => update((f) => { f.delivery.earliest = v; }), dateProps)}</Field>
              <Field label="Latest">{input("delivery.latest", fields.delivery.latest, (v) => update((f) => { f.delivery.latest = v; }), dateProps)}</Field>
            </FormSection>

            <FormSection title="Freight">
              <Field label="Commodity" wide>{input("commodity", fields.commodity, (v) => update((f) => { f.commodity = v; }))}</Field>
              <Field label="Weight (lbs)">{input("weight_lbs", fields.weight_lbs, (v) => update((f) => { f.weight_lbs = v as unknown as number; }), { inputMode: "decimal" })}</Field>
              <Field label="Equipment">
                <select
                  className="field-input"
                  data-flag={flag("equipment_type")}
                  value={fields.equipment_type}
                  onChange={(e) => update((f) => { f.equipment_type = e.target.value as LoadFields["equipment_type"]; })}
                >
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </Field>
            </FormSection>

            <FormSection title="Rate & references">
              <Field label="Rate (USD)">{input("rate_usd", fields.rate_usd, (v) => update((f) => { f.rate_usd = v as unknown as number; }), { inputMode: "decimal" })}</Field>
              <Field label="References (comma separated)">
                {input("reference_numbers", fields.reference_numbers.join(", "), (v) => update((f) => { f.reference_numbers = v.split(",").map((r) => r.trimStart()); }))}
              </Field>
            </FormSection>

            <FormSection title="Contact">
              <Field label="Name">{input("contact.name", fields.contact.name, (v) => update((f) => { f.contact.name = v; }))}</Field>
              <Field label="Phone">{input("contact.phone", fields.contact.phone, (v) => update((f) => { f.contact.phone = v; }))}</Field>
              <Field label="Email" wide>{input("contact.email", fields.contact.email, (v) => update((f) => { f.contact.email = v; }), { type: "email" })}</Field>
              <Field label="They're asking" wide>{input("sender_requests", fields.sender_requests, (v) => update((f) => { f.sender_requests = v; }))}</Field>
              <Field label="Special instructions" wide>
                <Textarea
                  value={fields.special_instructions ?? ""}
                  onChange={(e) => update((f) => { f.special_instructions = e.target.value; })}
                  className="min-h-20 rounded-sm bg-card font-mono text-sm"
                />
              </Field>
            </FormSection>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            {locked ? (
              <Button variant="outline" disabled={saving} onClick={() => save("needs_review")}>
                Reopen for edits
              </Button>
            ) : (
              <>
                <Button
                  disabled={saving}
                  onClick={() => save("approved")}
                  className="border border-foreground bg-hivis px-4 font-semibold text-hivis-foreground hover:bg-hivis/85"
                >
                  Approve
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => save("rejected")}>Reject</Button>
                <Button variant="ghost" disabled={saving || !dirty} onClick={() => save()}>Save changes</Button>
              </>
            )}
            {message && (
              <p className={cn("text-sm", message.error ? "text-destructive" : "text-muted-foreground")}>{message.text}</p>
            )}
          </div>

          {(missing.length > 0 || draft) && (
            <div className="perforated flex flex-col gap-2 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="eyebrow">Carbon copy</div>
                  <h2 className="doc-title text-2xl">Follow-up email</h2>
                </div>
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
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-40 rounded-sm bg-card font-mono text-sm leading-relaxed"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {drafting ? "Drafting a follow-up asking for what's missing…" : "No draft yet. Click Regenerate to write one."}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Copy this into your own email. The app never sends email.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
