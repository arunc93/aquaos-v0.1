import assert from "node:assert/strict";
import test from "node:test";
import { formatWhen } from "./format";
import { announcementMessage, deliveryMessage, whatsappShareUrl } from "./whatsapp";

const OTP = "333333";

test("announcement share text names the society and keeps the title", () => {
  const text = announcementMessage({
    societyName: "Lakeview Residency Association",
    title: "Tank cleaning",
    message: "Store water from 10 am to 1 pm.",
  });
  assert.match(text, /Lakeview Residency Association/);
  assert.match(text, /Tank cleaning/);
  assert.match(text, /Store water from 10 am to 1 pm\./);
  assert.equal(text.includes(OTP), false);

  const url = new URL(whatsappShareUrl(text));
  assert.equal(`${url.origin}${url.pathname}`, "https://wa.me/");
  assert.equal(url.searchParams.get("text"), text);
});

test("delivery share text has status and vendor, and no OTP", () => {
  const scheduledAt = "2026-10-18T13:30:00.000Z";
  const text = deliveryMessage({
    societyName: "Lakeview Residency Association",
    status: "in_transit",
    vendorName: "Sri Manjunatha Water Supply",
    capacityKl: 6,
    slotLabel: "Evening",
    scheduledAt,
    driverPhone: "+919845010101",
  });
  assert.match(text, /Tanker update: In transit/);
  assert.match(text, /Sri Manjunatha Water Supply/);
  assert.match(text, /6 KL · Evening/);
  assert.ok(text.includes(formatWhen(scheduledAt)));
  assert.match(text, /Driver: \+91 98450 10101/);
  assert.equal(text.includes(OTP), false);

  const resident = deliveryMessage({
    societyName: "Lakeview Residency Association",
    status: "confirmed",
    vendorName: "Kaveri Tankers",
    capacityKl: 10,
    slotLabel: "Morning",
    scheduledAt,
  });
  assert.equal(resident.includes("Driver:"), false);
  assert.equal(resident.includes(OTP), false);
});
