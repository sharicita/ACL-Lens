import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { lensAdmin, lensUser } from './roles.now'

// History records: people see the runs they ran, and ACL Lens admins see all of them. The app's own
// pages apply the same rule in engine/storage.ts, because they read these tables with GlideRecord,
// which doesn't check ACLs. Only admins change or delete runs.
const OWN_RUN = 'answer = current.run_by == gs.getUserID() || gs.hasRole("x_acllens.admin");'
const OWN_RUN_DATA = 'answer = current.run.run_by == gs.getUserID() || gs.hasRole("x_acllens.admin");'
Acl({ $id: Now.ID['run-read'], type: 'record', table: 'x_acllens_run', operation: 'read', roles: [lensUser], script: OWN_RUN })
Acl({ $id: Now.ID['run-field-read'], type: 'record', table: 'x_acllens_run', field: '*', operation: 'read', roles: [lensUser], script: OWN_RUN })
Acl({ $id: Now.ID['run-create'], type: 'record', table: 'x_acllens_run', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['run-write'], type: 'record', table: 'x_acllens_run', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['run-field-write'], type: 'record', table: 'x_acllens_run', field: '*', operation: 'write', roles: [lensAdmin] })
Acl({ $id: Now.ID['run-delete'], type: 'record', table: 'x_acllens_run', operation: 'delete', roles: [lensAdmin] })

Acl({ $id: Now.ID['run-data-read'], type: 'record', table: 'x_acllens_run_data', operation: 'read', roles: [lensUser], script: OWN_RUN_DATA })
Acl({ $id: Now.ID['run-data-field-read'], type: 'record', table: 'x_acllens_run_data', field: '*', operation: 'read', roles: [lensUser], script: OWN_RUN_DATA })
Acl({ $id: Now.ID['run-data-create'], type: 'record', table: 'x_acllens_run_data', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['run-data-delete'], type: 'record', table: 'x_acllens_run_data', operation: 'delete', roles: [lensAdmin] })
