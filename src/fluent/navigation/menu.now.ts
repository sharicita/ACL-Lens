import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'
import { lensUser } from '../security/roles.now'

export const lensMenu = ApplicationMenu({
    $id: Now.ID['acl-lens-menu'],
    title: 'ACL Lens',
    hint: 'Visualize and compare user/role access',
    description: 'Analyze CRUD, record and field access for users and roles',
    roles: [lensUser],
    active: true,
})

Record({
    $id: Now.ID['acl-lens-module-workspace'],
    table: 'sys_app_module',
    data: {
        title: 'Access Workspace',
        application: lensMenu,
        link_type: 'DIRECT',
        query: 'x_acllens_lens.do',
        hint: 'Pick users/roles and see their access side by side',
        roles: ['x_acllens.user'],
        active: true,
        order: 100,
    },
})

Record({
    $id: Now.ID['acl-lens-module-history'],
    table: 'sys_app_module',
    data: {
        title: 'Run History',
        application: lensMenu,
        link_type: 'DIRECT',
        query: 'x_acllens_lens.do?view=history',
        hint: 'Open, export or rerun saved analyses',
        roles: ['x_acllens.user'],
        active: true,
        order: 200,
    },
})

Record({
    $id: Now.ID['acl-lens-module-run-records'],
    table: 'sys_app_module',
    data: {
        title: 'Run Records',
        application: lensMenu,
        link_type: 'LIST',
        name: 'x_acllens_run',
        hint: 'Platform list of run records (attachments include comparison CSVs)',
        roles: ['x_acllens.admin'],
        active: true,
        order: 300,
    },
})

// ---- Configuration (ACL Lens admins and admin only) ---------------------------
// Everything that configures the app lives under this separator.
const CONFIG_ROLES = ['x_acllens.admin', 'admin']

Record({
    $id: Now.ID['acl-lens-module-config-separator'],
    table: 'sys_app_module',
    data: {
        title: 'Configuration',
        application: lensMenu,
        link_type: 'SEPARATOR',
        hint: 'App configuration: MCP server, properties and AI providers (ACL Lens admins)',
        roles: CONFIG_ROLES,
        active: true,
        order: 1000,
    },
})

Record({
    $id: Now.ID['acl-lens-module-mcp'],
    table: 'sys_app_module',
    data: {
        title: 'MCP Server',
        application: lensMenu,
        link_type: 'DIRECT',
        query: 'x_acllens_lens.do?view=mcp',
        hint: 'Instructions and setup for connecting AI tools (MCP clients) to ACL Lens',
        roles: CONFIG_ROLES,
        active: true,
        order: 1200,
    },
})

Record({
    $id: Now.ID['acl-lens-module-properties'],
    table: 'sys_app_module',
    data: {
        title: 'Properties',
        application: lensMenu,
        link_type: 'DIRECT',
        query: 'x_acllens_lens.do?view=settings',
        hint: 'History, retention, appearance and MCP settings',
        roles: CONFIG_ROLES,
        active: true,
        order: 1100,
    },
})

Record({
    $id: Now.ID['acl-lens-module-ai-providers'],
    table: 'sys_app_module',
    data: {
        title: 'AI Providers',
        application: lensMenu,
        link_type: 'LIST',
        name: 'x_acllens_ai_provider',
        hint: 'Configure the Security Assistant AI connection (Now Assist is used automatically when available)',
        roles: CONFIG_ROLES,
        active: true,
        order: 1300,
    },
})
