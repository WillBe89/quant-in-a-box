// better-sqlite3 is a native (non-N-API) module: its compiled binary only loads under the exact
// Node ABI it was built for. electron-builder's postinstall step rebuilds it for Electron's ABI,
// but vitest runs under the host's plain Node, whose ABI differs. Rebuilding for host Node before
// tests and back to Electron's ABI afterward keeps `npm run dev`/`build` working regardless of the
// test outcome — a plain npm `pretest`/`posttest` pair would skip the rebuild-back step whenever
// tests fail, silently leaving the repo unable to launch Electron until someone reruns `npm install`.
const { spawnSync } = require('child_process')

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true })
  return result.status ?? 1
}

run('npm', ['rebuild', 'better-sqlite3'])
const testExitCode = run('npx', ['vitest', 'run'])
run('npm', ['run', 'postinstall'])
process.exit(testExitCode)
