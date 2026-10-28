import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createSignal, createResource, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"

interface TreeNode {
  segment: string
  plugins: any[]
  children: Map<string, TreeNode>
}

function buildTree(list: any[]): Map<string, TreeNode> {
  const root: TreeNode = { segment: "", plugins: [], children: new Map() }
  for (const p of list) {
    const id = p?.id ?? "unknown"
    const parts = String(id).split(".")
    let node = root
    for (const seg of parts) {
      if (!node.children.has(seg)) {
        node.children.set(seg, { segment: seg, plugins: [], children: new Map() })
      }
      node = node.children.get(seg)!
    }
    node.plugins.push(p)
  }
  return root.children
}

function countPlugins(node: TreeNode): number {
  let n = node.plugins.length
  for (const c of node.children.values()) n += countPlugins(c)
  return n
}

function stop(e: any) {
  try { e?.stopPropagation?.() } catch {}
}

function PluginItem(props: { plugin: any }) {
  const context = usePlugin()
  const [open, setOpen] = createSignal(false)
  const p = props.plugin
  const name = p.id ?? p.source?.target ?? p.source?.path ?? "plugin"
  const status = p.state?.status ?? "unknown"
  const features = p.features
    ? Object.entries(p.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ")
    : ""
  const source =
    p.source?.type === "package"
      ? `${p.source.target}${p.source.version ? "@" + p.source.version : ""}`
      : p.source?.type === "local"
      ? p.source.path
      : p.source?.type ?? "unknown"

  return (
    <box onClick={(e: any) => { stop(e); setOpen(!open()) }} onMouseDown={(e: any) => { stop(e); setOpen(!open()) }}>
      <box flexDirection="column">
        <text fg={context.theme.text.base}>{(open() ? "▼ " : "▸ ") + name + "  " + status}</text>
        <Show when={open()}>
          <box flexDirection="column" paddingLeft={2}>
            <text fg={context.theme.text.muted}>{`id: ${p.id ?? "(none)"}`}</text>
            <text fg={context.theme.text.muted}>{`source: ${source}`}</text>
            <Show when={features}>
              <text fg={context.theme.text.muted}>{`features: ${features}`}</text>
            </Show>
            <Show when={p.state?.status === "failed" && p.state?.error}>
              <text fg={context.theme.text.error}>{`error: ${p.state.error}`}</text>
            </Show>
          </box>
        </Show>
      </box>
    </box>
  )
}

function NodeView(props: { node: TreeNode }) {
  const context = usePlugin()
  const [open, setOpen] = createSignal(false)
  const node = props.node
  const children = () => Array.from(node.children.values()).sort((a, b) => a.segment.localeCompare(b.segment))
  const total = countPlugins(node)

  return (
    <box onClick={(e: any) => { stop(e); setOpen(!open()) }} onMouseDown={(e: any) => { stop(e); setOpen(!open()) }}>
      <box flexDirection="column">
        <text fg={context.theme.text.base}>{(open() ? "▼ " : "▸ ") + node.segment + (total ? ` (${total})` : "")}</text>
        <Show when={open()}>
          <box flexDirection="column" paddingLeft={1}>
            <For each={node.plugins}>
              {(p: any) => <PluginItem plugin={p} />}
            </For>
            <For each={children()}>
              {(child: TreeNode) => <NodeView node={child} />}
            </For>
          </box>
        </Show>
      </box>
    </box>
  )
}

export default Plugin.define({
  id: "plugins.pane",
  async setup(context: any) {
    const [tick, setTick] = createSignal(0)
    const [pluginsOpen, setPluginsOpen] = createSignal(false)
    const [serverOpen, setServerOpen] = createSignal(false)
    const [tuiOpen, setTuiOpen] = createSignal(false)

    const [serverTree] = createResource(tick, async () => {
      const location = context.location ?? context.data.location.default()
      try {
        const res = await context.client.plugin.list({ location })
        const list = (res && (res.data ?? res)) || []
        return buildTree(Array.isArray(list) ? list : [])
      } catch {
        return new Map()
      }
    })

    const [tuiTree] = createResource(tick, async () => {
      const list: any[] = []
      try {
        const fsMod: any = await import("node:fs")
        const home = (globalThis as any)?.process?.env?.HOME || "/home/craig"
        const text = fsMod.readFileSync(`${home}/.config/opencode/cli.json`, "utf8")
        const parsed = JSON.parse(text)
        const cliPlugins = Array.isArray(parsed?.plugins) ? parsed.plugins : []
        for (const entry of cliPlugins) {
          const spec = typeof entry === "string" ? entry : entry?.package
          if (!spec) continue
          const id = String(spec).split("/").pop()?.replace(/^opencode-/, "opencode.") || String(spec)
          list.push({
            id,
            source: { type: "package", target: spec },
            features: { tui: true },
            state: { status: "active" },
          })
        }
      } catch {}
      return buildTree(list)
    })

    context.ui.slot({
      append: "sidebar.content",
      render: () => {
        const ctx = usePlugin()
        return (
          <box flexDirection="column" marginTop={1}>
            <box onClick={(e: any) => { stop(e); setPluginsOpen(!pluginsOpen()) }} onMouseDown={(e: any) => { stop(e); setPluginsOpen(!pluginsOpen()) }}>
              <text fg={ctx.theme.text.base} attributes={TextAttributes.BOLD}>{(pluginsOpen() ? "▼ " : "▶ ") + "Plugins"}</text>
            </box>
            <Show when={pluginsOpen()}>
              <box flexDirection="column" paddingLeft={1}>
                <box onClick={(e: any) => { stop(e); setServerOpen(!serverOpen()) }} onMouseDown={(e: any) => { stop(e); setServerOpen(!serverOpen()) }}>
                  <text fg={ctx.theme.text.base}>{(serverOpen() ? "▾ " : "▸ ") + "Server"}</text>
                </box>
                <Show when={serverOpen()}>
                  <box flexDirection="column" paddingLeft={1}>
                    <Show when={serverTree.loading}>
                      <text fg={ctx.theme.text.muted}>Loading…</text>
                    </Show>
                    <For each={Array.from((serverTree() ?? new Map()).values())}>
                      {(node: TreeNode) => <NodeView node={node} />}
                    </For>
                  </box>
                </Show>

                <box onClick={(e: any) => { stop(e); setTuiOpen(!tuiOpen()) }} onMouseDown={(e: any) => { stop(e); setTuiOpen(!tuiOpen()) }}>
                  <text fg={ctx.theme.text.base}>{(tuiOpen() ? "▾ " : "▸ ") + "TUI"}</text>
                </box>
                <Show when={tuiOpen()}>
                  <box flexDirection="column" paddingLeft={1}>
                    <Show when={tuiTree.loading}>
                      <text fg={ctx.theme.text.muted}>Loading…</text>
                    </Show>
                    <For each={Array.from((tuiTree() ?? new Map()).values())}>
                      {(node: TreeNode) => <NodeView node={node} />}
                    </For>
                  </box>
                </Show>
              </box>
            </Show>
          </box>
        )
      },
    })

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "plugins.pane.refresh",
          title: "Refresh plugins pane",
          group: "Plugins",
          palette: true,
          run: () => setTick((n: number) => n + 1),
        },
      ],
    }))

    return () => {}
  },
})