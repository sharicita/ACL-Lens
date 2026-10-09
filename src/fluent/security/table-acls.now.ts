import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { lensAdmin, lensUser } from './roles.now'

// History records: users can read/create/update, only admins delete.
Acl({ $id: Now.ID['run-read'], type: 'record', table: 'x_acllens_run', operation: 'read', roles: [lensUser] })
Acl({ $id: Now.ID['run-field-read'], type: 'record', table: 'x_acllens_run', field: '*', operation: 'read', roles: [lensUser] })
Acl({ $id: Now.ID['run-create'], type: 'record', table: 'x_acllens_run', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['run-write'], type: 'record', table: 'x_acllens_run', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['run-field-write'], type: 'record', table: 'x_acllens_run', field: '*', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['run-delete'], type: 'record', table: 'x_acllens_run', operation: 'delete', roles: [lensAdmin] })

Acl({ $id: Now.ID['run-data-read'], type: 'record', table: 'x_acllens_run_data', operation: 'read', roles: [lensUser] })
Acl({ $id: Now.ID['run-data-field-read'], type: 'record', table: 'x_acllens_run_data', field: '*', operation: 'read', roles: [lensUser] })
Acl({ $id: Now.ID['run-data-create'], type: 'record', table: 'x_acllens_run_data', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['run-data-delete'], type: 'record', table: 'x_acllens_run_data', operation: 'delete', roles: [lensAdmin] })
