import '@servicenow/sdk/global'
import { Property, ScheduledScript, UiPolicy, UiAction } from '@servicenow/sdk/core'
import { applyRetention } from '../server/admin/settings'

// ---- application properties (managed in ACL Lens > Properties) -------------
// App configuration is visible to and changeable by ACL Lens admins only (and admin, which passes
// every role check). Server code still reads the values for everyone through gs.getProperty.
const ADMIN = ['x_acllens.admin']
const READERS = ADMIN

Property({
    $id: Now.ID['prop-history-enabled'],
    name: 'x_acllens.history.enabled',
    type: 'boolean',
    value: 'true',
    description: 'Save every analysis/comparison run to History. When off, results are shown but not stored and cannot be rerun.',
    roles: { read: READERS, write: ADMIN },
})

Property({
    $id: Now.ID['prop-retention-enabled'],
    name: 'x_acllens.history.retention.enabled',
    type: 'boolean',
    value: 'false',
    description: 'Automatically delete or archive runs older than the retention period (daily job).',
    roles: { read: READERS, write: ADMIN },
})

Property({
    $id: Now.ID['prop-retention-days'],
    name: 'x_acllens.history.retention.days',
    type: 'integer',
    value: '90',
    description: 'Retention period in days for automatic history cleanup.',
    roles: { read: READERS, write: ADMIN },
})

Property({
    $id: Now.ID['prop-retention-action'],
    name: 'x_acllens.history.retention.action',
    type: 'choicelist',
    choices: ['delete', 'archive'],
    value: 'delete',
    description: 'What automatic cleanup does with expired runs: delete them, or archive them (hidden from History but kept).',
    roles: { read: READERS, write: ADMIN },
})

Property({
    $id: Now.ID['prop-ui-instance-theme'],
    name: 'x_acllens.ui.instance_theme',
    type: 'boolean',
    value: 'false',
    description: "Follow each user's own ServiceNow (Next Experience) theme, including dark appearance, instead of the fixed ACL Lens colours. Granted / Conditional / Denied colours stay the same.",
    roles: { read: READERS, write: ADMIN },
})

Property({
    $id: Now.ID['prop-mcp-enabled'],
    name: 'x_acllens.mcp.enabled',
    type: 'boolean',
    value: 'false',
    description: "Allow MCP clients (AI tools outside ServiceNow) to call the ACL Lens MCP endpoint. Off by default. Tools are read-only and run with the calling user's permissions.",
    roles: { read: READERS, write: ADMIN },
})

// ---- daily retention job (does nothing unless retention is enabled) --------
ScheduledScript({
    $id: Now.ID['job-history-retention'],
    name: 'ACL Lens - history retention',
    frequency: 'daily',
    executionTime: { hours: 2, minutes: 30, seconds: 0 },
    script: applyRetention,
})

// ---- AI provider form helpers ----------------------------------------------
UiPolicy({
    $id: Now.ID['ai-provider-type-fields'],
    table: 'x_acllens_ai_provider',
    shortDescription: 'Show only the fields used by the selected provider type',
    conditions: 'type=now_assist',
    onLoad: true,
    reverseIfFalse: true,
    global: true,
    actions: [
        { field: 'endpoint', visible: false },
        { field: 'api_key', visible: false },
        { field: 'model', visible: false },
        { field: 'max_tokens', visible: false },
        { field: 'allow_custom_endpoint', visible: false },
        { field: 'capability', visible: true },
        { field: 'skill_input', visible: true },
    ],
})

UiAction({
    $id: Now.ID['ai-provider-test'],
    table: 'x_acllens_ai_provider',
    name: 'Test connection',
    actionName: 'x_acllens_test_provider',
    hint: 'Sends a short test prompt to this provider and shows the result. Saves the form first.',
    showUpdate: true,
    form: { showButton: true, style: 'primary' },
    roles: ADMIN,
    order: 100,
    // String script (not a module import) so it can keep the admin on the form afterwards.
    // The require path contains package.json "version" - update it if the version changes.
    script: `const { testProviderAction } = require('x_acllens/acl-lens/0.0.1/src/server/ai/provider-test.ts');
testProviderAction(current);
action.setRedirectURL(current);`,
})
