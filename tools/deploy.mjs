#!/usr/bin/env node
// Builds ACL Lens with an install profile's scope and installs it on that profile's instance.
//
//   npm run deploy                      default profile: build + install
//   npm run deploy -- --profile pdi2    a named profile
//   npm run deploy -- --build-only      build only (checks the profile build compiles)
//   npm run deploy -- --pack            build + create an installable package (no install)
import { getProfile } from './lib/profiles.mjs'
import { buildProfile } from './lib/workspace.mjs'

const args = process.argv.slice(2)
const flag = (f) => args.includes(f)
const value = (f) => {
    const i = args.indexOf(f)
    return i >= 0 ? args[i + 1] : undefined
}

try {
    const profile = getProfile(value('--profile'))
    const pack = flag('--pack')
    await buildProfile(profile, { install: !flag('--build-only') && !pack, pack })
    console.log('Done.')
} catch (e) {
    console.error(`\n${e.message}`)
    process.exit(1)
}
