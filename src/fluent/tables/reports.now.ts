import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, IntegerColumn, BooleanColumn } from '@servicenow/sdk/core'

// Reporting dashboard: report definitions. Results are calculated from saved runs on demand, so
// nothing here stores access data. Shipped reports are "system" (read-only); Customize makes a copy.
export const x_acllens_report = Table({
    name: 'x_acllens_report',
    label: 'ACL Lens Report',
    display: 'name',
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        description: StringColumn({ label: 'Description', maxLength: 1000 }),
        category: StringColumn({
            label: 'Category',
            maxLength: 40,
            dropdown: 'dropdown_without_none',
            choices: { overview: 'Overview', high_risk: 'High risk', vulnerability: 'Vulnerability', comparison: 'Comparison' },
            default: 'overview',
        }),
        measure: StringColumn({ label: 'Measure', maxLength: 40, mandatory: true }),
        chart: StringColumn({
            label: 'Chart',
            maxLength: 20,
            dropdown: 'dropdown_without_none',
            choices: { tile: 'Number', bar: 'Bar chart', donut: 'Donut', list: 'List' },
            default: 'bar',
        }),
        options: StringColumn({ label: 'Options (JSON)', maxLength: 4000 }),
        owner: ReferenceColumn({ label: 'Owner', referenceTable: 'sys_user' }),
        shared: BooleanColumn({ label: 'Shared with all ACL Lens users', default: false }),
        system: BooleanColumn({ label: 'Shipped with the app', default: false, readOnly: true }),
        on_default: BooleanColumn({ label: 'On the default dashboard', default: false }),
        copied_from: ReferenceColumn({ label: 'Copied from', referenceTable: 'x_acllens_report', cascadeRule: 'clear' }),
        order: IntegerColumn({ label: 'Order', default: 100 }),
    },
})

// One dashboard layout per user. Without one, the user sees the default (reports marked "on_default").
export const x_acllens_dashboard = Table({
    name: 'x_acllens_dashboard',
    label: 'ACL Lens Dashboard',
    display: 'owner',
    schema: {
        owner: ReferenceColumn({ label: 'Owner', referenceTable: 'sys_user', mandatory: true }),
        layout: StringColumn({ label: 'Layout (JSON)', maxLength: 4000 }),
        run: ReferenceColumn({ label: 'Run shown', referenceTable: 'x_acllens_run', cascadeRule: 'clear' }),
    },
})
