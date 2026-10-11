import assert from "node:assert/strict";
import test from "node:test";
import { toE164 } from "./phone";

test("accepts a 10-digit Indian mobile and common prefixes", () => {
  assert.equal(toE164("9845012345"), "+919845012345");
  assert.equal(toE164("+91 98450 12345"), "+919845012345");
  assert.equal(toE164("919845012345"), "+919845012345");
  assert.equal(toE164("09845012345"), "+919845012345");
});

test("rejects numbers that are not Indian mobiles", () => {
  assert.equal(toE164("12345"), null);
  assert.equal(toE164("5845012345"), null);
  assert.equal(toE164(""), null);
});
