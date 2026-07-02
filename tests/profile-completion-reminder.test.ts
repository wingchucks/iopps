import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProfileCompletionReminderContent,
  nextProfileReminderStage,
  profileReminderSetupUrl,
} from "../src/lib/profile-completion-reminder.ts";

test("builds safe profile completion reminder with benefits and setup link", () => {
  const email = buildProfileCompletionReminderContent({
    displayName: "Glen <User>",
    kind: "unverified_signup",
    stage: "24h",
    siteUrl: "https://www.iopps.ca/",
  });

  assert.equal(email.subject, "Finish your IOPPS profile");
  assert.match(email.html, /Glen &lt;User&gt;/);
  assert.doesNotMatch(email.html, /Glen <User>/);
  assert.match(email.html, /jobs, training, scholarships, events/);
  assert.match(email.html, /Featured Talent opportunities/);
  assert.match(email.html, /https:\/\/www\.iopps\.ca\/setup/);
  assert.match(email.text, /Complete your profile: https:\/\/www\.iopps\.ca\/setup/);
});

test("normalizes setup URL", () => {
  assert.equal(profileReminderSetupUrl("https://www.iopps.ca/"), "https://www.iopps.ca/setup");
  assert.equal(profileReminderSetupUrl("   "), "https://www.iopps.ca/setup");
});

test("chooses reminder stages without resending or emailing stopped users", () => {
  assert.equal(nextProfileReminderStage(1, {}), null);
  assert.equal(nextProfileReminderStage(25, {}), "24h");
  assert.equal(nextProfileReminderStage(80, { sentStages: { "24h": true } }), "3d");
  assert.equal(nextProfileReminderStage(200, { sentStages: { "24h": true, "3d": true } }), "7d");
  assert.equal(nextProfileReminderStage(200, { sentStages: { "24h": true, "3d": true, "7d": true } }), null);
  assert.equal(nextProfileReminderStage(200, { stoppedAt: "now" }), null);
  assert.equal(nextProfileReminderStage(200, { completedAt: "now" }), null);
  assert.equal(nextProfileReminderStage(200, { unsubscribedAt: "now" }), null);
});
