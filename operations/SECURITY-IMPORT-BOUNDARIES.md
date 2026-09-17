# Import security boundaries

These changes address organization image-import SSRF (CodeQL #63), imported
description rendering (#58 and overlapping #57/#59/#60), and Oracle detail
hydration origin trust (#56) on candidate
`005b228d4b59dc9aba3b1c1b2850dcc745579324`. They are source-level risks, not
evidence of a production breach. Image imports retain authentication and
organization membership prerequisites. Description hydration uses stored job
and feed data. Public job GET hydration can update a record: never use it as a
production read-only security probe.

## Outbound requests

`safe-outbound-fetch.ts` is the shared Node-runtime HTTPS GET boundary for
organization link/Drive imports and ADP/Oracle description hydration.

- HTTPS, port 443, no embedded URL credentials; three redirects by default.
- Every redirect passes URL and provider policy before DNS or connection.
- Resolve once, validate every DNS answer, and pass a selected numeric public
  address as the HTTPS connection target. There is no second hostname lookup
  between validation and connection. IP literals also pass URL/address policy;
  Node's resolver handles them locally. A fresh agent prevents pooled/proxy
  connections bypassing the pinned destination.
- `ipaddr.js` 2.5.0 provides address parsing and special-use classification.
  IPv4-mapped IPv6 is classified by its IPv4 address; IPv6 is additionally
  restricted to allocated global unicast space. The package supports Node >=10;
  root CI and local verification use Node 24. No edge-runtime use is supported.
- The original hostname is retained for HTTP Host, SNI and TLS identity checks.
  Native TLS certificate-chain verification is explicitly enabled. DNS names
  use Node's hostname verifier; IP literals use Node/OpenSSL `X509Certificate.checkIP`
  to require an exact IP SAN, including IPv6 (Node 24.19's default hostname
  verifier incorrectly applies domain-name conversion to IPv6 literals).
  Authorization survives only
  same-origin redirects and is permanently removed on a cross-origin hop.
- One 15-second deadline covers DNS, connection, TLS, redirects and response
  body. Image bodies are limited to 5 MiB, Drive metadata to 64 KiB and provider
  descriptions to 2 MiB. Limits count streamed bytes even without, or despite,
  Content-Length. Error/redirect bodies are discarded. Headers are limited to
  16 KiB. Requests ask for identity encoding and reject compressed responses.

The conservative policy can reject a host with mixed public/private DNS, a
host whose first public DNS answer is unreachable, compressed responses from
servers ignoring identity encoding, nonstandard ports or long redirect chains.
There is no fallback to unsafe fetch. Validate supported provider downloads on
the exact preview before release. Ordinary feed retrieval in `feed-source.ts`
is outside this detail-hydration change; this is not a claim that all outbound
requests in the repository share this boundary.

## Oracle and ADP policy

Oracle hydration requires an HTTPS `<tenant>.fa.<region>.oraclecloud.com`
CandidateExperience URL whose origin exactly matches the configured feed URL.
The feed must use the HCM REST `recruitingCEJobRequisitions` endpoint. Redirects
must remain on that exact origin and pass the shared transport boundary. Missing
or mismatched tenant configuration fails closed without a hydration request.
Custom domains and other Oracle products need a separately reviewed policy;
do not widen this to substring matching.

ADP requires the exact `workforcenow.adp.com` HTTPS origin. Its detail URL is
still reconstructed on that fixed origin with encoded requisition ID and query
parameters. Feed CID fallback and closed-posting behavior are retained. The
old ADP reconstruction was not equivalent to Oracle's arbitrary-host issue.

## Description contract

Public `description` is plain text with `descriptionFormat: "plain-text"`.
Imported HTML is parsed with the existing `htmlparser2` dependency, retaining
paragraph separation and list bullets, removing embedded elements and hidden
script/style/template content. Entity-decoded text is never reparsed as HTML.
Feed sync and hydrated patches persist the format marker; detail/list APIs and
positive public projections respect it to avoid repeated parsing or decoding.
Legacy unmarked descriptions are converted at the public projection boundary.

The format marker is not a trust grant. Even a falsely marked description is
rendered as a React text child. The job page has no description HTML injection
branch, and this protection does not rely on CSP. HTML styling, images and
interactive content are intentionally not part of the description contract.

## Local regression commands

The runner refuses local dotenv files and starts subprocesses with an explicit
environment allowlist, excluding Firebase, Stripe, email and other application
credentials. Real email is disabled because no Resend credential is supplied.
Use the same runner for builds, typecheck and lint. Emulator mode supplies only
fictional configuration for `demo-iopps-preview`; maintenance mode uses the
separate `demo-iopps-launch-freeze` configuration.

```sh
node scripts/run-isolated-qa.mjs node --import ./scripts/test-typescript-loader.mjs --test tests/security-import-regression.test.mjs tests/safe-outbound-fetch.test.mjs
node scripts/run-isolated-qa.mjs --baseline node --import ./scripts/test-typescript-loader.mjs --test tests/security-import-regression.test.mjs
```

The second command intentionally returns nonzero: the fixture loader reads
the exact original source from Git. It never overwrites the verification
candidate. Its failures include vulnerability reproductions and new contract
assertions, not one separate vulnerability per failing test.

Proofs use offline DNS/HTTP/Firestore doubles and the actual React page renderer.
The TLS test alone opens sockets, exclusively to a generated loopback fixture.
Its test-only adapter supplies a loopback TCP socket while preserving the
production TLS hostname, IP identity, CA, SNI and HTTP Host checks. No test
executes an event handler, sends exploit traffic or queries production records.

## Release gates

Do not transfer the old candidate's provider acceptance to a new commit. Preserve
the Stripe and nonproduction Storage evidence, then verify the new artifact's
integration with those same contracts. Payment fulfillment, archive code and
Firestore/Storage rules are unchanged here, but a new dependency/build and image
transport changes require exact-artifact regression and supported-provider
compatibility checks.

Before release, require hosted CI, CodeQL, the separate security-results check,
exact preview verification, and the coordinated gates in LAUNCH-RECOVERY.md.
A green security-results check for no new changed-code alerts does not mean zero
open alerts. A full-PR-diff warning qualifies changed-line reporting; it alone
does not establish whole-analysis truncation. Legacy alert #40 and the other
51 unadjudicated CodeQL alerts are not cleared by this remediation.
