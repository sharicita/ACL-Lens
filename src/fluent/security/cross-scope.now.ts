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

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_data_filter'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_data_filter',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

// Tables behind the API access gate (REST API access policies, auth scopes, Scripted REST ACLs).
// sys_db_object.ws_access is already covered by the sys_db_object privilege above.
CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_security_machine_identity_access_control'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_security_machine_identity_access_control',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_api_access_policy'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_api_access_policy',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_auth_profile_mapping'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_auth_profile_mapping',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-inbound_auth_profile'],
    status: 'allowed',
    operation: 'read',
    targetName: 'inbound_auth_profile',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-std_http_auth'],
    status: 'allowed',
    operation: 'read',
    targetName: 'std_http_auth',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-http_key_auth'],
    status: 'allowed',
    operation: 'read',
    targetName: 'http_key_auth',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-http_body_auth'],
    status: 'allowed',
    operation: 'read',
    targetName: 'http_body_auth',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_api_access_scope'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_api_access_scope',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_auth_scope'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_auth_scope',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-oauth_entity_auth_scope_mapping'],
    status: 'allowed',
    operation: 'read',
    targetName: 'oauth_entity_auth_scope_mapping',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-oauth_entity'],
    status: 'allowed',
    operation: 'read',
    targetName: 'oauth_entity',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_ws_definition'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ws_definition',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_ws_operation'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ws_operation',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_ws_version'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ws_version',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_group_has_role'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_group_has_role',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
