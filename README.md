# OpenCode plugins pane

A TUI-only plugin showing plugin information in the OpenCode sidebar.

## Build

Use Node 26 and npm with the committed lockfile:

Maintainer verification supports Linux/macOS and requires `tar`. Windows
verification is not supported by the current test harness. Keep LF line
endings in `dist/tui.js`; the freshness check compares exact bytes.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run compile
npm test
npm run build:check
node --check dist/tui.js
npm pack --dry-run --json
```

Babel compiles `src/tui.tsx` to Solid universal JavaScript in `dist/tui.js`.
OpenCode, Solid and OpenTUI imports stay external; this is not a React build
and does not bundle a second renderer. TypeScript only checks source types.
If more source modules are added, extend the build to emit those modules too.

Commit `dist/tui.js` alongside source changes. The embedded installer disables
lifecycle scripts, but Git fetching can still attempt a nested npm install
when a package has `build`, `prepack`, `prepare`, install hooks or workspaces.
Use `compile` explicitly; do not add those preparation triggers. There is no
automatic packaging hook: run the checks above before `npm pack`. CI checks
committed output before compiling, a scripts-disabled tarball and actual signed
Git packages with an unavailable npm CLI sentinel. The latter proves the
package can be extracted without launching dependency preparation; it does not
execute OpenCode or certify host rendering or runtime security.

Git regression tests use pinned development-only `pacote` and Arborist APIs.
The small signed fixture bundle is documented in `test/fixtures/README.md`.

Configure this TUI-only package in global `cli.json`, using a tested full Git
revision for reproducibility. It exports `./tui` as `./dist/tui.js`.

The packaging checks do not execute the plugin in OpenCode. Validate sidebar
rendering, mouse expansion, refresh and reload cleanup in the target host
before releasing. Existing broad peer ranges and `any` source types do not
guarantee compatibility with every future host version.

## Dependency security boundary

The root `seroval: 1.6.8` override patches this repository's development/CI
installation. npm ignores dependency-package overrides: it does **not** patch
downstream installations or externally supplied OpenCode host runtimes.
Consumer/host owners must patch their own root resolution or upgrade to a
tested compatible host/OpenTUI release. A clean repository audit is not a
claim that the consumer or host runtime is safe.

Run `npm run test:coverage` for coverage of the new build script only; the
existing UI is not covered by that metric.
