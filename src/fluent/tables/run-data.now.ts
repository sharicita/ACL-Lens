import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, IntegerColumn } from '@servicenow/sdk/core'

// Chunked JSON payloads (results / comparison / drift) belonging to a run.
export const x_acllens_run_data = Table({
    name: 'x_acllens_run_data',
    label: 'ACL Lens Run Data',
    schema: {
        run: ReferenceColumn({
            label: 'Run',
            referenceTable: 'x_acllens_run',
            cascadeRule: 'delete',
            mandatory: true,
        }),
        kind: StringColumn({
            label: 'Kind',
            maxLength: 40,
            dropdown: 'dropdown_without_none',
            choices: { results: 'Results', comparison: 'Comparison', drift: 'Drift' },
        }),
        seq: IntegerColumn({ label: 'Sequence' }),
        payload: StringColumn({ label: 'Payload', maxLength: 65000 }),
    },
    index: [{ name: 'run_kind_seq', unique: false, element: ['run', 'kind', 'seq'] }],
})
