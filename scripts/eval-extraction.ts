// Runs every sample through the app's extraction code and scores it against
// sample-data/expected.json. Costs roughly a cent per sample.
//   npm run eval            all samples
//   npm run eval -- 05      only samples whose path contains "05"
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractFromEmail, extractFromPdf } from "@/lib/anthropic/extract";
import { computeMissing, normalizeFields } from "@/lib/loads";
import answerKey from "../sample-data/expected.json";

interface Expected {
  shipper: string;
  pickup_city: string;
  pickup_date?: string | null;
  delivery_city: string;
  delivery_date?: string | null;
  weight_lbs: number;
  equipment: string;
  rate_usd?: number | null;
  refs: string[];
  contact: string;
  missing: string[];
  ambiguous?: string[];
  expect_low?: string[];
  allow_low?: string[];
  asks?: boolean;
}

// Fixed "today" so relative dates in samples without a sent date resolve the same way every run
const RECEIVED_AT = new Date("2026-11-02T15:00:00Z");

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

// "pickup.earliest" / "pickup.latest" count as "pickup.date"
const canonical = (key: string) => key.replace(/\.(earliest|latest)$/, ".date");

async function main() {
  const filter = process.argv[2];
  const entries = Object.entries(answerKey).filter(
    ([file]) => file !== "_readme" && (!filter || file.includes(filter)),
  ) as [string, Expected][];

  let passed = 0;
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
    const check = (ok: boolean, msg: string) => ok || failures.push(msg);

    if (!outcome.fields) {
      failures.push(`no fields (${outcome.stopReason}: ${outcome.error})`);
    } else {
      const f = normalizeFields(outcome.fields);
      const missing = computeMissing(f);
      const low = new Set(f.low_confidence_fields.map(canonical));
      const flagged = (key: string) => low.has(key) || low.has(key.split(".")[0]);
      const ambiguous = exp.ambiguous ?? [];
      const lc = (s: string | null) => (s ?? "").toLowerCase();

      check(lc(f.shipper_name).includes(lc(exp.shipper)), `shipper: got "${f.shipper_name}"`);
      check(lc(f.pickup.location).includes(lc(exp.pickup_city)), `pickup city: got "${f.pickup.location}"`);
      check(lc(f.delivery.location).includes(lc(exp.delivery_city)), `delivery city: got "${f.delivery.location}"`);

      for (const side of ["pickup", "delivery"] as const) {
        const want = exp[`${side}_date`];
        const { earliest, latest } = f[side];
        if (ambiguous.includes(`${side}.date`)) continue;
        if (want === null) {
          check(!earliest && !latest, `${side} date: expected none, got ${earliest} / ${latest}`);
        } else if (want) {
          check(
            [earliest, latest].some((d) => d?.startsWith(want)),
            `${side} date: expected ${want}, got ${earliest} / ${latest}`,
          );
        }
        for (const d of [earliest, latest]) {
          if (d && !DATE_FORMAT.test(d)) warnings.push(`${side} date format: "${d}"`);
        }
      }

      check(
        f.weight_lbs !== null && Math.abs(f.weight_lbs - exp.weight_lbs) / exp.weight_lbs < 0.005,
        `weight: expected ~${exp.weight_lbs}, got ${f.weight_lbs}`,
      );
      check(f.equipment_type === exp.equipment, `equipment: expected ${exp.equipment}, got ${f.equipment_type}`);
      if (!ambiguous.includes("rate_usd")) {
        check(f.rate_usd === (exp.rate_usd ?? null), `rate: expected ${exp.rate_usd}, got ${f.rate_usd}`);
      }
      for (const ref of exp.refs) {
        check(
          f.reference_numbers.some((r) => r.includes(ref)),
          `reference "${ref}" not found in ${JSON.stringify(f.reference_numbers)}`,
        );
      }
      check(lc(f.contact.name).includes(lc(exp.contact)), `contact: expected ${exp.contact}, got "${f.contact.name}"`);
      if (exp.asks) check(f.sender_requests !== null, "sender_requests: expected the sender's ask, got none");

      const relevantMissing = missing.filter((m) => !ambiguous.includes(m));
      check(
        JSON.stringify([...relevantMissing].sort()) === JSON.stringify([...exp.missing].sort()),
        `missing: expected ${JSON.stringify(exp.missing)}, got ${JSON.stringify(relevantMissing)}`,
      );

      // Ambiguous values must be left empty or flagged, never stated confidently
      for (const key of ambiguous) {
        check(missing.includes(key) || flagged(key), `ambiguous ${key} given confidently, not flagged`);
      }
      for (const key of exp.expect_low ?? []) {
        check(flagged(key), `expected ${key} flagged low-confidence; flags: ${JSON.stringify([...low])}`);
      }
      const allowed = new Set([...(exp.expect_low ?? []), ...(exp.allow_low ?? []), ...ambiguous]);
      for (const key of low) {
        if (!allowed.has(key)) warnings.push(`unexpected low-confidence flag: ${key}`);
      }
    }

    if (failures.length === 0) passed++;
    const stats = `${(outcome.latencyMs / 1000).toFixed(1)}s, $${outcome.estCostUsd.toFixed(4)}`;
    console.log(`${failures.length === 0 ? "PASS" : "FAIL"}  ${file}  (${stats})`);
    for (const msg of failures) console.log(`   ✗ ${msg}`);
    for (const msg of warnings) console.log(`   ~ ${msg}`);
  }

  console.log(
    `\n${passed}/${entries.length} passed · total $${totalCost.toFixed(4)} · avg ${(totalLatency / entries.length / 1000).toFixed(1)}s`,
  );
}

main();
