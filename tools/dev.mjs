#!/usr/bin/env node
// Local UI dev server for an install profile: "npm run dev" (or "npm run dev -- --profile <name>").
//
// Runs "now-sdk run dev" in the profile's .deploy/ copy, so API calls use the real scope on the
// instance, and mirrors every change under src/ into that copy while it runs.
// The SDK dev server takes port 3000, or the first free port from 8081 when 3000 is busy.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, getProfile } from './lib/profiles.mjs'
import { prepareWorkspace, runSdk, syncFile } from './lib/workspace.mjs'

function embedCss(ws) {
    const dir = path.join(ws, 'src', 'client')
    const css = fs.readFileSync(path.join(dir, 'app.css'), 'utf8')
    fs.writeFileSync(path.join(dir, 'styles.generated.ts'), `// Generated from app.css by now.prebuild.mjs - edit app.css instead.
export const APP_CSS = ${JSON.stringify(css)}
`)
}

const args = process.argv.slice(2)
const i = args.indexOf('--profile')

try {
    // a separate copy from deploy's, so deploying while the dev server runs doesn't disturb it
    const base = getProfile(i >= 0 ? args[i + 1] : undefined)
    const profile = { ...base, name: `${base.name}.dev` }
    const ws = prepareWorkspace(profile)
    embedCss(ws)
    console.log(`Dev server for ${profile.scope} (profile "${base.name}"). Edits under src/ are mirrored automatically.`)
    fs.watch(path.join(ROOT, 'src'), { recursive: true }, (_event, file) => {
        if (!file) return
        try {
            syncFile(profile, path.join('src', file.toString()))
            // the build's prebuild embeds app.css in the bundle; the dev watcher doesn't run it
            if (path.basename(file.toString()) === 'app.css') embedCss(ws)
        } catch (e) {
            console.error(`Could not mirror ${file}: ${e.message}`)
        }
    })
    await runSdk(['run', 'dev', '--auth', profile.alias], ws, (line, isError) => (isError ? console.error(line) : console.log(line)))
} catch (e) {
    console.error(`\n${e.message}`)
    process.exit(1)
}
