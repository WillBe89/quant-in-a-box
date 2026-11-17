// better-sqlite3 is a native (non-N-API) module: its compiled binary only loads under the exact
// Node ABI it was built for. electron-builder's postinstall step rebuilds it for Electron's ABI,
// but vitest runs under the host's plain Node, whose ABI differs. Rebuilding for host Node before
// tests and back to Electron's ABI afterward keeps `npm run dev`/`build` working regardless of the
// test outcome — a plain npm `pretest`/`posttest` pair would skip the rebuild-back step whenever
// tests fail, silently leaving the repo unable to launch Electron until someone reruns `npm install`.
const { spawnSync } = require('child_process')

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, env })
  return result.status ?? 1
}

// npm 12 refuses `npm rebuild <pkg>` (EALLOWSCRIPTS) when a user-level `allow-scripts` list in
// ~/.npmrc coexists with this package.json's own `allowScripts` field. Clearing the user-level
// setting for this one command lets the package.json field govern, as it does for `npm ci`.
const rebuildExitCode = run('npm', ['rebuild', 'better-sqlite3'], { ...process.env, npm_config_allow_scripts: '' })
const testExitCode = rebuildExitCode === 0 ? run('npx', ['vitest', 'run']) : rebuildExitCode
if (rebuildExitCode !== 0) console.error('better-sqlite3 rebuild for host Node failed; tests not run.')
run('npm', ['run', 'postinstall'])
process.exit(testExitCode)
