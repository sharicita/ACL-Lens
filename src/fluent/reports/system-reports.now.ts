import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// Reports shipped with ACL Lens: read-only ("Customize" saves a personal copy). options is JSON with
// ops, statuses, kinds, tables, tableText, roles, groupBy and limit. Measures: src/server/engine/report-measures.ts

Record({
    $id: Now.ID['report-access-glance'],
    table: 'x_acllens_report',
    data: {
        name: "Access at a glance",
        description: "Every create, read, write and delete result in the run, by outcome.",
        category: 'overview',
        measure: 'access',
        chart: 'donut',
        options: "{\"ops\":[\"create\",\"read\",\"write\",\"delete\"],\"groupBy\":\"status\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 10,
    },
})

Record({
    $id: Now.ID['report-access-by-subject'],
    table: 'x_acllens_report',
    data: {
        name: "Access by subject",
        description: "Granted, Conditional, Denied and No-rule results for each user, role or group (create, read, write, delete).",
        category: 'overview',
        measure: 'access',
        chart: 'bar',
        options: "{\"ops\":[\"create\",\"read\",\"write\",\"delete\"],\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 20,
    },
})

Record({
    $id: Now.ID['report-privileged'],
    table: 'x_acllens_report',
    data: {
        name: "Privileged roles",
        description: "Subjects holding admin, security_admin, user_admin, impersonator or other powerful roles.",
        category: 'high_risk',
        measure: 'privileged',
        chart: 'bar',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 30,
    },
})

Record({
    $id: Now.ID['report-high-risk-tables'],
    table: 'x_acllens_report',
    data: {
        name: "Changes allowed on high-risk tables",
        description: "Create, write or delete allowed on users, roles, groups, ACLs, properties, scripts, credentials and other sensitive tables.",
        category: 'high_risk',
        measure: 'high_risk_tables',
        chart: 'bar',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 40,
    },
})

Record({
    $id: Now.ID['report-open-acls'],
    table: 'x_acllens_report',
    data: {
        name: "Open ACLs that allow changes",
        description: "Create, write or delete granted by ACLs with no role, condition or script.",
        category: 'vulnerability',
        measure: 'open_acls',
        chart: 'bar',
        options: "{\"groupBy\":\"acl\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 45,
    },
})

Record({
    $id: Now.ID['report-machine-changes'],
    table: 'x_acllens_report',
    data: {
        name: "Machine accounts that can change data",
        description: "Machine identities, web-service-only and integration users allowed to create, write or delete.",
        category: 'high_risk',
        measure: 'machine_changes',
        chart: 'bar',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 50,
    },
})

Record({
    $id: Now.ID['report-no-rule'],
    table: 'x_acllens_report',
    data: {
        name: "Allowed with no rule",
        description: "Operations no ACL protects that the platform allows anyway.",
        category: 'vulnerability',
        measure: 'no_rule_allowed',
        chart: 'bar',
        options: "{\"groupBy\":\"operation\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 55,
    },
})

Record({
    $id: Now.ID['report-inactive'],
    table: 'x_acllens_report',
    data: {
        name: "Inactive accounts with access",
        description: "Inactive users whose roles still grant access.",
        category: 'high_risk',
        measure: 'inactive_access',
        chart: 'tile',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 60,
    },
})

Record({
    $id: Now.ID['report-scripted'],
    table: 'x_acllens_report',
    data: {
        name: "Access decided by scripts",
        description: "Results that depend on ACL scripts, which need a review or a live check.",
        category: 'vulnerability',
        measure: 'scripted',
        chart: 'bar',
        options: "{\"groupBy\":\"table\"}",
        system: true,
        shared: true,
        on_default: true,
        order: 65,
    },
})

Record({
    $id: Now.ID['report-differences'],
    table: 'x_acllens_report',
    data: {
        name: "Tables where subjects differ",
        description: "The tables with the most differences between the compared subjects.",
        category: 'comparison',
        measure: 'differences',
        chart: 'bar',
        options: "{\"groupBy\":\"table\",\"limit\":10}",
        system: true,
        shared: true,
        on_default: true,
        order: 70,
    },
})

Record({
    $id: Now.ID['report-unshared-roles'],
    table: 'x_acllens_report',
    data: {
        name: "Roles held by only some subjects",
        description: "Roles that explain most differences between the compared subjects.",
        category: 'comparison',
        measure: 'unshared_roles',
        chart: 'bar',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: false,
        order: 75,
    },
})

Record({
    $id: Now.ID['report-data-filters'],
    table: 'x_acllens_report',
    data: {
        name: "Security data filters",
        description: "Data filters on the analyzed tables: applied (rows hidden), not applied, or depending on a security attribute.",
        category: 'overview',
        measure: 'data_filters',
        chart: 'donut',
        options: "{\"groupBy\":\"status\"}",
        system: true,
        shared: true,
        on_default: false,
        order: 90,
    },
})

Record({
    $id: Now.ID['report-access-gained'],
    table: 'x_acllens_report',
    data: {
        name: "Access gained since the original run",
        description: "On a rerun: results that now give more access than before.",
        category: 'high_risk',
        measure: 'access_gained',
        chart: 'list',
        options: "{\"groupBy\":\"subject\"}",
        system: true,
        shared: true,
        on_default: false,
        order: 100,
    },
})
