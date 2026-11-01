/**
 * Bouncer abilities: authorization rules that do not belong to a record.
 *
 * Empty on purpose. This project's per-record rules live in
 * `app/policies/` (`backend.md` §4.6), and the file exists because
 * `initialize-bouncer.middleware` imports it to build `ctx.bouncer`.
 */
export {}
