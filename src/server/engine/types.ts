// Shared types for the ACL Lens analysis engine.
// The same shapes are mirrored in src/client/types.ts for the UI.

export type Op =
    | 'create'
    | 'read'
    | 'write'
    | 'delete'
    | 'list_edit'
    | 'query_match'
    | 'query_range'
    | 'add_to_list'
    | 'save_as_template'
    | 'report_on'
    | 'personalize_choices'
    | 'report_view'
/** the core record operations (cards, counts and summaries use these) */
export const TABLE_OPS: Op[] = ['create', 'read', 'write', 'delete']
/** the other table operations the platform checks (the Access Analyzer lists these too) */
export const EXTRA_OPS: Op[] = ['list_edit', 'query_match', 'query_range', 'add_to_list', 'save_as_template', 'report_on', 'personalize_choices', 'report_view']
export const ALL_TABLE_OPS: Op[] = TABLE_OPS.concat(EXTRA_OPS)
export const FIELD_OPS: Op[] = ['create', 'read', 'write']

/**
 * G = Granted     - at least one matching allow ACL passes outright, no deny-unless blocks it
 * C = Conditional - roles are satisfied but access depends on a condition, script, security
 *                   attribute, "applies to" filter or role elevation (record-dependent)
 * D = Denied      - no matching allow ACL can pass, or a deny-unless ACL fails
 * N = No rule     - no ACL matches at any level; outcome follows glide.sm.default_mode
 */
export type Status = 'G' | 'C' | 'D' | 'N'

/** Per-ACL outcome: P = pass, C = conditional, F = fail */
export type AclResult = 'P' | 'C' | 'F'

/**
 * Reason codes (kept short to keep stored payloads small; the UI expands them):
 * open   - ACL has no roles/conditions/script, anyone passes
 * role   - subject holds a required role
 * admin  - admin role + "Admin overrides" checked
 * adminrole - admin implicitly satisfies the role requirement
 * norole - subject holds none of the required roles
 * elev   - only matching roles are elevated privilege roles (must be elevated in session)
 * cond   - ACL has a condition (record dependent)
 * script - ACL has an advanced script (record/session dependent)
 * attr   - ACL uses a security attribute that cannot be resolved statically
 * attrfail - security attribute statically fails for this subject
 * scope  - ACL has an "Applies to" filter (applies only to matching records)
 */
export type Reason =
    | 'open'
    | 'role'
    | 'admin'
    | 'adminrole'
    | 'norole'
    | 'elev'
    | 'cond'
    | 'script'
    | 'attr'
    | 'attrfail'
    | 'scope'

export interface SubjectRef {
    type: 'user' | 'role' | 'group'
    id: string
}

export type RoleAssignment = 'direct' | 'group' | 'inherited' | 'selected' | 'contained'

export interface RoleSource {
    role: string
    /** human readable, e.g. "group: Service Desk" */
    via: string
    kind: RoleAssignment
    /** group name (group) or the role that contains it (inherited / contained) */
    from?: string
}

/** User account classification (sys_user.identity_type and related flags), when the release has them */
export interface AccountInfo {
    identity: 'human' | 'machine' | 'ai_agent' | 'unclassified' | ''
    identityLabel: string
    webServiceOnly: boolean
    integrationUser: boolean
}

export interface Subject extends SubjectRef {
    account?: AccountInfo
    key: string
    label: string
    sub: string
    active: boolean
    isAdmin: boolean
    roles: string[]
    roleSources: RoleSource[]
}

export interface AclInfo {
    id: string
    name: string
    op: Op
    decision: 'allow' | 'deny'
    roles: string[]
    adminOverrides: boolean
    condition: string
    hasScript: boolean
    securityAttribute: string
    appliesTo: string
    description: string
    scope: string
}

export interface AclOutcome {
    /** index into AnalysisResult.acls */
    i: number
    r: AclResult
    c: Reason
}

export interface Cell {
    s: Status
    /** matched ACL name level for allow rules (e.g. "task", "*", "incident.priority") */
    lvl: string
    /** matched deny-unless level, if any */
    dlvl?: string
    a: AclOutcome[]
    /**
     * Set when a security data filter limits which rows the subject can reach for this operation
     * (A = applied, C = depends on a security attribute). `s` already includes it.
     */
    df?: 'A' | 'C'
    /** the ACL-only status, when a data filter changed it (e.g. G -> C) */
    acl?: Status
}

export interface FieldRow {
    /** field name, or "*" for the "all other fields" wildcard row */
    f: string
    ops: { [op: string]: Cell }
}

/**
 * Security data filter outcome for a subject: A = applied (rows outside the filter are hidden),
 * N = not applied, C = depends on a security attribute that cannot be resolved statically.
 */
export type FilterResult = 'A' | 'N' | 'C'

export interface DataFilterInfo {
    id: string
    table: string
    /** "if": the filter applies IF the attribute is met; "unless": it applies UNLESS it is met */
    mode: 'if' | 'unless'
    filter: string
    securityAttribute: string
    description: string
}

export interface DataFilterOutcome {
    /** index into AnalysisResult.dataFilters */
    i: number
    r: FilterResult
}

export interface TableResult {
    t: string
    l: string
    ops: { [op: string]: Cell }
    fields: FieldRow[]
    /** security data filters on the table or a parent (missing on runs saved before they were analyzed) */
    sdf?: DataFilterOutcome[]
}

export type Counts = { [op: string]: { [s: string]: number } }

export interface SubjectResult {
    subject: Subject
    tables: TableResult[]
    counts: Counts
}

export type FilterMode = 'secured_by_roles' | 'tables' | 'prefix' | 'scope' | 'all'

export interface AnalysisFilter {
    mode: FilterMode
    /** comma separated table names, prefixes, or a scope name depending on mode */
    value?: string
    includeFields?: boolean
    excludeSystem?: boolean
    maxTables?: number
    /** also analyze every table that extends a selected table */
    includeChildren?: boolean
}

export interface AnalysisResult {
    version: 1
    generatedAt: string
    defaultDeny: boolean
    filter: AnalysisFilter
    tableCount: number
    truncated: boolean
    warnings: string[]
    /** milliseconds spent per phase, for diagnosing slow runs */
    timings?: { [phase: string]: number }
    acls: AclInfo[]
    /** security data filters referenced by TableResult.sdf */
    dataFilters?: DataFilterInfo[]
    /** operations evaluated for tables (runs saved before the extra operations hold only TABLE_OPS) */
    ops?: Op[]
    subjects: SubjectResult[]
}
