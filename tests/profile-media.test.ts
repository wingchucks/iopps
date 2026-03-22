import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfileMediaStoragePath,
  inferProfileMediaMimeType,
  isBlockedRemoteHostname,
  isPrivateIpAddress,
  normalizeCloudImportUrl,
} from "../src/lib/profile-media.ts";

test("normalizeCloudImportUrl converts Google Drive share links", () => {
  const normalized = normalizeCloudImportUrl("https://drive.google.com/file/d/abc123/view?usp=sharing");

  assert.equal(normalized.source, "google-drive");
  assert.equal(normalized.fileId, "abc123");
  assert.equal(normalized.url, "https://drive.google.com/uc?export=download&id=abc123");
});

test("normalizeCloudImportUrl converts Dropbox and OneDrive links to download URLs", () => {
  const dropbox = normalizeCloudImportUrl("https://www.dropbox.com/s/example/flyer.png?dl=0");
  const oneDrive = normalizeCloudImportUrl("https://contoso.sharepoint.com/:i:/r/sites/team/Shared%20Documents/photo.jpg?e=abc123");

  assert.equal(dropbox.source, "dropbox");
  assert.match(dropbox.url, /[?&]dl=1/);

  assert.equal(oneDrive.source, "onedrive");
  assert.match(oneDrive.url, /[?&]download=1/);
});

test("normalizeCloudImportUrl rejects non-https imports", () => {
  assert.throws(
    () => normalizeCloudImportUrl("http://example.com/photo.jpg"),
    /Only HTTPS image links are supported/
  );
});

test("inferProfileMediaMimeType detects supported image types from mime and extension", () => {
  assert.equal(inferProfileMediaMimeType("image/png"), "image/png");
  assert.equal(inferProfileMediaMimeType("https://cdn.example.com/banner.webp"), "image/webp");
  assert.equal(inferProfileMediaMimeType("https://cdn.example.com/document.pdf"), undefined);
});

test("private and local remote hosts are blocked", () => {
  assert.equal(isBlockedRemoteHostname("localhost"), true);
  assert.equal(isBlockedRemoteHostname("192.168.1.10"), true);
  assert.equal(isBlockedRemoteHostname("10.0.0.4"), true);
  assert.equal(isBlockedRemoteHostname("storage.googleapis.com"), false);

  assert.equal(isPrivateIpAddress("127.0.0.1"), true);
  assert.equal(isPrivateIpAddress("172.20.14.9"), true);
  assert.equal(isPrivateIpAddress("8.8.8.8"), false);
  assert.equal(isPrivateIpAddress("::1"), true);
});

test("buildProfileMediaStoragePath uses the org profile storage convention", () => {
  const path = buildProfileMediaStoragePath({
    orgId: "org-42",
    slot: "gallery",
    fileName: "Northern Lights Team Photo.png",
  });

  assert.match(path, /^organizations\/org-42\/profile\/gallery\//);
  assert.match(path, /Northern-Lights-Team-Photo\.png$/);
});
