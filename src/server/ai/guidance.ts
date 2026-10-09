// Built-in guidance for the Security Assistant. Served to the model as its operating rules,
// exposed through the MCP server as resources/prompts, and returned by the best_practices tool.

export const GUIDANCE: { [topic: string]: { title: string; text: string } } = {
    evaluation: {
        title: 'How ServiceNow evaluates record ACLs',
        text: `- Table rules match in order: table -> parent tables -> "*". Field rules: table.field -> parent.field -> *.field -> table.* -> parent.* -> *.*. Only the first level that has rules for the operation is evaluated.
- Allow-if ACLs: the user must pass at least one matched ACL. Deny-unless ACLs: the user must pass every matched ACL; they are evaluated first.
- Each ACL passes only if roles, condition and script all pass (plus a security attribute when used). An empty part counts as passed.
- Users with admin pass role checks implicitly (except elevated-privilege roles such as security_admin), and pass the whole ACL when "Admin overrides" is checked.
- If nothing matches, glide.sm.default_mode decides (deny on most instances).
- Field access needs record access too. Query business rules and data filters can hide rows even when ACLs allow them.`,
    },
    troubleshooting: {
        title: 'Troubleshooting access problems',
        text: `1. Reproduce: confirm the exact user, table, record, field and operation, and the UI (form, list, portal, API).
2. Check roles first (directly assigned, via groups, contained roles) - most access issues are a missing role.
3. Find the ACL level that matched (ACL Lens table detail, or Debug Security Rules / Access Analyzer) and check deny-unless rules before allow-if.
4. If the outcome is "conditional", read the condition or script and test it against the specific record.
5. Rule out non-ACL causes: query business rules, before-query rules, data filters, domain separation, UI policies/client scripts hiding fields, application cross-scope access.
6. Verify the fix by impersonating the user in a sub-production instance, then capture the change in an update set or the owning application.`,
    },
    design: {
        title: 'Designing ACLs (best practices)',
        text: `- Least privilege: grant the smallest access that meets the requirement; prefer read before write.
- Prefer roles and conditions over scripts. Scripts are slower, harder to audit and are evaluated per record.
- Never edit or deactivate out-of-box ACLs; add new rules (or deny-unless rules) so upgrades stay clean.
- Use deny-unless ACLs for broad guard rails (e.g. require snc_internal), allow-if ACLs for grants.
- Create table-level and matching field-level (table.*) rules for custom tables; the table "Create access controls" option generates a baseline.
- Group roles by persona and assign roles to groups, not individual users.
- In scripts, avoid gs.hasRole() for role checks (use the Roles list), avoid GlideRecord queries, and always set answer explicitly.
- Keep custom application ACLs in that application's scope; document intent in the Description field.
- ACL changes require security_admin elevation; plan them through change management.`,
    },
    testing: {
        title: 'Testing and safe rollout',
        text: `- Make and test changes in a sub-production instance first, captured in an update set or application.
- Test with impersonation for each persona: positive tests (should have access) and negative tests (should not).
- Check list, form, related lists, reports, REST/Table API and Service Portal - they all honour ACLs but may surface data differently.
- Use Debug Security Rules (session debug) to see which rules fired.
- Re-run ACL Lens before/after and compare runs to catch unintended changes; keep the run numbers in the change record.
- Have a rollback: the previous ACL state in the update set, or deactivate the new rule (never delete OOB rules).`,
    },
    scripted: {
        title: 'Scripted ACL guidance',
        text: `- Return a boolean through answer; keep scripts short and side-effect free.
- Do not query large tables; cache lookups with the session or use conditions instead.
- current can be empty for table-level (list/create) checks - guard for it.
- Check the "Advanced" box only when a script is needed; a script on a non-advanced ACL is ignored.`,
    },
    scoped_apps: {
        title: 'Custom / scoped applications',
        text: `- Define an application user role and admin role; ACLs reference those roles.
- Set table "Accessible from" and caller access deliberately; use cross-scope privileges only for what the app needs.
- Ship ACLs with the application so every install is consistent; never rely on instance-specific manual ACLs.
- For Fluent (Now SDK) apps, declare ACLs with the Acl() API and roles with Role().`,
    },
}

export const SYSTEM_PROMPT = `You are the ACL Lens Security Assistant inside a ServiceNow instance. You help the signed-in user understand access, troubleshoot access problems, and design or review ACLs and security for ServiceNow and custom applications.

Operating rules (always follow):
1. You are read-only. You cannot create, change or delete anything in the instance, and you must never claim you did. Give the user clear steps to do it themselves.
2. You only know what tools return. Tools run with the signed-in user's own permissions. If a tool reports no access, say the user does not have access to that information and suggest who can help (for example a security administrator). Never guess at data you could not read. When a tool says details are hidden, do not name or guess ACLs, rule levels or required roles; explain the outcome and reasons only.
3. Only link to records returned by tools (use the "link" values exactly). Never invent sys_ids, URLs, table names or role names.
4. Follow ServiceNow and industry security best practices: least privilege, roles over scripts, never modify out-of-box ACLs, test in sub-production with impersonation, capture changes in update sets or the owning application, elevate to security_admin only when needed, and have a rollback.
5. When you recommend a change, include: what to change and why, exact steps, how to test it (positive and negative cases), precautions and rollback.
6. Keep answers short and easy to follow: a one-line summary, then numbered steps. Use Markdown headings sparingly, bullet lists, and \`code\` for names.
7. Ask a short clarifying question when the request is ambiguous (which user, table, operation or record).
8. ACL Lens statuses: Granted = passes outright; Conditional = roles match but a condition/script/attribute decides per record; Denied; No rule = default mode applies.`

export const RESPONSE_PROTOCOL = `Reply with exactly one JSON object and nothing else:
- To use a tool: {"action":"tool","tool":"<tool name>","arguments":{...}}
- To answer the user: {"action":"answer","content":"<markdown answer>"}
Use tools when you need facts from the instance. You may call several tools one after another; after each tool result decide the next step. Do not answer before you have the facts you need.`

export function guidanceText(topic?: string): string {
    if (topic && GUIDANCE[topic]) return `${GUIDANCE[topic].title}\n${GUIDANCE[topic].text}`
    return Object.keys(GUIDANCE)
        .map((k) => `${GUIDANCE[k].title}\n${GUIDANCE[k].text}`)
        .join('\n\n')
}

export const MCP_PROMPTS: { [name: string]: { description: string; args: { name: string; description: string; required?: boolean }[]; build: (a: any) => string } } = {
    troubleshoot_access: {
        description: 'Troubleshoot why a user can or cannot access a table, record or field',
        args: [
            { name: 'user', description: 'User name or user ID', required: true },
            { name: 'table', description: 'Table name', required: true },
            { name: 'operation', description: 'create, read, write or delete' },
            { name: 'field', description: 'Field name (optional)' },
        ],
        build: (a) =>
            `Troubleshoot ${a.operation || 'access'} for user "${a.user}" on table "${a.table}"${a.field ? ` field "${a.field}"` : ''}. Check their roles, evaluate access, find the matched ACLs, rule out non-ACL causes, and give a fix with test steps and precautions.\n\n${GUIDANCE.troubleshooting.text}`,
    },
    design_acls: {
        description: 'Design ACLs for a table or custom application',
        args: [
            { name: 'table', description: 'Table name', required: true },
            { name: 'requirements', description: 'Who should be able to do what', required: true },
        ],
        build: (a) =>
            `Design ACLs for table "${a.table}". Requirements: ${a.requirements}. Inspect the table and existing ACLs first, then propose the rules (type, operation, roles, condition), test plan, precautions and rollback.\n\n${GUIDANCE.design.text}\n\n${GUIDANCE.testing.text}`,
    },
    review_acl: {
        description: 'Review an existing ACL against best practices',
        args: [{ name: 'acl', description: 'ACL sys_id or name', required: true }],
        build: (a) => `Review ACL "${a.acl}" against best practices. Explain what it does, risks, and recommended improvements with safe rollout steps.\n\n${GUIDANCE.design.text}\n\n${GUIDANCE.scripted.text}`,
    },
}
