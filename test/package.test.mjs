import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseSync } from "@babel/core";
import test from "node:test";

test("the Git package exports committed JavaScript, not TSX", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(manifest.exports["./tui"], "./dist/tui.js");
  assert.ok((await readFile("dist/tui.js", "utf8")).length > 0);
});

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

function validateJavaScript(code) {
  // Parsing with no JSX/TypeScript syntax plugins rejects either in the output.
  const ast = parseSync(code, { babelrc: false, configFile: false });
  const imports = new Set();
  walk(ast, (node) => {
    assert.ok(!node.type?.startsWith("JSX") && !node.type?.startsWith("TS"));
    if (node.type === "ImportDeclaration") imports.add(node.source.value);
    if (node.type === "StringLiteral") {
      assert.ok(
        !/^react(?:-dom)?(?:\/|$)/.test(node.value),
        "React import found",
      );
    }
    if (node.type === "Identifier") assert.notEqual(node.name, "React");
  });
  for (const name of [
    "@opencode/plugin/tui",
    "solid-js",
    "@opentui/core",
    "@opentui/solid",
  ]) {
    assert.ok(imports.has(name), `Missing external host runtime: ${name}`);
  }
}

test("compiled output uses external host runtimes, with no React, JSX or TS", async () => {
  validateJavaScript(await readFile("dist/tui.js", "utf8"));
});

test("output validation rejects React JSX transforms and raw TSX", () => {
  assert.throws(() => validateJavaScript('import React from "react";'));
  assert.throws(() =>
    validateJavaScript('import { jsx } from "react/jsx-runtime";'),
  );
  assert.throws(() => validateJavaScript("const panel = <box />;"));
  assert.throws(() => validateJavaScript("const count: number = 0;"));
});

test("committed output matches the current source and compiler settings", () => {
  execFileSync(process.execPath, ["scripts/build.mjs", "--check"], {
    stdio: "pipe",
  });
});

test("root install resolves the reviewed patched Seroval version", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  const installed = JSON.parse(
    await readFile("node_modules/seroval/package.json", "utf8"),
  );
  assert.equal(manifest.overrides.seroval, "1.6.8");
  const resolutions = Object.entries(lock.packages).filter(([path]) =>
    path.endsWith("node_modules/seroval"),
  );
  assert.equal(resolutions.length, 1);
  assert.equal(resolutions[0][1].version, "1.6.8");
  assert.equal(installed.version, "1.6.8");
});

test("build writes output and rejects stale, missing and invalid source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plugins-pane-build-"));
  const script = fileURLToPath(
    new URL("../scripts/build.mjs", import.meta.url),
  );
  const run = (...args) =>
    execFileSync(process.execPath, [script, ...args], {
      cwd: directory,
      stdio: "pipe",
    });
  try {
    assert.throws(() => run()); // Missing source must fail, not produce empty dist.
    await mkdir(join(directory, "src"));
    await writeFile(
      join(directory, "src/tui.tsx"),
      await readFile("src/tui.tsx"),
    );
    run();
    validateJavaScript(await readFile(join(directory, "dist/tui.js"), "utf8"));
    run("--check");
    await writeFile(join(directory, "dist/tui.js"), "// stale\n");
    assert.throws(() => run("--check"), /stale; run npm run compile/);
    assert.equal(
      await readFile(join(directory, "dist/tui.js"), "utf8"),
      "// stale\n",
    );
    await rm(join(directory, "dist/tui.js"));
    assert.throws(() => run("--check"));
    await writeFile(join(directory, "src/tui.tsx"), "const invalid = <");
    assert.throws(() => run());
    await writeFile(join(directory, "src/tui.tsx"), "");
    assert.throws(() => run(), /Babel produced no output/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("source preserves five mouse-down handlers without invalid onClick props", async () => {
  const source = await readFile("src/tui.tsx", "utf8");
  const ast = parseSync(source, {
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["typescript", "jsx"] },
  });
  const attributes = [];
  walk(ast, (node) => {
    if (node.type === "JSXAttribute") attributes.push(node.name.name);
  });
  assert.equal(attributes.filter((name) => name === "onMouseDown").length, 5);
  assert.ok(!attributes.includes("onClick"));
});

test("scripts-disabled package includes a compiled export without build dependencies", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plugins-pane-package-"));
  try {
    const packed = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    )[0];
    assert.deepEqual(packed.files.map((file) => file.path).sort(), [
      "README.md",
      "dist/tui.js",
      "package.json",
    ]);
    const archive = join(directory, packed.filename);
    const extract = (path) =>
      execFileSync("tar", ["-xOf", archive, `package/${path}`], {
        encoding: "utf8",
      });
    const manifest = JSON.parse(extract("package.json"));
    assert.equal(manifest.exports["./tui"], "./dist/tui.js");
    validateJavaScript(extract("dist/tui.js"));
    await writeFile(join(directory, "tui.mjs"), extract("dist/tui.js"));
    execFileSync(process.execPath, ["--check", join(directory, "tui.mjs")], {
      stdio: "pipe",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
