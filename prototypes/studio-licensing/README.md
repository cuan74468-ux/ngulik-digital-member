# Linggau AI Studio membership — isolated STAGING source candidate

Base Ngulik Digital main 3dabc17e8c2db1d439bf47b1f6d73425c36b7ccc. No deployment, no schema edits, no changes to existing Apps Script source or member/payments logic. This directory is not part of the GAS sync package.

## Verified source findings

- Code.gs issueSession_/session_ store a hash, enforce unique token, expiration, active member, unchanged role; portal session TTL 7 days.
- OtpAuth.gs member OTP explicitly STAGING-only, 5-minute OTP, attempts/cooldown, generic acceptance for unknown number, rejects ADMIN. Existing portal session format does not attest OTP authentication method; candidate inherits authenticated portal identity, not a new OTP proof.
- ngdStarterUnlocked_ checks paid/fulfilled Starter order; do not infer Starter entitles Studio. Pricing, entitlement duration and refund/revocation policy are not decided. Pilot only: explicit member IDs from owner, no new SKU or finance activation.
- js/api.js uses simple text/plain POST to GAS with JSON envelope; runtime parity, provider quota and Canvas CORS remain unverified.

## Protocol and safeguards

Authenticated Ngulik portal issues 64-character one-use code (3 minutes); member manually pastes into Studio. Never put code or portal token in URL, clipboard history beyond necessary copy, analytics or logs. Exchange only returns scoped Studio bearer (30 minutes). Keep Studio token in runtime memory; no localStorage; reload requires login again. Parent portal session hash rechecked on exchange and every Studio validation, member role/status and current allowlist checked. One current Studio session per member (new exchange replaces earlier). Logout idempotent. No raw credential stored in server cache. Cache can evict early; reject rather than fail open. LockService serializes cooperating actions. HMAC token derivation requires independently generated random 256-bit secret in Script Properties; never commit real secret. Cache is ephemeral, not durable audit or general session/anti-abuse database; cooldown best effort, not a robust public rate limiter. Verify GAS execution limits, real entropy/secret provisioning, provider rate limits, and error redaction before exposure.

## Activation prerequisites (NOT performed)

Review and diff actual STAGING source. Install module and explicit gateway action allowlist/dispatcher; ensure no scoped token accepted by member/admin APIs. Add portal UI issue button after authenticated login, then Canvas login form, session validation/logout, abort/unmount on expiry, real cross-origin check and negative tests. Require STAGING environment, exact matching dedicated DB ID and enable flag; existing mutations flag for grant/exchange. No finance or registration flags altered. Do not use query-string tokens or JSONP, do not enable broad CORS proxy. Activate only with approval and tested rollback. No production or commercial deployment until security and product policy gates pass.

## Scope boundary

Licensing authorizes official product UI and protected Ngulik server resources only. Canvas recipient may copy and modify client code; local tools and provider-owned Gemini runtime cannot be reliably restricted by our frontend gate. Do not advertise uncopyable code, paid unlimited Gemini, or guaranteed revocation of copied runtime. Verify allowed provider integration and commercial terms independently; no circumvention. Obfuscation is cosmetic and must not conceal provider authorization or secrets. Do not copy Affiliate GO implementation.

## Gateway candidate integration
Backend isolated CI 45827156342 passed 6/6; wrapper client CI 45827288643 passed 4/4. On this branch only Code.gs includes exact four-action gateway before legacy router, validates request id and credential/payload shape, redacts all Studio errors, and embeds tested module to avoid introducing new GAS file inventory. Dedicated pilot guard stays default OFF; no schema, pricing, finance or existing auth changes. Added tests against real doPost, ordinary route separation and retired callback behavior; run normal existing repository unit suite as additional nondeployment check. Actual runtime source parity and gateway activation remain unverified. Embedded module copy must equal tested source. This candidate must not be merged/deployed until reviewed GAS package fingerprint and owner approval.
