#!/usr/bin/env node
// Manages install profiles without the guided setup.
//
//   npm run profile -- list
//   npm run profile -- add <name> --alias <sdk login alias> --scope x_<code>_acllens [--scope-id <sys_id>] [--instance https://…]
//   npm run profile -- default <name>
import fs from 'node:fs'
import { PROFILE_FILE, readProfiles, saveProfile } from './lib/profiles.mjs'

const [cmd, name, ...rest] = process.argv.slice(2)
const opt = (f) => {
    const i = rest.indexOf(f)
    return i >= 0 ? rest[i + 1] : undefined
}

try {
    if (cmd === 'add') {
        const data = saveProfile(
            name,
            { alias: opt('--alias'), scope: opt('--scope'), scopeId: opt('--scope-id'), instance: opt('--instance') },
            rest.includes('--default') || !readProfiles().default
        )
        console.log(`Saved profile "${name}" (default: ${data.default}).`)
        console.log('If the app is already installed on that instance, set --scope-id to its sys_app sys_id so it is updated in place.')
    } else if (cmd === 'default') {
        const data = readProfiles()
        if (!data.profiles[name]) throw new Error(`No profile named "${name}".`)
        data.default = name
        fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 4) + '\n')
        console.log(`Default profile is now "${name}".`)
    } else {
        const data = readProfiles()
        const names = Object.keys(data.profiles)
        if (!names.length) console.log('No profiles yet. Run "npm run setup" for the guided setup.')
        for (const n of names) {
            const p = data.profiles[n]
            console.log(`${n === data.default ? '*' : ' '} ${n}  scope=${p.scope}  login=${p.alias}  ${p.instance || ''}`)
        }
    }
} catch (e) {
    console.error(e.message)
    process.exit(1)
}
