import assert from "node:assert/strict";
import test from "node:test";
import { pushBody, pushTitle } from "./push";

const OTP = "333333";

test("delivery push names the status and vendor and omits the OTP", () => {
  const title = pushTitle("Lakeview Residency Association");
  const body = pushBody({
    status: "in_transit",
    vendorName: "Sri Manjunatha Water Supply",
    capacityKl: 6,
    slotLabel: "Morning",
  });
  assert.equal(title, "Lakeview Residency Association");
  assert.equal(body, "Tanker update: In transit. Sri Manjunatha Water Supply, 6 KL, Morning.");
  assert.equal(body.includes(OTP), false);
  assert.equal(
    pushBody({
      status: "delivered",
      vendorName: "Kaveri Tankers",
      capacityKl: 10,
      slotLabel: "Evening",
    }),
    "Tanker update: Delivered. Kaveri Tankers, 10 KL, Evening.",
  );
});
