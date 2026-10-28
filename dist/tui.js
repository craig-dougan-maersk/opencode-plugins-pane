import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { Plugin, usePlugin } from "@opencode/plugin/tui";
import { createSignal, createResource, For, Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
function buildTree(list) {
  const root = {
    segment: "",
    plugins: [],
    children: new Map()
  };
  for (const p of list) {
    const id = p?.id ?? "unknown";
    const parts = String(id).split(".");
    let node = root;
    for (const seg of parts) {
      if (!node.children.has(seg)) {
        node.children.set(seg, {
          segment: seg,
          plugins: [],
          children: new Map()
        });
      }
      node = node.children.get(seg);
    }
    node.plugins.push(p);
  }
  return root.children;
}
function countPlugins(node) {
  let n = node.plugins.length;
  for (const c of node.children.values()) n += countPlugins(c);
  return n;
}
function stop(e) {
  try {
    e?.stopPropagation?.();
  } catch {}
}
function PluginItem(props) {
  const context = usePlugin();
  const [open, setOpen] = createSignal(false);
  const p = props.plugin;
  const name = p.id ?? p.source?.target ?? p.source?.path ?? "plugin";
  const status = p.state?.status ?? "unknown";
  const features = p.features ? Object.entries(p.features).filter(([, v]) => v).map(([k]) => k).join(", ") : "";
  const source = p.source?.type === "package" ? `${p.source.target}${p.source.version ? "@" + p.source.version : ""}` : p.source?.type === "local" ? p.source.path : p.source?.type ?? "unknown";
  return (() => {
    var _el$ = _$createElement("box"),
      _el$2 = _$createElement("box"),
      _el$3 = _$createElement("text");
    _$insertNode(_el$, _el$2);
    _$setProp(_el$, "onMouseDown", e => {
      stop(e);
      setOpen(!open());
    });
    _$insertNode(_el$2, _el$3);
    _$setProp(_el$2, "flexDirection", "column");
    _$insert(_el$3, () => (open() ? "▼ " : "▸ ") + name + "  " + status);
    _$insert(_el$2, _$createComponent(Show, {
      get when() {
        return open();
      },
      get children() {
        var _el$4 = _$createElement("box"),
          _el$5 = _$createElement("text"),
          _el$6 = _$createElement("text");
        _$insertNode(_el$4, _el$5);
        _$insertNode(_el$4, _el$6);
        _$setProp(_el$4, "flexDirection", "column");
        _$setProp(_el$4, "paddingLeft", 2);
        _$insert(_el$5, () => `id: ${p.id ?? "(none)"}`);
        _$insert(_el$6, `source: ${source}`);
        _$insert(_el$4, _$createComponent(Show, {
          when: features,
          get children() {
            var _el$7 = _$createElement("text");
            _$insert(_el$7, `features: ${features}`);
            _$effect(_$p => _$setProp(_el$7, "fg", context.theme.text.muted, _$p));
            return _el$7;
          }
        }), null);
        _$insert(_el$4, _$createComponent(Show, {
          get when() {
            return _$memo(() => p.state?.status === "failed")() && p.state?.error;
          },
          get children() {
            var _el$8 = _$createElement("text");
            _$insert(_el$8, () => `error: ${p.state.error}`);
            _$effect(_$p => _$setProp(_el$8, "fg", context.theme.text.error, _$p));
            return _el$8;
          }
        }), null);
        _$effect(_p$ => {
          var _v$ = context.theme.text.muted,
            _v$2 = context.theme.text.muted;
          _v$ !== _p$.e && (_p$.e = _$setProp(_el$5, "fg", _v$, _p$.e));
          _v$2 !== _p$.t && (_p$.t = _$setProp(_el$6, "fg", _v$2, _p$.t));
          return _p$;
        }, {
          e: undefined,
          t: undefined
        });
        return _el$4;
      }
    }), null);
    _$effect(_$p => _$setProp(_el$3, "fg", context.theme.text.base, _$p));
    return _el$;
  })();
}
function NodeView(props) {
  const context = usePlugin();
  const [open, setOpen] = createSignal(false);
  const node = props.node;
  const children = () => Array.from(node.children.values()).sort((a, b) => a.segment.localeCompare(b.segment));
  const total = countPlugins(node);
  return (() => {
    var _el$9 = _$createElement("box"),
      _el$0 = _$createElement("box"),
      _el$1 = _$createElement("text");
    _$insertNode(_el$9, _el$0);
    _$setProp(_el$9, "onMouseDown", e => {
      stop(e);
      setOpen(!open());
    });
    _$insertNode(_el$0, _el$1);
    _$setProp(_el$0, "flexDirection", "column");
    _$insert(_el$1, () => (open() ? "▼ " : "▸ ") + node.segment + (total ? ` (${total})` : ""));
    _$insert(_el$0, _$createComponent(Show, {
      get when() {
        return open();
      },
      get children() {
        var _el$10 = _$createElement("box");
        _$setProp(_el$10, "flexDirection", "column");
        _$setProp(_el$10, "paddingLeft", 1);
        _$insert(_el$10, _$createComponent(For, {
          get each() {
            return node.plugins;
          },
          children: p => _$createComponent(PluginItem, {
            plugin: p
          })
        }), null);
        _$insert(_el$10, _$createComponent(For, {
          get each() {
            return children();
          },
          children: child => _$createComponent(NodeView, {
            node: child
          })
        }), null);
        return _el$10;
      }
    }), null);
    _$effect(_$p => _$setProp(_el$1, "fg", context.theme.text.base, _$p));
    return _el$9;
  })();
}
export default Plugin.define({
  id: "plugins.pane",
  async setup(context) {
    const [tick, setTick] = createSignal(0);
    const [pluginsOpen, setPluginsOpen] = createSignal(false);
    const [serverOpen, setServerOpen] = createSignal(false);
    const [tuiOpen, setTuiOpen] = createSignal(false);
    const [serverTree] = createResource(tick, async () => {
      const location = context.location ?? context.data.location.default();
      try {
        const res = await context.client.plugin.list({
          location
        });
        const list = res && (res.data ?? res) || [];
        return buildTree(Array.isArray(list) ? list : []);
      } catch {
        return new Map();
      }
    });
    const [tuiTree] = createResource(tick, async () => {
      const list = [];
      try {
        const fsMod = await import("node:fs");
        const home = globalThis?.process?.env?.HOME || "/home/craig";
        const text = fsMod.readFileSync(`${home}/.config/opencode/cli.json`, "utf8");
        const parsed = JSON.parse(text);
        const cliPlugins = Array.isArray(parsed?.plugins) ? parsed.plugins : [];
        for (const entry of cliPlugins) {
          const spec = typeof entry === "string" ? entry : entry?.package;
          if (!spec) continue;
          const id = String(spec).split("/").pop()?.replace(/^opencode-/, "opencode.") || String(spec);
          list.push({
            id,
            source: {
              type: "package",
              target: spec
            },
            features: {
              tui: true
            },
            state: {
              status: "active"
            }
          });
        }
      } catch {}
      return buildTree(list);
    });
    context.ui.slot({
      append: "sidebar.content",
      render: () => {
        const ctx = usePlugin();
        return (() => {
          var _el$11 = _$createElement("box"),
            _el$12 = _$createElement("box"),
            _el$13 = _$createElement("text");
          _$insertNode(_el$11, _el$12);
          _$setProp(_el$11, "flexDirection", "column");
          _$setProp(_el$11, "marginTop", 1);
          _$insertNode(_el$12, _el$13);
          _$setProp(_el$12, "onMouseDown", e => {
            stop(e);
            setPluginsOpen(!pluginsOpen());
          });
          _$insert(_el$13, () => (pluginsOpen() ? "▼ " : "▶ ") + "Plugins");
          _$insert(_el$11, _$createComponent(Show, {
            get when() {
              return pluginsOpen();
            },
            get children() {
              var _el$14 = _$createElement("box"),
                _el$15 = _$createElement("box"),
                _el$16 = _$createElement("text"),
                _el$20 = _$createElement("box"),
                _el$21 = _$createElement("text");
              _$insertNode(_el$14, _el$15);
              _$insertNode(_el$14, _el$20);
              _$setProp(_el$14, "flexDirection", "column");
              _$setProp(_el$14, "paddingLeft", 1);
              _$insertNode(_el$15, _el$16);
              _$setProp(_el$15, "onMouseDown", e => {
                stop(e);
                setServerOpen(!serverOpen());
              });
              _$insert(_el$16, () => (serverOpen() ? "▾ " : "▸ ") + "Server");
              _$insert(_el$14, _$createComponent(Show, {
                get when() {
                  return serverOpen();
                },
                get children() {
                  var _el$17 = _$createElement("box");
                  _$setProp(_el$17, "flexDirection", "column");
                  _$setProp(_el$17, "paddingLeft", 1);
                  _$insert(_el$17, _$createComponent(Show, {
                    get when() {
                      return serverTree.loading;
                    },
                    get children() {
                      var _el$18 = _$createElement("text");
                      _$insertNode(_el$18, _$createTextNode(`Loading…`));
                      _$effect(_$p => _$setProp(_el$18, "fg", ctx.theme.text.muted, _$p));
                      return _el$18;
                    }
                  }), null);
                  _$insert(_el$17, _$createComponent(For, {
                    get each() {
                      return Array.from((serverTree() ?? new Map()).values());
                    },
                    children: node => _$createComponent(NodeView, {
                      node: node
                    })
                  }), null);
                  return _el$17;
                }
              }), _el$20);
              _$insertNode(_el$20, _el$21);
              _$setProp(_el$20, "onMouseDown", e => {
                stop(e);
                setTuiOpen(!tuiOpen());
              });
              _$insert(_el$21, () => (tuiOpen() ? "▾ " : "▸ ") + "TUI");
              _$insert(_el$14, _$createComponent(Show, {
                get when() {
                  return tuiOpen();
                },
                get children() {
                  var _el$22 = _$createElement("box");
                  _$setProp(_el$22, "flexDirection", "column");
                  _$setProp(_el$22, "paddingLeft", 1);
                  _$insert(_el$22, _$createComponent(Show, {
                    get when() {
                      return tuiTree.loading;
                    },
                    get children() {
                      var _el$23 = _$createElement("text");
                      _$insertNode(_el$23, _$createTextNode(`Loading…`));
                      _$effect(_$p => _$setProp(_el$23, "fg", ctx.theme.text.muted, _$p));
                      return _el$23;
                    }
                  }), null);
                  _$insert(_el$22, _$createComponent(For, {
                    get each() {
                      return Array.from((tuiTree() ?? new Map()).values());
                    },
                    children: node => _$createComponent(NodeView, {
                      node: node
                    })
                  }), null);
                  return _el$22;
                }
              }), null);
              _$effect(_p$ => {
                var _v$3 = ctx.theme.text.base,
                  _v$4 = ctx.theme.text.base;
                _v$3 !== _p$.e && (_p$.e = _$setProp(_el$16, "fg", _v$3, _p$.e));
                _v$4 !== _p$.t && (_p$.t = _$setProp(_el$21, "fg", _v$4, _p$.t));
                return _p$;
              }, {
                e: undefined,
                t: undefined
              });
              return _el$14;
            }
          }), null);
          _$effect(_p$ => {
            var _v$5 = ctx.theme.text.base,
              _v$6 = TextAttributes.BOLD;
            _v$5 !== _p$.e && (_p$.e = _$setProp(_el$13, "fg", _v$5, _p$.e));
            _v$6 !== _p$.t && (_p$.t = _$setProp(_el$13, "attributes", _v$6, _p$.t));
            return _p$;
          }, {
            e: undefined,
            t: undefined
          });
          return _el$11;
        })();
      }
    });
    context.keymap.layer(() => ({
      mode: "global",
      commands: [{
        id: "plugins.pane.refresh",
        title: "Refresh plugins pane",
        group: "Plugins",
        palette: true,
        run: () => setTick(n => n + 1)
      }]
    }));
    return () => {};
  }
});
