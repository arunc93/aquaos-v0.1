import { STATUS_LABEL, type BookingStatus } from "./booking";
import { formatWhen } from "./format";
import { formatPhone } from "./phone";

export function announcementMessage(input: {
  societyName: string;
  title: string;
  message: string;
}): string {
  return `${input.societyName}\n${input.title}\n\n${input.message}`;
}

export function deliveryMessage(input: {
  societyName: string;
  status: BookingStatus;
  vendorName: string;
  capacityKl: number;
  slotLabel: string;
  scheduledAt: string;
  driverPhone?: string;
}): string {
  const lines = [
    input.societyName,
    `Tanker update: ${STATUS_LABEL[input.status]}`,
    "",
    input.vendorName,
    `${input.capacityKl} KL · ${input.slotLabel}`,
    formatWhen(input.scheduledAt),
  ];
  if (input.driverPhone) {
    lines.push(`Driver: ${formatPhone(input.driverPhone)}`);
  }
  return lines.join("\n");
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
