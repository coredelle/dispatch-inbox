import { cn } from "@/lib/utils";
import type { LoadStatus } from "@/types";

const STAMP_TEXT: Record<LoadStatus, string> = {
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

// Load status as a rubber-stamp mark. `land` plays the stamp-down animation.
export function Stamp({
  status,
  size = "md",
  land = false,
  className,
}: {
  status: LoadStatus;
  size?: "sm" | "md" | "lg";
  land?: boolean;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn("stamp", size === "sm" && "stamp-sm", size === "lg" && "stamp-lg", land && "stamp-land", className)}
    >
      {STAMP_TEXT[status]}
    </span>
  );
}
