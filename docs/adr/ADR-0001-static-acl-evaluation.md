# ADR-0001: Static ACL Evaluation Instead of Impersonation

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [03](../architecture/03-access-evaluation-engine.md), [04 §2](../architecture/04-security-architecture.md#2-roles) |

## Context
Showing what *another* user or a role can access needs either live evaluation as that user (impersonation, `GlideRecordSecure` in their session) or a model of the platform's ACL rules. Impersonation is intrusive, needs privileged APIs, gives nothing for a role (which isn't a session), and can't explain *why*.

## Decision
Evaluate statically:
- Read ACLs, ACL roles, effective roles and the table hierarchy.
- Apply the platform matching order (first level with rules; allow-if = any passes; deny-unless = all pass).
- Report outcomes that depend on a record or session (condition, script, unresolved security attribute, applies-to, elevation) as **Conditional**, with the reason.
- Never guess them.

The engine reads with `GlideRecord`, because it must see rules that apply to other subjects. Access is therefore governed by the app role, which is documented as sensitive.

## Consequences
- Fast and explainable. Works for roles and inactive users. Comparable across subjects.
- *Granted* means "ACLs allow". Query business rules, data filters and domain separation are out of scope and documented.
- For the signed-in user's *own* live access, the assistant's `check_my_access` asks the platform directly.
- Engine rules are isolated in `evaluator.ts` and covered by offline tests, so platform semantic changes can be tracked.
