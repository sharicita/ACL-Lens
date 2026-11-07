import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, IntegerColumn, BooleanColumn } from '@servicenow/sdk/core'

// One record per analysis / comparison execution (the history list).
export const x_acllens_run = Table({
    name: 'x_acllens_run',
    label: 'ACL Lens Run',
    actions: { read: true, create: false, update: false, delete: false },
    allowConfiguration: false,
    display: 'number',
    autoNumber: { prefix: 'ALR', number: 1000, numberOfDigits: 7 },
    schema: {
        number: StringColumn({
            label: 'Number',
            maxLength: 40,
            readOnly: true,
            default: 'javascript:global.getNextObjNumberPadded();',
        }),
        name: StringColumn({ label: 'Name', maxLength: 200 }),
        run_type: StringColumn({
            label: 'Run type',
            maxLength: 40,
            dropdown: 'dropdown_without_none',
            choices: { analyze: 'Analysis', compare: 'Comparison' },
            default: 'analyze',
            mandatory: true,
        }),
        status: StringColumn({
            label: 'Status',
            maxLength: 40,
            dropdown: 'dropdown_without_none',
            choices: { running: 'Running', complete: 'Complete', error: 'Error' },
            default: 'running',
            mandatory: true,
        }),
        subject_summary: StringColumn({ label: 'Subjects', maxLength: 1000 }),
        subjects: StringColumn({ label: 'Subjects (JSON)', maxLength: 4000 }),
        filter: StringColumn({ label: 'Filter (JSON)', maxLength: 4000 }),
        summary: StringColumn({ label: 'Summary (JSON)', maxLength: 8000 }),
        original_run: ReferenceColumn({
            label: 'Rerun of',
            referenceTable: 'x_acllens_run',
            cascadeRule: 'clear',
        }),
        run_by: ReferenceColumn({ label: 'Run by', referenceTable: 'sys_user', mandatory: true }),
        table_count: IntegerColumn({ label: 'Tables analyzed' }),
        diff_count: IntegerColumn({ label: 'Differences' }),
        duration_ms: IntegerColumn({ label: 'Duration (ms)' }),
        error_message: StringColumn({ label: 'Error', maxLength: 4000 }),
        archived: BooleanColumn({ label: 'Archived', default: false }),
    },
    index: [
        { name: 'archived_created', unique: false, element: ['archived', 'sys_created_on'] },
        { name: 'status', unique: false, element: 'status' },
    ],
})
