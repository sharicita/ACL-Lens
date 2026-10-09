import '@servicenow/sdk/global'
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Read-only access to the platform security/schema tables the analysis engine inspects.

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_acl'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_acl',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_acl_role'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_acl_role',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_operation'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_operation',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_attribute'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_attribute',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_user'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_user',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_user_role'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_user_role',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_user_has_role'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_user_has_role',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_user_role_contains'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_user_role_contains',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_user_group'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_user_group',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_db_object'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_db_object',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_dictionary'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_dictionary',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_scope'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_scope',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
