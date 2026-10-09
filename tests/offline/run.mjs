// Compiles the server modules needed by the offline tests to .test-build (CommonJS) and runs them.
// Type errors about @servicenow/glide sub-path resolution are expected and ignored: the tests
// replace every Glide API with fakes.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const out = path.join(root, '.test-build')
const sources = ['engine/evaluator.ts', 'engine/compare.ts', 'engine/types.ts', 'ai/agent.ts', 'ai/guidance.ts', 'ai/provider-safety.ts', 'ai/evaluation-view.ts'].map((f) =>
    path.join(root, 'src', 'server', f)
)
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
spawnSync(process.execPath, [tsc, ...sources, '--outDir', out, '--rootDir', path.join(root, 'src', 'server'), '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck', '--noEmitOnError', 'false'], {
    stdio: 'ignore',
})

let failed = false
for (const t of ['engine.test.js', 'agent.test.js', 'safety.test.js']) {
    const r = spawnSync(process.execPath, [path.join(root, 'tests', 'offline', t)], { stdio: 'inherit' })
    if (r.status !== 0) failed = true
}
process.exit(failed ? 1 : 0)
