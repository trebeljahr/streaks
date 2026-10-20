// The app sends no email of its own, so a profile carries no notification
// preference: nothing defaults a person into mail they never chose.
import assert from "node:assert/strict";
import { test } from "node:test";
import { updateProfileSchema } from "@starter/shared";
import { Profile } from "../models/Profile.js";

test("a new profile has no notification preference", () => {
  const profile = new Profile({ userId: "u1" });
  assert.equal(Profile.schema.path("preferences.notifications"), undefined);
  const preferences = profile.toObject().preferences as Record<string, unknown>;
  assert.equal("notifications" in preferences, false);
  assert.deepEqual(preferences, { theme: "system", timezone: "UTC", dayStartHour: 4 });
});

test("a profile update cannot set one", () => {
  const parsed = updateProfileSchema.parse({ preferences: { notifications: true, theme: "dark" } });
  assert.deepEqual(parsed.preferences, { theme: "dark" });
});
