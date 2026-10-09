import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, IntegerColumn, BooleanColumn } from '@servicenow/sdk/core'

// One record per analysis / comparison execution (the history list).
export const x_acllens_run = Table({
    name: 'x_acllens_run',
    label: 'ACL Lens Run',
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
        }),
        status: StringColumn({
            label: 'Status',
            maxLength: 40,
            dropdown: 'dropdown_without_none',
            choices: { running: 'Running', complete: 'Complete', error: 'Error' },
            default: 'running',
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
        run_by: ReferenceColumn({ label: 'Run by', referenceTable: 'sys_user' }),
        table_count: IntegerColumn({ label: 'Tables analyzed' }),
        diff_count: IntegerColumn({ label: 'Differences' }),
        duration_ms: IntegerColumn({ label: 'Duration (ms)' }),
        error_message: StringColumn({ label: 'Error', maxLength: 4000 }),
        archived: BooleanColumn({ label: 'Archived', default: false }),
    },
})
