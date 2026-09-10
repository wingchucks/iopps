# Coordinated launch and compatible recovery

This document prepares a release; it is not authorization to deploy, freeze production, replay payments or modify business records.

## Candidate verification
- Run the complete demo Firebase emulator suite against the exact release source and build; repeat after final implementation changes.
- Verify built maintenance HTTP and separate maintenance rule emulator suites, plus loopback-only Chrome normal/maintenance smoke.
- Require hosted CI at the final commit, exact artifact identity and independent review. A previous green SHA is not evidence for later edits.
- Keep the release branch's Vercel automatic deployment disabled. Never expose a preview carrying production credentials.

## Freeze and cutover gates
1. Inventory the active app deployment, alternate deployment URLs, custom domains, cron writers, other Admin SDK services, rule releases and Stripe endpoint. Capture safe immutable identifiers; never write secrets to this record.
2. Before changing app/rules pairing, establish externally enforced ingress/write containment for old deployments and independently pause other writers. The new middleware cannot block old deployments or already-running requests. Firebase client rules do not constrain Admin SDK. Do not assume changing an environment variable changes an existing Vercel deployment.
3. Preserve Stripe retryability: blocked webhook delivery must return non-2xx, not an acknowledged discard. Do not disable delivery or use synthetic success. Provider retry retention is bounded; verify failed-delivery visibility and drain status.
4. Apply the separately scoped `operations/maintenance` Firestore/Storage deny-all artifacts only during the approved window. Read back exact active rule releases and prove direct client denial. The maintenance rules intentionally deny reads too, so communicate downtime.
5. Verify old ingress is contained and in-flight writers have drained using actual deployment timeouts/runtime evidence, not a guessed sleep. If containment/drain cannot be established, stop before incompatible app/rules changes.
6. Deploy the exact approved candidate in paused mode, hardened application rules and Storage rules. Verify active deployment/rule identity, paused dynamic503, probe200, worker delivery and denied direct writes. Confirm archive IAM and payment provider event/version compatibility.
7. Reopen only on a verified candidate-compatible app/rules pair. Verify authorized application submission/history/archive retrieval, publishing quotas/mirrors, canonical routes, auth intent and payment processing using separately authorized safe probes. Old tabs may require refresh; do not destroy unsaved drafts automatically.
8. Monitor errors and failed provider deliveries. Do not automatically replay ambiguous old payment receipts or infer billing correctness from aggregate totals.

## Recovery
- Retain the tested candidate source/build and hardened rules as the recovery baseline. Re-enter verified containment on a failed gate.
- Never restore the original insecure app or permissive rules as a shortcut. Old server fulfillment and new session-level receipts are not rollback-equivalent.
- Preserve payment session deduplication, atomic employer/organization grants, tombstones, archived application bytes and normalized subscriptions in any recovery patch.
- Repeat payment delayed-success/replay/race/legacy-ambiguity, archive immutability, application/history, expiry/renewal, mirror/entitlement and auth suites on the recovery artifact before reopening.

## Stripe subscription
`checkout.session.async_payment_succeeded` must be enabled alongside existing endpoint subscriptions. Preserve URL, signing configuration, API version and unrelated fields; independently read back the exact endpoint after an authorized edit. The old application ignores this event: adding the subscription alone does not deploy correct fulfillment or recover earlier delayed payments.

## Unresolved operational acceptance
Local tests cannot certify production ingress containment, in-flight drain, production archive access, historical receipt reconciliation or actual provider signature delivery. Record concrete results at cutover; never mark these verified solely because this runbook exists.
