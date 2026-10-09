import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import lensPage from '../../client/index.html'

export const aclLensPage = UiPage({
    $id: Now.ID['acl-lens-page'],
    endpoint: 'x_acllens_lens.do',
    description: 'ACL Lens - visualize and compare CRUD/field access for users and roles',
    category: 'general',
    html: lensPage,
    direct: true,
})
