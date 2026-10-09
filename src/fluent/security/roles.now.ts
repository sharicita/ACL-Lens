import '@servicenow/sdk/global'
import { Role } from '@servicenow/sdk/core'

export const lensUser = Role({
    name: 'x_acllens.user',
    description: 'Can use ACL Lens to analyze, compare and rerun user/role security access',
})

export const lensAdmin = Role({
    name: 'x_acllens.admin',
    description: 'ACL Lens administrator - can also delete analysis history',
    containsRoles: [lensUser],
})
