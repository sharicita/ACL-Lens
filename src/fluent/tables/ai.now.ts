import '@servicenow/sdk/global'
import {
    Table,
    StringColumn,
    ReferenceColumn,
    IntegerColumn,
    BooleanColumn,
    Password2Column,
    Record,
} from '@servicenow/sdk/core'

// AI providers the Security Assistant can use. Managed by ACL Lens admins only.
export const x_acllens_ai_provider = Table({
    name: 'x_acllens_ai_provider',
    label: 'ACL Lens AI Provider',
    display: 'name',
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        type: StringColumn({
            label: 'Type',
            maxLength: 40,
            mandatory: true,
            default: 'now_assist',
            dropdown: 'dropdown_without_none',
            choices: {
                now_assist: 'Now Assist (Generative AI Controller)',
                anthropic: 'Anthropic Claude (Messages API)',
                openai_compatible: 'OpenAI-compatible (chat/completions)',
                azure_openai: 'Azure OpenAI',
            },
        }),
        active: BooleanColumn({ label: 'Active', default: true }),
        is_default: BooleanColumn({
            label: 'Default',
            default: false,
            hint: 'Used when Now Assist is not available. Now Assist is always preferred when it is available.',
        }),
        order: IntegerColumn({ label: 'Order', default: '100' }),
        endpoint: StringColumn({
            label: 'Endpoint URL',
            maxLength: 1000,
            hint: 'Anthropic: https://api.anthropic.com/v1/messages · OpenAI-compatible: base URL ending in /v1 · Azure: full chat/completions URL incl. api-version',
        }),
        model: StringColumn({ label: 'Model', maxLength: 200, hint: 'e.g. claude-opus-5-5' }),
        allow_custom_endpoint: BooleanColumn({
            label: 'Allow custom endpoint',
            default: false,
            hint: 'Only for an approved AI gateway or proxy. When off, Anthropic and Azure providers may only call their own service hosts.',
        }),
        api_key: Password2Column({ label: 'API key', maxLength: 1000 }),
        capability: ReferenceColumn({
            label: 'Now Assist skill / capability',
            referenceTable: 'sys_one_extend_capability',
            hint: 'The Now Assist skill to call (for example a Now Assist Skill Kit skill with a "prompt" input). Leave empty to auto-detect a generic prompt capability.',
        }),
        skill_input: StringColumn({
            label: 'Skill input name',
            maxLength: 100,
            default: 'prompt',
            hint: 'Name of the skill input that receives the full prompt text.',
        }),
        // superseded by "capability"; kept (hidden) so existing values still work
        capability_id: StringColumn({ label: 'Now Assist capability sys_id (legacy)', maxLength: 32, active: false }),
        max_tokens: IntegerColumn({ label: 'Max output tokens', default: '16000' }),
        timeout_seconds: IntegerColumn({ label: 'Timeout (seconds)', default: '120' }),
        notes: StringColumn({ label: 'Notes', maxLength: 1000 }),
    },
})

export const x_acllens_ai_conversation = Table({
    name: 'x_acllens_ai_conversation',
    label: 'ACL Lens AI Conversation',
    display: 'title',
    schema: {
        title: StringColumn({ label: 'Title', maxLength: 200 }),
        user: ReferenceColumn({ label: 'User', referenceTable: 'sys_user', mandatory: true }),
        provider: ReferenceColumn({ label: 'Provider', referenceTable: 'x_acllens_ai_provider' }),
        run: ReferenceColumn({ label: 'Related run', referenceTable: 'x_acllens_run', cascadeRule: 'clear' }),
        message_count: IntegerColumn({ label: 'Messages', default: '0' }),
    },
})

export const x_acllens_ai_message = Table({
    name: 'x_acllens_ai_message',
    label: 'ACL Lens AI Message',
    schema: {
        conversation: ReferenceColumn({
            label: 'Conversation',
            referenceTable: 'x_acllens_ai_conversation',
            cascadeRule: 'delete',
            mandatory: true,
        }),
        seq: IntegerColumn({ label: 'Sequence' }),
        role: StringColumn({ label: 'Role', maxLength: 20, dropdown: 'dropdown_without_none', choices: { user: 'User', assistant: 'Assistant' } }),
        content: StringColumn({ label: 'Content', maxLength: 65000 }),
        tools_used: StringColumn({ label: 'Tools used', maxLength: 4000 }),
        provider_name: StringColumn({ label: 'Provider', maxLength: 100 }),
    },
})

// Seed provider: Now Assist (used automatically when the instance has it).
Record({
    $id: Now.ID['ai-provider-now-assist'],
    $meta: { installMethod: 'first install' },
    table: 'x_acllens_ai_provider',
    data: {
        name: 'Now Assist',
        type: 'now_assist',
        active: true,
        is_default: false,
        order: 10,
        notes: 'Uses the instance Generative AI Controller when Now Assist is licensed and a generic prompt capability is active.',
    },
})
