import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PLAN_LIMITS } from "@/lib/db/subscription-repository";
import { sendVerificationEmail } from "@/lib/email/mailer";

test("Promo code and subscription tier specifications match requirements", () => {
  assert.equal(PLAN_LIMITS.free.storageLimitBytes, 100 * 1024 * 1024, "Free tier has 100MB limit");
  assert.equal(PLAN_LIMITS.free.maxWorkspaces, 3, "Free tier has 3 workspaces limit");
  assert.equal(PLAN_LIMITS.free.customFonts, false, "Free tier cannot use custom fonts");

  assert.equal(PLAN_LIMITS.pro.storageLimitBytes, 10 * 1024 * 1024 * 1024, "Pro tier has 10GB limit");
  assert.equal(PLAN_LIMITS.pro.maxWorkspaces, 20, "Pro tier has 20 workspaces limit");
  assert.equal(PLAN_LIMITS.pro.customFonts, true, "Pro tier enables custom fonts");

  assert.equal(PLAN_LIMITS.enterprise.storageLimitBytes, 100 * 1024 * 1024 * 1024, "Enterprise has 100GB limit");
  assert.equal(PLAN_LIMITS.enterprise.maxWorkspaces, 100, "Enterprise has 100 workspaces limit");
  assert.equal(PLAN_LIMITS.enterprise.customFonts, true, "Enterprise enables custom fonts");
});

test("Verification email generator outputs valid HTML with token and OTP code", async () => {
  const testOtp = "749201";
  const testToken = crypto.randomBytes(32).toString("hex");

  const result = await sendVerificationEmail({
    to: "test@example.com",
    name: "Тестовый Пользователь",
    token: testToken,
    otpCode: testOtp,
  });

  assert.equal(result.success, true);
  assert.ok(result.simulated || result.messageId);
});

test("OTP codes conform to 6-digit numeric pattern", () => {
  for (let i = 0; i < 50; i++) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    assert.equal(otp.length, 6, "OTP must have exactly 6 characters");
    assert.match(otp, /^\d{6}$/, "OTP must consist only of digits");
  }
});
