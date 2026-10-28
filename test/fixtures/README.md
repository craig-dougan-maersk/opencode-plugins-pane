# Signed Git preparation fixtures

`git-preparation.bundle` contains two small, signed commits with only
`package.json` and canonical `dist/tui.js`. It is a binary Git bundle, not an
executable. Do not print its raw contents.

- `baseline` retains the merged package's preparation triggers.
- `corrected` matches the current manifest and compiled output exactly.

The real pacote Git fetcher clones these commits with fresh caches and
`ignoreScripts: true`. An unavailable npm CLI makes attempted nested dependency
preparation fail. Baseline must fail; corrected must extract successfully.
Tests verify signed-object presence and candidate equality; they do not claim
cryptographic verification in CI, where the maintainer key is not installed.
Both signatures were cryptographically verified locally when generated.

To regenerate after intentional manifest/output changes, create a temporary
Git repository outside the project. Write the baseline manifest from merged
revision `b47cb6a15b48ea29b588b25c7b31b144c5de5dbc` plus the current unchanged
compiled output; explicitly add those two files, `git commit -S` and tag
`baseline`. Replace the manifest/output with the current candidate, explicitly
add the files, `git commit -S` and tag `corrected`. Run `git verify-commit` on
both tags, then `git bundle create <project>/test/fixtures/git-preparation.bundle
baseline corrected`. Never disable signing or create unsigned fixture commits
in CI. Tests make no commits and require no secret signing material.

The regression pins pacote 21.5.1 deliberately: this version reproduces the
preparation behavior observed in the installed executable. Pacote 22.0.1
already honors `ignoreScripts` at this boundary and would mask the regression.
Arborist 9.9.1 supplies the real package tree for packing. Both dependencies are
development-only; do not upgrade the behavioral probe without retaining a
failing baseline for the affected installer path.

The fixture intentionally omits source/build tooling: neither install test
needs or executes them. Existing AST, freshness and package tests separately
verify canonical output and external runtime imports. Runtime dependencies are
not installed by this extraction-only regression, so it is not a full host
integration test. Temporary directories and caches are removed after each run.
