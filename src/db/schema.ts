import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Column mirror of supabase/migrations. The app queries Supabase, not this client. */

export const userRole = pgEnum("user_role", [
  "society_admin",
  "resident",
  "vendor",
  "super_admin",
]);
export const bookingStatus = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "in_transit",
  "delivered",
  "cancelled",
]);
export const qualitySource = pgEnum("quality_source", [
  "tanker",
  "borewell",
  "municipal",
  "other",
]);
export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);
export const qualityBadge = pgEnum("quality_badge", ["none", "verified", "premium"]);
export const complaintStatus = pgEnum("complaint_status", ["open", "resolved"]);
export const areaUnit = pgEnum("area_unit", ["sqft", "sqm"]);

export const societies = pgTable("societies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  unitCount: integer("unit_count").notNull(),
  tankCapacityKl: numeric("tank_capacity_kl", { precision: 8, scale: 2 }).notNull(),
  adminId: uuid("admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  baseCity: text("base_city").notNull(),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
  reliabilityScore: integer("reliability_score").notNull(),
  verificationStatus: verificationStatus("verification_status").notNull(),
  qualityBadge: qualityBadge("quality_badge").notNull(),
  typicalEtaHours: integer("typical_eta_hours").notNull(),
  lastDeliveryPhotoPath: text("last_delivery_photo_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull(),
  societyId: uuid("society_id"),
  vendorId: uuid("vendor_id"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  flatNumber: text("flat_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorPrices = pgTable("vendor_prices", {
  vendorId: uuid("vendor_id").notNull(),
  capacityKl: numeric("capacity_kl", { precision: 4, scale: 1 }).notNull(),
  priceInr: integer("price_inr").notNull(),
});

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  phone: text("phone").notNull(),
  fullName: text("full_name").notNull(),
  flatNumber: text("flat_number").notNull(),
  role: userRole("role").notNull(),
  code: text("code").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  vendorId: uuid("vendor_id").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  capacityKl: numeric("capacity_kl", { precision: 4, scale: 1 }).notNull(),
  priceInr: integer("price_inr").notNull(),
  status: bookingStatus("status").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  slotLabel: text("slot_label").notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  proofPath: text("proof_path"),
  otp: text("otp").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qualityLogs = pgTable("quality_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  bookingId: uuid("booking_id"),
  source: qualitySource("source").notNull(),
  testedAt: date("tested_at").notNull(),
  tds: numeric("tds", { precision: 6, scale: 1 }).notNull(),
  ph: numeric("ph", { precision: 3, scale: 1 }).notNull(),
  notes: text("notes"),
  reportPath: text("report_path"),
  loggedBy: uuid("logged_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  bookingId: uuid("booking_id"),
  createdBy: uuid("created_by").notNull(),
  message: text("message").notNull(),
  tds: numeric("tds", { precision: 6, scale: 1 }),
  rating: integer("rating"),
  status: complaintStatus("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rwhCalculations = pgTable("rwh_calculations", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  roofArea: numeric("roof_area", { precision: 10, scale: 2 }).notNull(),
  areaUnit: areaUnit("area_unit").notNull(),
  cityName: text("city_name").notNull(),
  rainfallMm: integer("rainfall_mm").notNull(),
  runoffCoefficient: numeric("runoff_coefficient", { precision: 3, scale: 2 }).notNull(),
  estimatedHarvestLiters: integer("estimated_harvest_liters").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tankLevels = pgTable("tank_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id").notNull(),
  levelPercent: numeric("level_percent", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid("recorded_by").notNull(),
});
