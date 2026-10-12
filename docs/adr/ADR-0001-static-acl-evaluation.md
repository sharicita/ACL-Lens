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
- *Granted* means "ACLs allow, and no security data filter limits the rows" (filters that apply turn Granted into Conditional). Query business rules, access handlers, data filtration, OAuth/API policy and domain separation are out of scope statically and documented.
- Where the platform can do it, a live check closes the gap. **Verify live** runs the platform's own evaluation (the Access Analyzer's, which evaluates as the subject) for every table of a run as the baseline subject and lists where it differs from the prediction. It needs a role the platform grants for that evaluation (`admin`, `user_admin`, `access_analyzer_admin`); ACL Lens doesn't widen it.
- For the signed-in user's *own* live access, the assistant's `check_my_access` asks the platform directly.
- Engine rules are isolated in `evaluator.ts` and covered by offline tests, so platform semantic changes can be tracked.
