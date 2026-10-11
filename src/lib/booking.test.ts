import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, type BookingStatus, type Role } from "./booking";

const roles: Role[] = ["society_admin", "resident", "vendor", "super_admin"];
const statuses: BookingStatus[] = [
  "requested",
  "confirmed",
  "in_transit",
  "delivered",
  "cancelled",
];

const allowed = new Set([
  "society_admin:requested:confirmed",
  "society_admin:requested:cancelled",
  "society_admin:confirmed:cancelled",
  "society_admin:in_transit:cancelled",
  "vendor:requested:confirmed",
  "vendor:confirmed:in_transit",
  "vendor:in_transit:delivered",
]);

test("booking transitions match the role table", () => {
  for (const role of roles) {
    for (const from of statuses) {
      for (const to of statuses) {
        const key = `${role}:${from}:${to}`;
        assert.equal(canTransition(role, from, to), allowed.has(key), key);
      }
    }
  }
});
