import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { lensAdmin, lensUser } from './roles.now'

// Reports: everyone sees shipped and shared reports plus their own; people change only their own
// (ACL Lens admins can manage any, including sharing). Shipped reports are never edited in place.
const SEE_REPORT = 'answer = current.system == true || current.shared == true || current.owner == gs.getUserID() || gs.hasRole("x_acllens.admin");'
const OWN_REPORT = 'answer = current.system != true && (current.owner == gs.getUserID() || gs.hasRole("x_acllens.admin"));'
Acl({ $id: Now.ID['report-read'], type: 'record', table: 'x_acllens_report', operation: 'read', roles: [lensUser], script: SEE_REPORT })
Acl({ $id: Now.ID['report-field-read'], type: 'record', table: 'x_acllens_report', field: '*', operation: 'read', roles: [lensUser], script: SEE_REPORT })
Acl({ $id: Now.ID['report-create'], type: 'record', table: 'x_acllens_report', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['report-write'], type: 'record', table: 'x_acllens_report', operation: 'write', roles: [lensUser], script: OWN_REPORT })
Acl({ $id: Now.ID['report-field-write'], type: 'record', table: 'x_acllens_report', field: '*', operation: 'write', roles: [lensUser], script: OWN_REPORT })
Acl({ $id: Now.ID['report-delete'], type: 'record', table: 'x_acllens_report', operation: 'delete', roles: [lensUser], script: OWN_REPORT })
Acl({ $id: Now.ID['report-shared-write'], type: 'record', table: 'x_acllens_report', field: 'shared', operation: 'write', roles: [lensAdmin] })

// Dashboards: each user only their own layout.
const OWN_DASHBOARD = 'answer = current.owner == gs.getUserID();'
Acl({ $id: Now.ID['dashboard-read'], type: 'record', table: 'x_acllens_dashboard', operation: 'read', roles: [lensUser], script: OWN_DASHBOARD })
Acl({ $id: Now.ID['dashboard-field-read'], type: 'record', table: 'x_acllens_dashboard', field: '*', operation: 'read', roles: [lensUser], script: OWN_DASHBOARD })
Acl({ $id: Now.ID['dashboard-create'], type: 'record', table: 'x_acllens_dashboard', operation: 'create', roles: [lensUser] })
Acl({ $id: Now.ID['dashboard-write'], type: 'record', table: 'x_acllens_dashboard', operation: 'write', roles: [lensUser], script: OWN_DASHBOARD })
Acl({ $id: Now.ID['dashboard-field-write'], type: 'record', table: 'x_acllens_dashboard', field: '*', operation: 'write', roles: [lensUser], script: OWN_DASHBOARD })
Acl({ $id: Now.ID['dashboard-delete'], type: 'record', table: 'x_acllens_dashboard', operation: 'delete', roles: [lensUser], script: OWN_DASHBOARD })
