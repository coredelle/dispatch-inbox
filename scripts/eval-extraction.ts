// Runs every sample through the app's extraction code and scores it, field by
// field, against sample-data/expected.json. Samples with missing details also get
// a follow-up draft, checked against simple rules. Costs about a cent per sample.
//   npm run eval            all samples; writes sample-data/eval-results.json
//   npm run eval -- 05      only samples whose path contains "05" (no results file)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractFromEmail, extractFromPdf } from "@/lib/anthropic/extract";
import { draftFollowup } from "@/lib/anthropic/followup";
import { FOLLOWUP_MODEL_NAME, FOLLOWUP_SIGNATURE, MODEL_NAME } from "@/lib/config";
import { computeMissing, normalizeFields } from "@/lib/loads";
import answerKey from "../sample-data/expected.json";

interface Expected {
  shipper: string | null;
  pickup_city: string;
  pickup_date?: string | null;
  pickup_time?: string;
  delivery_city: string;
  delivery_date?: string | null;
  delivery_time?: string;
  weight_lbs: number | null;
  equipment: string;
  rate_usd?: number | null;
  refs: string[];
  contact: string;
  missing: string[];
  ambiguous?: string[];
  expect_low?: string[];
  allow_low?: string[];
  asks?: boolean;
  known_limitation?: string;
}

// Field groups reported in the results, in display order
const FIELDS = [
  "Shipper", "Pickup location", "Pickup date", "Delivery location", "Delivery date",
  "Weight", "Equipment", "Rate", "References", "Contact",
  "Missing-field flags", "Uncertainty flags", "Sender's ask", "Follow-up draft",
] as const;
type Field = (typeof FIELDS)[number];

// Fixed "today" so relative dates in samples without a sent date resolve the same way every run
const RECEIVED_AT = new Date("2026-11-02T15:00:00Z");
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const STREET_ADDRESS = /\b\d{2,5} [A-Z][\w.]*( [A-Z][\w.]*)* (St|Ave|Rd|Blvd|Dr|Hwy|Pkwy|Ln|Way|Expy)\b/;
// "We can cover it" is a promise; "whether we can cover it" is not
const PROMISE = /(?<!\b(whether|if) )\b(we|I)('ll| will| can| are able to) (cover|take|haul|accept)\b|\bwe're booked\b/i;

// "pickup.earliest" / "pickup.latest" count as "pickup.date"
const canonical = (key: string) => key.replace(/\.(earliest|latest)$/, ".date");

async function main() {
  const filter = process.argv[2];
  const entries = Object.entries(answerKey).filter(
    ([file]) => file !== "_readme" && (!filter || file.includes(filter)),
  ) as [string, Expected][];

  const tally = Object.fromEntries(FIELDS.map((f) => [f, { correct: 0, total: 0 }])) as Record<Field, { correct: number; total: number }>;
  const samples: { file: string; passed: boolean; failures: string[]; knownLimitation?: string }[] = [];
  let totalCost = 0;
  let totalLatency = 0;

  for (const [file, exp] of entries) {
    const fullPath = path.join(process.cwd(), "sample-data", file);
    const outcome = file.endsWith(".pdf")
      ? await extractFromPdf((await readFile(fullPath)).toString("base64"), RECEIVED_AT)
      : await extractFromEmail(await readFile(fullPath, "utf8"), RECEIVED_AT);
    totalCost += outcome.estCostUsd;
    totalLatency += outcome.latencyMs;

    const failures: string[] = [];
    const warnings: string[] = [];
    // Scores one field for this sample; a field can have several checks, all must pass
    const results = new Map<Field, boolean>();
    const check = (field: Field, ok: boolean, msg: string) => {
      results.set(field, (results.get(field) ?? true) && ok);
      if (!ok) failures.push(`${field}: ${msg}`);
    };

    if (!outcome.fields) {
      failures.push(`no fields (${outcome.stopReason}: ${outcome.error})`);
    } else {
      const f = normalizeFields(outcome.fields);
      const missing = computeMissing(f);
      const low = new Set(f.low_confidence_fields.map(canonical));
      const flagged = (key: string) => low.has(key) || low.has(key.split(".")[0]);
      const ambiguous = exp.ambiguous ?? [];
      const lc = (s: string | null) => (s ?? "").toLowerCase();

      if (exp.shipper === null) {
        check("Shipper", f.shipper_name === null, `expected none, got "${f.shipper_name}"`);
      } else {
        check("Shipper", lc(f.shipper_name).includes(lc(exp.shipper)), `got "${f.shipper_name}"`);
      }
      check("Pickup location", lc(f.pickup.location).includes(lc(exp.pickup_city)), `got "${f.pickup.location}"`);
      check("Delivery location", lc(f.delivery.location).includes(lc(exp.delivery_city)), `got "${f.delivery.location}"`);

      for (const side of ["pickup", "delivery"] as const) {
        const field = side === "pickup" ? "Pickup date" : "Delivery date";
        const want = exp[`${side}_date`];
        const time = exp[`${side}_time`];
        const { earliest, latest } = f[side];
        if (ambiguous.includes(`${side}.date`)) {
          check(field, (!earliest && !latest) || flagged(`${side}.date`), `ambiguous, but given confidently (${earliest} / ${latest})`);
        } else if (want === null) {
          check(field, !earliest && !latest, `expected none, got ${earliest} / ${latest}`);
        } else if (want) {
          check(field, [earliest, latest].some((d) => d?.startsWith(want)), `expected ${want}, got ${earliest} / ${latest}`);
          if (time) check(field, [earliest, latest].some((d) => d?.endsWith(`T${time}`)), `expected a ${time} time, got ${earliest} / ${latest}`);
        }
        for (const d of [earliest, latest]) {
          if (d && !DATE_FORMAT.test(d)) warnings.push(`${side} date format: "${d}"`);
        }
      }

      if (ambiguous.includes("weight_lbs")) {
        check("Weight", missing.includes("weight_lbs") || flagged("weight_lbs"), `ambiguous, but given confidently (${f.weight_lbs})`);
      } else if (exp.weight_lbs === null) {
        check("Weight", f.weight_lbs === null, `expected none, got ${f.weight_lbs}`);
      } else {
        check(
          "Weight",
          f.weight_lbs !== null && Math.abs(f.weight_lbs - exp.weight_lbs) / exp.weight_lbs < 0.005,
          `expected ~${exp.weight_lbs}, got ${f.weight_lbs}`,
        );
      }
      check("Equipment", f.equipment_type === exp.equipment, `expected ${exp.equipment}, got ${f.equipment_type}`);
      if (ambiguous.includes("rate_usd")) {
        check("Rate", missing.includes("rate_usd") || flagged("rate_usd"), `ambiguous, but given confidently (${f.rate_usd})`);
      } else {
        check("Rate", f.rate_usd === (exp.rate_usd ?? null), `expected ${exp.rate_usd}, got ${f.rate_usd}`);
      }
      const missingRefs = exp.refs.filter((ref) => !f.reference_numbers.some((r) => r.includes(ref)));
      check("References", missingRefs.length === 0, `${JSON.stringify(missingRefs)} not in ${JSON.stringify(f.reference_numbers)}`);
      check("Contact", lc(f.contact.name).includes(lc(exp.contact)), `expected ${exp.contact}, got "${f.contact.name}"`);

      const relevantMissing = missing.filter((m) => !ambiguous.includes(m));
      check(
        "Missing-field flags",
        JSON.stringify([...relevantMissing].sort()) === JSON.stringify([...exp.missing].sort()),
        `expected ${JSON.stringify(exp.missing)}, got ${JSON.stringify(relevantMissing)}`,
      );

      // Uncertain values must be flagged; only scored where the key expects a flag
      if (exp.expect_low?.length) {
        for (const key of exp.expect_low) check("Uncertainty flags", flagged(key), `expected ${key} flagged; flags: ${JSON.stringify([...low])}`);
      }
      const allowed = new Set([...(exp.expect_low ?? []), ...(exp.allow_low ?? []), ...ambiguous]);
      for (const key of low) {
        if (!allowed.has(key)) warnings.push(`unexpected low-confidence flag: ${key}`);
      }

      if (exp.asks !== undefined) {
        check("Sender's ask", (f.sender_requests !== null) === exp.asks, `expected ${exp.asks ? "an ask" : "none"}, got "${f.sender_requests}"`);
      }

      // The follow-up: signed, no placeholders or street addresses, no promises, short
      if (missing.length > 0) {
        const followup = await draftFollowup(f, missing);
        totalCost += followup.estCostUsd;
        const draft = followup.draft ?? "";
        const words = draft.split(/\s+/).filter(Boolean).length;
        check("Follow-up draft", Boolean(followup.draft), "no draft");
        check("Follow-up draft", draft.endsWith(`Thanks,\n${FOLLOWUP_SIGNATURE}`), "not signed");
        check("Follow-up draft", !/\[[^\]]*\]/.test(draft), "has a placeholder");
        check("Follow-up draft", !STREET_ADDRESS.test(draft), `repeats a street address: "${draft.match(STREET_ADDRESS)?.[0]}"`);
        check("Follow-up draft", !PROMISE.test(draft), `promises something: "${draft.match(PROMISE)?.[0]}"`);
        check("Follow-up draft", words <= 110, `${words} words`);
      }
    }

    for (const [field, ok] of results) {
      tally[field].total++;
      if (ok) tally[field].correct++;
    }
    const passed = failures.length === 0;
    samples.push({ file, passed, failures, ...(exp.known_limitation ? { knownLimitation: exp.known_limitation } : {}) });

    const stats = `${(outcome.latencyMs / 1000).toFixed(1)}s, $${outcome.estCostUsd.toFixed(4)}`;
    const note = exp.known_limitation ? "  [known limitation]" : "";
    console.log(`${passed ? "PASS" : "FAIL"}  ${file}  (${stats})${note}`);
    for (const msg of failures) console.log(`   ✗ ${msg}`);
    for (const msg of warnings) console.log(`   ~ ${msg}`);
  }

  const passedCount = samples.filter((s) => s.passed).length;
  console.log("\nField accuracy");
  for (const field of FIELDS) {
    const { correct, total } = tally[field];
    if (total) console.log(`  ${field.padEnd(20)} ${correct}/${total}`);
  }
  console.log(
    `\n${passedCount}/${entries.length} samples fully correct · total $${totalCost.toFixed(4)} · avg extraction ${(totalLatency / entries.length / 1000).toFixed(1)}s`,
  );

  // The case study reads this file, so its numbers always match the last full run
  if (!filter) {
    const results = {
      runAt: new Date().toISOString(),
      extractionModel: MODEL_NAME,
      followupModel: FOLLOWUP_MODEL_NAME,
      samples: entries.length,
      emails: entries.filter(([file]) => file.startsWith("emails/")).length,
      pdfs: entries.filter(([file]) => file.endsWith(".pdf")).length,
      fullyCorrect: passedCount,
      fields: FIELDS.filter((f) => tally[f].total > 0).map((f) => ({ field: f, ...tally[f] })),
      totalCostUsd: Number(totalCost.toFixed(4)),
      avgExtractionSeconds: Number((totalLatency / entries.length / 1000).toFixed(1)),
      failures: samples.filter((s) => !s.passed),
    };
    await writeFile(path.join(process.cwd(), "sample-data/eval-results.json"), JSON.stringify(results, null, 2) + "\n");
    console.log("Wrote sample-data/eval-results.json");
  }
}

main();
