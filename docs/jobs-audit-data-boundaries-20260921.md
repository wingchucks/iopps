# Jobs audit data boundaries — September 21, 2026

## Implemented locally (not deployed)

- JOB-02: `/api/jobs` applies a **read-only discovery projection** after authoritative lifecycle merging and employer query filters. It selects one untouched, deterministic ID for exact ADP recruitment URLs with the same tenant/requisition, employer label, title, location, compatible source posting day and explicit intake/destination evidence. It does not assert that employer IDs are aliases. Two distinct non-midnight timestamps on the same day remain separate. Unknown providers/identities and conflicting metadata remain separate.
- The earlier content-merge comparison preserves **each** supplied owner label/ID, source/source URL, deadline, published/posted time, salary/range, employment/work-location/position field, requisition and intake/start/end field. No primary-field fallback may mask secondary evidence. Unsupported structured evidence at the merge boundary vetoes content deduplication. Secondary `orgId`/`orgName`/`companyName` also participate in discovery comparison; the validated cross-`employerId` representative rule remains discovery-only. Existing exact-ID, hidden/expired mirror, calendar-spelling, description-format and case-sensitive destination safeguards remain covered.
- Source record IDs, owners, slugs, descriptions, applications and saves are not rewritten. Existing detail URLs still resolve through the existing resolver; no canonical redirect or alias was introduced. Employer-ID-scoped reads select within that exact scope, not a global representative's owner.
- The saved 349-row public response was evaluated locally: **343 discovery representatives**, suppressing exactly one member of each of the six confirmed ADP pairs. This is a historical snapshot result, not a current live count.

## JOB-05 interface for the UI owner

Both jobs list and job detail use `publicContentRecord`, which derives this safe public field for `source: "feed"` records:

```ts
sourceMetadata?: {
  salary: "available" | "not-imported";
  closingDate: "available" | "not-imported";
  employmentType: "available" | "not-imported";
}
```

`available` means an existing field is present in the imported record; it is not a claim that the source was fetched or independently validated during this request. `not-imported` means no supported value is present. It **does not mean the employer failed to supply it**. Unknown origins and direct/manual records do not receive import provenance. Private/raw supplied `sourceMetadata` and `importContentQuality` are not forwarded.

**Local UI integration is implemented:** jobs list and detail consume `jobImportLabels`, distinguishing “Pay not imported” and “Closing details not imported” from employer omissions while retaining the original-posting link and source/excerpt context. This is no longer an outstanding wiring task; browser acceptance and deployed verification remain with the parent/UI owner.

The saved Oracle browser evidence supplies `$65,100 - $84,600`, `10/03/2026, 12:00 AM`, and `Full time`. It does not supply a captured REST field schema, an explicit pay currency/period, or a deadline timezone. No source-specific salary/deadline was hardcoded, no guessed provider fields were added, and no persisted backfill was performed. Mapping additional source fields requires a validated provider capture and semantics; alternatively the honest missing-import UI satisfies the audit's stated alternative.

## JOB-03: exact remaining approved-editorial gate

The captured source text contains `SIGA \uFFFDs employees` (replacement character followed by `s`). Existing `REPAIR.original` in `hermes-editorial-repair.ts` instead authorizes `SIGA \uFFFDds employees` (followed by `ds`), under `siga-payroll-possessive-v1`. An offline review using the captured wording **fails closed** for target/source drift. That existing authorization and its import guard were not broadened or changed.

Required closure: obtain employer-approved exact replacement copy for the currently captured wording, explicitly authorize a new/revised exact editorial plan, bind it to the current target ID/source URL/feed/document version, then separately authorize execution and verify card, detail and structured data after deployment. Do not infer an apostrophe from U+FFFD, silently remove it, or label reviewed copy as recovered source bytes. Existing normalization preserves the original text and queues `replacement-character` review while excluding raw quality metadata from public output. The new captured fixture exercises that boundary.

## Verification and remaining gates

Strict RED/GREEN was observed for the actual jobs API duplicate count (2 versus 1), conflicting employment evidence, structured/intake evidence, same-owner intake preservation, missing import provenance, and present metadata availability. Additional boundary tests execute the real list/detail routes against isolated in-memory storage and a network-blocking fixture.

Use the cached Node 24 executable with `--import ./scripts/test-typescript-loader.mjs --test` for:

- `tests/jobs-audit-discovery.test.mjs`
- `tests/jobs-audit-source-metadata.test.mjs`
- `tests/qa-round2-data.test.ts`
- `tests/qa-round2-data-api.test.mjs`
- `tests/import-content-quality.test.mjs`
- `tests/qa-round2-data-ingest.test.mjs`
- `tests/public-job-counts.test.ts`
- `tests/public-job-identity.test.ts`
- `tests/listing-freshness-routes.test.ts`

Independent merge review rerun: **88 tests passed, 0 failed**, including `tests/qa-round2-dedupe-review-api.test.mjs` in addition to the files above. The actual route first reproduced **16 failures** (`count: 1` instead of `2`) for independent applicationDeadline/deadline, salary/range, secondary ownership, source, postedAt and other metadata with otherwise identical same-owner ADP records and shared `closingDate: 2099-12-01`. Those cases now pass in both input orders with zero network connections; the existing six saved pairs still yield six representatives. Targeted ESLint and `git diff --check` passed using cached Node **24.21.0** and the repository loader. Existing `MODULE_TYPELESS_PACKAGE_JSON` warnings remain. Scratch evidence: `jobs-audit-merge-review-red.txt`, `jobs-audit-merge-review-green.txt`, `jobs-audit-merge-review-lint.txt`.

**Pre-display evidence preservation is implemented locally:** the jobs route now retains structured salary and compensation through both content merge and discovery projection, then applies `normalizeJobDisplay` only to selected representatives. Actual-route tests cover structured salary with/without display text, nested compensation, private-field non-disclosure and unchanged input records. The former pre-normalization residual is closed for these covered cases.

### Final source-date/lifecycle inventory review

Both comparison inventories were checked against `job-detail-dates.ts`, `listing-freshness.ts`, `job-discovery.ts`, `server/detail-metadata.ts`, `server/discoverability.ts`, and `public-jobs.ts`:

- Posting evidence: `publishedAt`, `postedAt`, **`sourcePostingDate` and `datePosted`** are independent. Display precedence never makes the latter two irrelevant. Only the established ADP discovery rule permits the compatible `publishedAt` midnight/instant pair; other source dates are not truncated to a day or combined with `||`.
- Deadline/lifecycle evidence: `closingDate`, `deadline`, `applicationDeadline`, **`expiresAt`**, `startDate`, `endDate`, `intakeStartDate`, `intakeEndDate`, and **`endAt`** participate independently. `endAt` was an additional omission found in the indexability consumer; this comparison change does not alter visibility policy.
- Source verification evidence: **`sourceVerifiedAt`** drives the distinct “Last source check” detail date and is now preserved by both comparisons.
- `createdAt`, `updatedAt`, and `order` remain local ingestion/recency metadata, not source intake identity. Active/status handling and authoritative same-ID suppression remain unchanged; this is not a new authorization or lifecycle policy.
- Unknown structured values veto deduplication. Comparison evidence is not copied to another record or added to the public allowlist.

Actual-route RED/GREEN reproduced `count: 1` instead of `2` for `sourcePostingDate` and `datePosted` under both owner configurations and both input orders; `expiresAt` failed in both same-owner orders (cross-owner discovery already preserved it). The inventory audit additionally reproduced and fixed `sourceVerifiedAt` and `endAt` in all owner/order configurations. Regression cases cover conflicting, absent and structured values, compatible equal evidence, untouched inputs and private top-level fields. All six captured ADP pairs remain compatible and project to six representatives.

Final focused verification: **64 passed, 0 failed** across `jobs-audit-discovery.test.mjs`, `public-job-counts.test.ts`, `public-job-identity.test.ts`, and `listing-freshness-routes.test.ts`, using cached Node 24 and the repository loader. Targeted ESLint and scoped `git diff --check` passed. Existing module-type warnings remain.

Resolved serializer observation: the earlier public allowlist forwarded malformed object-valued `sourcePostingDate`. The serializer now exposes only own-property values accepted by the strict calendar-date validator; nested objects, arrays, inherited values, boxed strings and invalid dates are omitted. Actual list/detail privacy regressions verify non-disclosure and valid leap-day preservation. Independent re-review passed 81 focused tests and 13 additional zero-network route probes. This supersedes the earlier exposure finding; production readback remains pending.

The freshness route VM gained only the actual new projection dependency; all existing assertions remain. Privacy-safe fixtures replace ADP tenant/requisition/record/owner IDs, retain public comparison fields, and omit entire descriptions except the short public Oracle sentence relevant to the encoding issue.

No live API, remote writes, cleanup, emulator, full build, commit, push or deployment. **The existing all7+4 cleanup closure gate remains untouched and unresolved by this projection.** Production cleanup, approved source correction, UI acceptance and live readback remain separate gates. Shared merge/org counts outside `/api/jobs` are intentionally not made cross-employer aliases; the list projection must not be reused as authorization or record resolution.
