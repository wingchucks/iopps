import test from "node:test";
import assert from "node:assert/strict";

import {
  getLegacyPublicPartnerTier,
  isLegacyPublicPartner,
} from "../src/lib/legacy-partners.ts";

test("City of Saskatoon remains a legacy public partner", () => {
  const record = {
    id: "vAhCU0qrmpRaWCHHWOpbhvx3u9h1",
    name: "City of Saskatoon",
    slug: "city-of-saskatoon-n0w2ko",
  };

  assert.equal(isLegacyPublicPartner(record), true);
  assert.equal(getLegacyPublicPartnerTier(record), "premium");
});
