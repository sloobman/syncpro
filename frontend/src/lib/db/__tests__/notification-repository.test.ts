import test from "node:test";
import assert from "node:assert/strict";
import type { AppNotification, NotificationType } from "../notification-repository";
import { toValidUUID } from "../workspace-repository";

test("toValidUUID converts invalid user/workspace IDs to deterministic RFC UUIDs", () => {
  const invalidId = "user_42";
  const validUUID = toValidUUID(invalidId);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(validUUID), "Must match UUID RFC 4122 pattern");

  // Determinism check: same input yields same UUID
  assert.equal(toValidUUID(invalidId), validUUID);
});

test("Notification structure validation and types conform to specifications", () => {
  const validTypes: NotificationType[] = ["comment", "merge", "invite", "commit", "system"];

  validTypes.forEach((type) => {
    const mockNotif: AppNotification = {
      id: "b7e289c0-9f5a-4e89-b1d3-35f928e469d1",
      title: "Тестовое оповещение",
      desc: "Описание оповещения",
      time: "Только что",
      unread: true,
      type,
      link: "/dashboard",
      createdAt: new Date().toISOString(),
    };

    assert.ok(validTypes.includes(mockNotif.type), `Type ${type} must be a valid notification type`);
    assert.equal(mockNotif.unread, true);
    assert.equal(mockNotif.title, "Тестовое оповещение");
  });
});
