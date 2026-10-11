export const colors = {
  background: "#f3f7f7",
  card: "#ffffff",
  text: "#142022",
  muted: "#526064",
  primary: "#0f6e75",
  primaryText: "#ffffff",
  border: "#d5e0e0",
  danger: "#9f2d2d",
  warning: "#8a5a00",
  success: "#1d6b3a",
};

export const statusColor: Record<string, string> = {
  requested: colors.warning,
  confirmed: colors.primary,
  in_transit: colors.primary,
  delivered: colors.success,
  cancelled: colors.muted,
};
