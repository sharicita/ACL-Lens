import '@servicenow/sdk/global'
import { Acl, CrossScopePrivilege } from '@servicenow/sdk/core'
import { lensAdmin, lensUser } from './roles.now'

// Providers hold API keys: ACL Lens admins only, every operation.
Acl({ $id: Now.ID['ai-provider-read'], type: 'record', table: 'x_acllens_ai_provider', operation: 'read', roles: [lensAdmin] })
Acl({ $id: Now.ID['ai-provider-field-read'], type: 'record', table: 'x_acllens_ai_provider', field: '*', operation: 'read', roles: [lensAdmin] })
Acl({ $id: Now.ID['ai-provider-write'], type: 'record', table: 'x_acllens_ai_provider', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['ai-provider-field-write'], type: 'record', table: 'x_acllens_ai_provider', field: '*', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['ai-provider-create'], type: 'record', table: 'x_acllens_ai_provider', operation: 'create', roles: [lensAdmin] })
Acl({ $id: Now.ID['ai-provider-delete'], type: 'record', table: 'x_acllens_ai_provider', operation: 'delete', roles: [lensAdmin] })

// Conversations: each user only sees their own.
const OWN_CONVERSATION = 'answer = current.user == gs.getUserID();'
const OWN_MESSAGE = 'answer = current.conversation.user == gs.getUserID();'
Acl({ $id: Now.ID['ai-conv-read'], type: 'record', table: 'x_acllens_ai_conversation', operation: 'read', roles: [lensUser], script: OWN_CONVERSATION })
Acl({ $id: Now.ID['ai-conv-field-read'], type: 'record', table: 'x_acllens_ai_conversation', field: '*', operation: 'read', roles: [lensUser], script: OWN_CONVERSATION })
Acl({ $id: Now.ID['ai-conv-delete'], type: 'record', table: 'x_acllens_ai_conversation', operation: 'delete', roles: [lensUser], script: OWN_CONVERSATION })
Acl({ $id: Now.ID['ai-msg-read'], type: 'record', table: 'x_acllens_ai_message', operation: 'read', roles: [lensUser], script: OWN_MESSAGE })
Acl({ $id: Now.ID['ai-msg-field-read'], type: 'record', table: 'x_acllens_ai_message', field: '*', operation: 'read', roles: [lensUser], script: OWN_MESSAGE })

// Now Assist gateway (only used when the instance has it).
CrossScopePrivilege({
    $id: Now.ID['xscope-exec-oneextend'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'OneExtendUtil',
    targetScope: 'sn_one_extend',
    targetType: 'scriptable',
})
CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys_one_extend_capability'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_one_extend_capability',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
