import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../password";
import { signToken, verifyToken } from "../jwt";
import { toValidUUID } from "../../db/dag-repository";

// Ensure JWT_SECRET is set for the test suite
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-minimum-32-chars-for-testing";

test("hashPassword produces valid bcrypt hash and verifyPassword verifies correctly", async () => {
  const plain = "SuperSecretPassword123!";
  const hash = await hashPassword(plain);

  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "Should be standard bcrypt hash");
  assert.notEqual(plain, hash, "Hash must never match plaintext");

  const valid = await verifyPassword(plain, hash);
  assert.equal(valid, true, "Valid password must verify as true");

  const wrong = await verifyPassword("WrongPassword456!", hash);
  assert.equal(wrong, false, "Wrong password must verify as false");
});

test("signToken generates valid signed JWT and verifyToken recovers payload", () => {
  const payload = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    email: "security.audit@syncpro.dev",
    name: "Audit User",
    role: "admin",
  };

  const token = signToken(payload);
  assert.ok(typeof token === "string" && token.split(".").length === 3, "JWT must have 3 segments");

  const decoded = verifyToken(token);
  assert.ok(decoded, "Token must be decoded successfully");
  assert.equal(decoded?.id, payload.id);
  assert.equal(decoded?.email, payload.email);
  assert.equal(decoded?.role, payload.role);

  // Tampered token check
  const tampered = token.slice(0, -5) + "abcde";
  const tamperedDecoded = verifyToken(tampered);
  assert.equal(tamperedDecoded, null, "Tampered token signature must fail verification");
});

test("signToken throws error when JWT_SECRET is missing", () => {
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    assert.throws(
      () => {
        signToken({
          id: "1",
          email: "test@example.com",
          name: "Test",
          role: "user",
        });
      },
      /JWT_SECRET environment variable is not set/,
      "Must throw when JWT_SECRET is missing"
    );
  } finally {
    process.env.JWT_SECRET = originalSecret;
  }
});

test("toValidUUID converts invalid formats into deterministic valid UUIDs", () => {
  const valid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  assert.equal(toValidUUID(valid), valid, "Valid UUID must remain unchanged");

  const customDoc = "doc_custom_test_123";
  const converted = toValidUUID(customDoc);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(converted), "Converted ID must be a standard RFC4122 UUID");

  // Determinism check: same input always produces same UUID
  const convertedAgain = toValidUUID(customDoc);
  assert.equal(converted, convertedAgain, "Conversion must be deterministic");
});
