# Bun Runtime Plugin Notes

These are the Bun runtime plugin behaviors we have confirmed while debugging the React Native resolver.

## `onResolve` Is Pre-Filtered

Runtime `Bun.plugin()` `onResolve` callbacks are not tried for every specifier. Bun first runs `PluginRunner.couldBePlugin(specifier)`.

In local Bun source:

- `/Users/09jwater/Documents/bun-src/src/jsc/VirtualMachine.zig`
- `resolveMaybeNeedsTrailingSlash` calls `plugin_runner.onResolveJSC(...)` only when `PluginRunner.couldBePlugin(...)` is true.
- `/Users/09jwater/Documents/bun-src/src/bundler_jsc/PluginRunner.zig`
- `couldBePlugin` returns true only for specifiers that either:
  - contain a dot followed by an extension-like character, or
  - contain a namespace colon.

That means these do not reach our `onResolve` filter:

```ts
import "react-native";
require("./Thing");
import "./Thing";
```

These do reach our `onResolve` filter:

```ts
require("@react-native/jest-preset/jest/mocks/View.js");
require("platform-select:./Thing");
require("actual:react-native");
```

Implication: extensionless relative specifiers and bare package specifiers must be rewritten into a namespaced specifier if we need Bun runtime plugins to resolve them.

## `onLoad` Is Also Pre-Filtered

Runtime `onLoad` has the same `PluginRunner.couldBePlugin(specifier)` gate.

In local Bun source:

- `/Users/09jwater/Documents/bun-src/src/jsc/ModuleLoader.zig`
- `Bun__runVirtualModule` returns early if `PluginRunner.couldBePlugin(specifier)` is false.
- If true, Bun splits `namespace:path`, then calls `runOnLoadPlugins(namespace, path, .bun)`.

So this can reach an `onLoad` handler:

```ts
require("react-native-transform:/abs/file.js");
```

But this cannot:

```ts
require("react-native");
```

## `onLoad` Output Is ESM-Shaped

Observed behavior: runtime `onLoad` source output is treated like a virtual module, not like a file that receives Bun's normal CommonJS wrapper.

Implication: returning raw CommonJS from `onLoad` is unsafe when the caller expects `module`, `exports`, or CJS export projection. If we route a file through an `onLoad` namespace, the returned source needs to be ESM-compatible or include our own CJS handling.

This is why `commonjs-exports` is special in our transform decision logic: if it is the only transform, we prefer not to route through the transform namespace and instead let Bun's normal file loader handle CommonJS.
