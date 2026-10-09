# ADR-0002: Run History Storage in Chunked JSON Rows

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [Data dictionary](../data-dictionary.md) |

## Context
A run can cover thousands of tables × up to 8 subjects × 4 operations, plus field rules and the ACLs that decided them. That's several MB of JSON. Options were: a normalized cell table (millions of rows), attachments (size limits on `getContent`, harder cleanup), or chunked rows.

## Decision
- One `_run` record per run holds the metadata and a compact summary for History.
- Payloads (`results`, `comparison`, `drift`) are stored as ordered 60,000-character chunks in `_run_data` (cascade delete).
- Stored ACLs are pruned to the ones the run references.
- Subject labels are stored on the run so renamed users or roles still read correctly.
- Comparison CSVs are also attached to the run for platform-side download.

## Consequences
- Simple, reliable reads and writes; whole-run reload for reopen, rerun and drift.
- Not queryable cell by cell in reports. If that's needed later, add a reporting view or export instead of normalizing.
- Clearing must delete chunks and attachments with the run. `settings.ts` does this explicitly.
