import React from 'react'

const enc = encodeURIComponent

/** Platform URLs for the records ACL Lens talks about. Opened in a new window. */
export const recordUrl = {
    user: (sysId: string) => `/sys_user.do?sys_id=${enc(sysId)}`,
    role: (sysId: string) => `/sys_user_role.do?sys_id=${enc(sysId)}`,
    group: (sysId: string) => `/sys_user_group.do?sys_id=${enc(sysId)}`,
    roleByName: (name: string) => `/sys_user_role.do?sysparm_query=${enc(`name=${name}`)}`,
    groupByName: (name: string) => `/sys_user_group.do?sysparm_query=${enc(`name=${name}`)}`,
    table: (name: string) => `/sys_db_object.do?sysparm_query=${enc(`name=${name}`)}`,
    tableRecords: (name: string) => `/${enc(name)}_list.do`,
    field: (table: string, field: string) => `/sys_dictionary.do?sysparm_query=${enc(`name=${table}^element=${field}`)}`,
    acl: (sysId: string) => `/sys_security_acl.do?sys_id=${enc(sysId)}`,
}

interface Props {
    href: string
    /** what the link opens, e.g. "user record for Beth Anglin" */
    what: string
    children?: React.ReactNode
}

/**
 * A small "open record" icon (or the given content) that opens a ServiceNow record in a new
 * window. The user's own permissions apply when the record opens.
 */
export default function RecordLink({ href, what, children }: Props) {
    const label = `Open the ${what} (new window)`
    return (
        <a className={children ? 'lens-link lens-reclink--text' : 'lens-reclink'} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} data-tip={label}>
            {children || (
                <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                        fill="currentColor"
                        d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H6v11h11v-5h2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
                    />
                </svg>
            )}
        </a>
    )
}
