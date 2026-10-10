import { gs, GlideDateTime } from '@servicenow/glide'
import { AclIndex } from './acl-index.ts'
import { Evaluator, emptyCounts } from './evaluator.ts'
import { Schema, tablesDefiningFields, listFields, FieldMeta } from './schema.ts'
import { loadElevatedRoles, resolveSubject } from './subjects.ts'
import {
    AnalysisFilter,
    AnalysisResult,
    Cell,
    FIELD_OPS,
    FieldRow,
    SubjectRef,
    SubjectResult,
    TABLE_OPS,
    TableResult,
} from './types.ts'

const DEFAULT_MAX_TABLES = 1500
const HARD_MAX_TABLES = 5000

function splitList(value?: string): string[] {
    return (value || '')
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => !!s)
}

function candidateTables(filter: AnalysisFilter, schema: Schema, warnings: string[]): string[] | null {
    switch (filter.mode) {
        case 'tables': {
            const names = splitList(filter.value)
            const missing = names.filter((n) => !schema.exists(n))
            if (missing.length) warnings.push(`Unknown tables ignored: ${missing.join(', ')}`)
            return names.filter((n) => schema.exists(n))
        }
        case 'prefix': {
            const prefixes = splitList(filter.value)
            if (!prefixes.length) throw new Error('Enter at least one table name prefix')
            return schema.allNames().filter((n) => prefixes.some((p) => n.indexOf(p) === 0))
        }
        case 'scope': {
            const scope = (filter.value || '').trim()
            if (!scope) throw new Error('Enter an application scope (for example x_acme_app or global)')
            return schema.tablesInScope(scope)
        }
        case 'all':
            return schema.allNames()
        default:
            // secured_by_roles: resolved after the ACL index is loaded
            return null
    }
}

export interface AnalysisContext {
    schema: Schema
    index: AclIndex
    elevated: { [r: string]: boolean }
    defaultDeny: boolean
}

export function buildContext(schema: Schema, tables: string[] | null): AnalysisContext {
    let names: string[] | null = null
    if (tables) {
        const all: { [n: string]: boolean } = {}
        for (const t of tables) for (const c of schema.chain(t)) all[c] = true
        names = Object.keys(all)
    }
    return {
        schema,
        index: new AclIndex().load(names),
        elevated: loadElevatedRoles(),
        defaultDeny: gs.getProperty('glide.sm.default_mode', 'deny') !== 'allow',
    }
}

function evaluateTable(
    ev: Evaluator,
    ctx: AnalysisContext,
    table: string,
    includeFields: boolean,
    starFieldTables: { [f: string]: { [t: string]: boolean } }
): TableResult {
    const chain = ctx.schema.chain(table)
    const ops: { [op: string]: Cell } = {}
    for (const op of TABLE_OPS) ops[op] = ev.evalLevels(ev.tableLevels(chain), op)

    const fields: FieldRow[] = []
    if (includeFields) {
        // fields with explicit rules on this table, a parent, or "*" (if the column exists here)
        const names: { [f: string]: boolean } = {}
        for (const t of chain) for (const f in ctx.index.fieldsByTable[t] || {}) names[f] = true
        for (const f in ctx.index.fieldsByTable['*'] || {}) {
            const definers = starFieldTables[f] || {}
            if (chain.some((t) => definers[t])) names[f] = true
        }
        const rows = ['*'].concat(Object.keys(names).sort())
        for (const f of rows) {
            const fo: { [op: string]: Cell } = {}
            for (const op of FIELD_OPS) fo[op] = ev.evalLevels(ev.fieldLevels(chain, f), op)
            fields.push({ f, ops: fo })
        }
    }
    return { t: table, l: ctx.schema.label(table), ops, fields }
}

export function analyze(refs: SubjectRef[], filter: AnalysisFilter): AnalysisResult {
    if (!refs || !refs.length) throw new Error('Select at least one user or role')
    if (refs.length > 8) throw new Error('A maximum of 8 subjects can be analyzed at once')
    const warnings: string[] = []
    const timings: { [phase: string]: number } = {}
    let mark = new Date().getTime()
    const lap = (phase: string) => {
        const now = new Date().getTime()
        timings[phase] = now - mark
        mark = now
    }
    const subjects = refs.map((r) => resolveSubject(r))
    lap('subjects')

    // Load schema first so the filter can decide whether a targeted ACL load is possible.
    const schema = new Schema().load()
    lap('schema')
    let tables = candidateTables(filter, schema, warnings)
    // "Include extended tables": add every table that extends a selected one (targeted ACL load still applies)
    const addChildren = (list: string[]) => {
        if (!filter.includeChildren || filter.mode === 'all') return list
        const have: { [n: string]: boolean } = {}
        for (const n of list) have[n] = true
        const extra = schema.descendants(list).filter((n) => !have[n])
        if (extra.length) warnings.push(`Extended tables included: ${extra.length} table${extra.length === 1 ? '' : 's'} that extend the selected ones were added.`)
        return list.concat(extra)
    }
    if (tables) tables = addChildren(tables)
    const ctx = buildContext(schema, tables)
    lap('acls')

    if (tables === null) {
        const roleSet: { [r: string]: boolean } = {}
        for (const s of subjects) for (const r of s.roles) roleSet[r] = true
        tables = addChildren(ctx.index.tablesSecuredBy(roleSet).filter((t) => ctx.schema.exists(t)))
        if (subjects.some((s) => s.isAdmin)) {
            warnings.push('An admin subject is included: "Secured by roles" lists only tables whose ACLs name the subjects\' roles; admin can typically access far more.')
        }
    }
    if (filter.excludeSystem) tables = tables.filter((t) => !ctx.schema.isSystem(t))

    const max = Math.min(filter.maxTables || DEFAULT_MAX_TABLES, HARD_MAX_TABLES)
    let truncated = false
    if (tables.length > max) {
        warnings.push(`${tables.length} tables matched; only the first ${max} (alphabetical) were analyzed. Narrow the filter or raise "Max tables".`)
        tables = tables.slice(0, max)
        truncated = true
    }

    const includeFields = filter.includeFields !== false
    const chainTables: { [t: string]: boolean } = {}
    if (includeFields) for (const t of tables) for (const c of ctx.schema.chain(t)) chainTables[c] = true
    const starFieldTables = includeFields ? tablesDefiningFields(ctx.index.starFields(), Object.keys(chainTables)) : {}
    lap('starFields')

    const results: SubjectResult[] = subjects.map((subject) => {
        const ev = new Evaluator(ctx.index, subject, ctx.elevated)
        const counts = emptyCounts(TABLE_OPS)
        const tr = (tables as string[]).map((t) => {
            const r = evaluateTable(ev, ctx, t, includeFields, starFieldTables)
            for (const op of TABLE_OPS) counts[op][r.ops[op].s]++
            return r
        })
        if (!subject.active) warnings.push(`${subject.label} is inactive - they cannot log in, results show what their roles would allow.`)
        return { subject, tables: tr, counts }
    })
    lap('evaluate')

    return {
        version: 1,
        generatedAt: new GlideDateTime().getDisplayValue(),
        defaultDeny: ctx.defaultDeny,
        filter,
        tableCount: tables.length,
        truncated,
        warnings,
        timings,
        acls: ctx.index.acls,
        subjects: results,
    }
}

/** Compacts the ACL dictionary to only the entries referenced by the results. */
export function pruneAcls(result: AnalysisResult): AnalysisResult {
    const used: { [i: number]: number } = {}
    const acls: typeof result.acls = []
    const remap = (cell: Cell) => {
        for (const o of cell.a) {
            if (used[o.i] === undefined) {
                used[o.i] = acls.length
                acls.push(result.acls[o.i])
            }
            o.i = used[o.i]
        }
    }
    for (const s of result.subjects)
        for (const t of s.tables) {
            for (const op in t.ops) remap(t.ops[op])
            for (const f of t.fields) for (const op in f.ops) remap(f.ops[op])
        }
    result.acls = acls
    return result
}

export interface FieldDetailRow {
    field: FieldMeta
    cells: { [subjectKey: string]: { [op: string]: Cell } }
}

/** Full field-by-field drill-down for one table (every column, not only explicit rules). */
export function fieldDetail(table: string, refs: SubjectRef[]) {
    const schema = new Schema().load()
    if (!schema.exists(table)) throw new Error(`Unknown table ${table}`)
    const ctx = buildContext(schema, [table])
    const chain = ctx.schema.chain(table)
    const subjects = refs.map((r) => resolveSubject(r))
    const evaluators = subjects.map((s) => new Evaluator(ctx.index, s, ctx.elevated))
    const rows: FieldDetailRow[] = listFields(ctx.schema, table).map((field) => {
        const cells: { [k: string]: { [op: string]: Cell } } = {}
        evaluators.forEach((ev, i) => {
            const fo: { [op: string]: Cell } = {}
            for (const op of FIELD_OPS) fo[op] = ev.evalLevels(ev.fieldLevels(chain, field.name), op)
            cells[subjects[i].key] = fo
        })
        return { field, cells }
    })
    const tableCells: { [k: string]: { [op: string]: Cell } } = {}
    evaluators.forEach((ev, i) => {
        const o: { [op: string]: Cell } = {}
        for (const op of TABLE_OPS) o[op] = ev.evalLevels(ev.tableLevels(chain), op)
        tableCells[subjects[i].key] = o
    })
    return {
        table,
        label: ctx.schema.label(table),
        chain,
        defaultDeny: ctx.defaultDeny,
        subjects: subjects.map((s) => ({ key: s.key, label: s.label, type: s.type })),
        tableCells,
        rows,
        acls: ctx.index.acls,
    }
}
