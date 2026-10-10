// Reporting dashboard shapes (mirror src/server/engine/report-measures.ts and src/server/reports/reports.ts).

export type Dim = 'subject' | 'kind' | 'table' | 'operation' | 'status' | 'role' | 'acl' | 'level' | 'change' | 'filter'
export type ChartType = 'tile' | 'bar' | 'donut' | 'list'
export type Category = 'overview' | 'high_risk' | 'vulnerability' | 'comparison'

export interface ReportOptions {
    ops?: string[]
    statuses?: string[]
    tables?: string[]
    tableText?: string
    kinds?: string[]
    roles?: string[]
    groupBy?: Dim | ''
    limit?: number
}

export interface Report {
    sys_id: string
    name: string
    description: string
    category: Category
    measure: string
    chart: ChartType
    options: ReportOptions
    owner: string
    owner_name: string
    shared: boolean
    system: boolean
    on_default: boolean
    copied_from: string
    mine: boolean
    can_edit: boolean
}

export interface Measure {
    id: string
    label: string
    category: Category
    description: string
    unit: string
    dims: Dim[]
    groupBy: Dim
}

export interface Catalog {
    measures: Measure[]
    highRiskTables: string[]
    privilegedRoles: string[]
    operations: string[]
}

export interface Fact {
    subject?: string
    kind?: string
    table?: string
    tableLabel?: string
    field?: string
    operation?: string
    status?: string
    role?: string
    acl?: string
    level?: string
    change?: string
    filter?: string
}

export interface ReportGroup {
    key: string
    label: string
    value: number
    parts?: { [status: string]: number }
}

export interface ReportData {
    measure: string
    unit: string
    total: number
    groupBy: Dim | ''
    groups: ReportGroup[]
    columns: { key: string; label: string }[]
    rows: Fact[]
    rowsTruncated: boolean
    tables: string[]
    note?: string
    error?: string
}

export interface Tile {
    report: string
    size: 1 | 2
}

export interface Dashboard {
    layout: Tile[]
    custom: boolean
    run: string
}

export const CATEGORY_LABEL: { [c: string]: string } = {
    overview: 'Overview',
    high_risk: 'High risk',
    vulnerability: 'Vulnerability',
    comparison: 'Comparison',
}

export const DIM_LABEL: { [d: string]: string } = {
    subject: 'Subject',
    kind: 'Account type',
    table: 'Table',
    operation: 'Operation',
    status: 'Result',
    role: 'Role',
    acl: 'ACL',
    level: 'Level',
    change: 'Change',
    filter: 'Data filter',
}

export const CHART_LABEL: { [c: string]: string } = { tile: 'Number', bar: 'Bar chart', donut: 'Donut', list: 'List' }

/** Colour token for a result or category label (falls back to the series palette). */
export const TONE: { [label: string]: string } = {
    Granted: 'g',
    Conditional: 'c',
    Denied: 'd',
    'No rule': 'n',
    'No rule (allowed)': 'c',
    Applied: 'c',
    'Not applied': 'g',
    Depends: 'n',
}
