import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The link preview for LinkedIn, Slack, Upwork and the like: the pitch beside a load record card
export const alt = "Dispatch Inbox: load emails in, clean load records out. A sample AI MVP by Coredelle Digital.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1c2733";
const PAPER = "#eceee7";
const CARD = "#f8f9f4";
const MUTED = "#48525e";
const HIVIS = "#f2b705";
const RED = "#b3261e";
const BLUE = "#2f4fa2";

const ROWS: { label: string; value: string; missing?: string }[] = [
  { label: "PICKUP", value: "Allentown, PA · 11/19" },
  { label: "DELIVERY", value: "Richmond, VA", missing: "DATE MISSING" },
  { label: "WEIGHT", value: "31,000 lb" },
  { label: "EQUIPMENT", value: "53' dry van" },
  { label: "RATE", value: "—", missing: "MISSING" },
];

export default async function Image() {
  const [display, mono] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/BarlowCondensed-Bold.ttf")),
    readFile(path.join(process.cwd(), "assets/IBMPlexMono-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, padding: 64, gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ fontFamily: "Plex Mono", fontSize: 22, color: MUTED, letterSpacing: 1 }}>
              A SAMPLE AI MVP BY COREDELLE DIGITAL
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Barlow", fontSize: 84, lineHeight: 0.95 }}>
              <span>LOAD EMAILS IN.</span>
              <span style={{ display: "flex" }}>
                <span style={{ background: HIVIS, padding: "0 10px", marginLeft: -10 }}>CLEAN RECORDS</span>
              </span>
              <span>OUT.</span>
            </div>
            <div style={{ fontSize: 28, color: MUTED, lineHeight: 1.35 }}>
              AI reads the email or PDF, flags what&apos;s missing, and drafts the follow-up.
            </div>
          </div>
          <div style={{ fontFamily: "Plex Mono", fontSize: 22 }}>dispatch.coredelle.com · live demo</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            alignSelf: "center",
            background: CARD,
            border: `2px solid ${INK}`,
            borderRadius: 6,
            padding: 32,
            position: "relative",
            boxShadow: `8px 8px 0 ${INK}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -26,
              right: 28,
              display: "flex",
              fontFamily: "Barlow",
              fontSize: 30,
              color: BLUE,
              background: CARD,
              border: `4px solid ${BLUE}`,
              borderRadius: 6,
              padding: "2px 14px",
              transform: "rotate(-6deg)",
            }}
          >
            NEEDS REVIEW
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${INK}`, paddingBottom: 10 }}>
            <span style={{ fontFamily: "Barlow", fontSize: 44 }}>LOAD RECORD</span>
            <span style={{ fontFamily: "Plex Mono", fontSize: 20, color: MUTED }}>№ KP-30118</span>
          </div>
          {ROWS.map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #c6ccbf" }}
            >
              <span style={{ fontFamily: "Barlow", fontSize: 24, color: MUTED, letterSpacing: 1 }}>{row.label}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Plex Mono", fontSize: 22 }}>
                {row.value}
                {row.missing && (
                  <span style={{ fontFamily: "Barlow", fontSize: 18, color: RED, border: `2px solid ${RED}`, borderRadius: 4, padding: "0 8px", whiteSpace: "nowrap" }}>
                    {row.missing}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow", data: display, weight: 700, style: "normal" },
        { name: "Plex Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
