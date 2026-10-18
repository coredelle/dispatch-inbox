// One-click samples for visitors who don't have a load email handy.
// Files live in sample-data/ and are served by /samples/[id].
export interface Sample {
  id: string;
  label: string;
  hint: string;
  kind: "email" | "pdf";
  file: string;
}

export const SAMPLES: Sample[] = [
  { id: "tidy-email", label: "Tidy email", hint: "Everything's there", kind: "email", file: "emails/01-tidy-dry-van.txt" },
  { id: "missing-details", label: "Missing details", hint: "No rate, no delivery time", kind: "email", file: "emails/04-missing-rate-and-delivery.txt" },
  { id: "messy-thread", label: "Messy thread", hint: "Rate changes in the last reply", kind: "email", file: "emails/05-messy-forwarded-thread.txt" },
  { id: "impossible-date", label: "Impossible date", hint: "“Friday 11/31”, per-mile rate", kind: "email", file: "emails/06-messy-typo-date.txt" },
  { id: "pdf-ratecon", label: "PDF rate con", hint: "A one-page rate confirmation", kind: "pdf", file: "pdfs/ratecon-01-dry-van.pdf" },
];
