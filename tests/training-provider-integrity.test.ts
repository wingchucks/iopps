import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  getOfficialTrainingUrl,
  getTrainingPriceLabel,
  isCurrentTrainingListing,
  isProviderHostedTraining,
} from "../src/lib/training-listing";

test("external provider listings use the official provider URL", () => {
  const program = {
    externalUrl: "https://provider.example/course",
    sourceUrl: "https://provider.example/source",
  };

  assert.equal(isProviderHostedTraining(program), true);
  assert.equal(getOfficialTrainingUrl(program), "https://provider.example/course");
});

test("source URLs also classify a listing as provider-hosted", () => {
  const program = { sourceUrl: "https://provider.example/course" };

  assert.equal(isProviderHostedTraining(program), true);
  assert.equal(getOfficialTrainingUrl(program), "https://provider.example/course");
});

test("unknown provider pricing is not presented as free", () => {
  assert.equal(
    getTrainingPriceLabel({ externalUrl: "https://provider.example/course", price: "" }),
    "See provider for fees",
  );
  assert.equal(
    getTrainingPriceLabel({ externalUrl: "https://provider.example/course", price: null }),
    "See provider for fees",
  );
});

test("an explicit provider price label is preserved", () => {
  assert.equal(
    getTrainingPriceLabel({ externalUrl: "https://provider.example/course", price: "Free" }),
    "Free",
  );
  assert.equal(
    getTrainingPriceLabel({ externalUrl: "https://provider.example/course", price: "$95 per person" }),
    "$95 per person",
  );
});

test("IOPPS-hosted training may still use the free fallback", () => {
  assert.equal(getTrainingPriceLabel({ price: null }), "Free");
  assert.equal(isProviderHostedTraining({ price: null }), false);
});

test("expired dated training is excluded while ongoing training remains available", () => {
  assert.equal(isCurrentTrainingListing({ endDate: "2026-07-29" }, "2026-07-30"), false);
  assert.equal(isCurrentTrainingListing({ endDate: "2026-07-30" }, "2026-07-30"), true);
  assert.equal(isCurrentTrainingListing({}, "2026-07-30"), true);
});

test("training pages route provider-hosted listings to the provider instead of internal enrollment", () => {
  const root = process.cwd();
  const detail = readFileSync(path.join(root, "src/app/training/[slug]/page.tsx"), "utf8");
  const directory = readFileSync(path.join(root, "src/app/training/page.tsx"), "utf8");

  assert.match(detail, /View official provider details/);
  assert.match(detail, /Registration, course access, eligibility, and fees are handled by/);
  assert.match(detail, /isProviderHostedTraining/);
  assert.match(directory, /getTrainingPriceLabel/);
  assert.doesNotMatch(directory, /\{priceLabel \|\| "Free"\}/);
});

test("legacy external selections are not presented as IOPPS course progress", () => {
  const learning = readFileSync(
    path.join(process.cwd(), "src/app/learning/page.tsx"),
    "utf8",
  );
  assert.match(learning, /Provider-hosted training/);
  assert.match(learning, /Registration is completed with the provider\./);
  assert.match(learning, /isProviderHostedTraining/);
});

test("the enrollment data layer defensively rejects provider-hosted listings", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/lib/firestore/training.ts"),
    "utf8",
  );
  assert.match(source, /if \(isProviderHostedTraining\(program\)\)/);
  assert.match(source, /must be registered for on the official provider website/);
});
