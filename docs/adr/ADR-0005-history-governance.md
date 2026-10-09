# ADR-0005: Admin-Controlled History, Clearing and Retention

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [04 §6](../architecture/04-security-architecture.md#6-data-retention-and-privacy), [Data dictionary](../data-dictionary.md#system-properties) |

## Context
Runs hold security posture data, and some organizations must keep it for audit while others must not keep it. Admins need to stop collection, remove data on demand and enforce retention.

## Decision
- **Properties:** history enabled (default **on**), retention enabled (default **off**), retention days (default **90**), retention action (`delete` default, or `archive`). Writable by `x_acllens.admin` only.
- **History off:** runs are computed and returned with `unsaved=true`. Nothing is stored, and Rerun is hidden.
- **Clear history now** (admin): all, date range (admin's time zone) or older than N days, optionally including archived. Preview count first. Deletes runs, chunks and CSV attachments, and logs who cleared what.
- **Retention:** a daily scheduled job at 02:30 that does nothing unless enabled. Archive marks runs `archived` (hidden from History; admins can show and restore them).
- Settings UI is the in-app **Properties** module, so related actions (clearing, preview) sit beside the switches.

## Consequences
- Data handling is controlled without code changes.
- Archived runs still use storage. Deleting is permanent (no recycle bin).
- Assistant conversations are not covered yet (open item O-03).
