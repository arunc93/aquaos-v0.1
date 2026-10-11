const STATUS_LABEL = {
  in_transit: "In transit",
  delivered: "Delivered",
} as const;

export function pushTitle(societyName: string): string {
  return societyName;
}

export function pushBody(input: {
  status: keyof typeof STATUS_LABEL;
  vendorName: string;
  capacityKl: number;
  slotLabel: string;
}): string {
  return `Tanker update: ${STATUS_LABEL[input.status]}. ${input.vendorName}, ${input.capacityKl} KL, ${input.slotLabel}.`;
}
