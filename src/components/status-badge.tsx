import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type BookingStatus } from "@/lib/booking";

const TONE = {
  requested: "warning",
  confirmed: "info",
  in_transit: "info",
  delivered: "success",
  cancelled: "neutral",
} as const;

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function BadgeLabel({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
}) {
  return <Badge tone={tone}>{children}</Badge>;
}
