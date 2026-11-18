# Integration review

Reviewed against upstream `358902a` and the public React/Solid integration contracts:

- https://github.com/anomalyco/opentui/tree/main/packages/react
- https://github.com/anomalyco/opentui/tree/main/packages/solid
- Installed OpenTUI 0.9.2 renderable/event/lifecycle implementations
- Installed Svelte 5.57.3 compiler and client DOM runtime

## Findings and implemented changes

| Area | Prior problem | Fork behavior / evidence |
| --- | --- | --- |
| Lifecycle | Upstream never unmounted components; app adaptation only unmounted on renderer destruction | Explicit idempotent async disposal, props/context and component exports, initial-effect failure cleanup. Runtime tests assert cleanup once and mount after failure. |
| Root ownership | Mutable process-wide renderer could route updates into another scene | Concurrent mounts rejected before renderer creation; sequential mounts tested. This is containment, not full root isolation. |
| Tree operations | Incomplete fragment movement, missing insertBefore, divergent ordering | Logical DOM ownership separated from native ownership; keyed reconciliation, fragments, reordering, cloning, and clearing tested. |
| Layout whitespace | Svelte formatting whitespace between elements created extra native flex items | Whitespace-only text renderables are hidden from layout, including reactive transitions to and from nonblank content; rich text retains inline spaces. |
| Resource lifecycle | Removing elements detached them without releasing native resources | Detached logical subtrees, including native inline placeholders, released after the synchronous move window; renderer owns final scene cleanup. |
| Events | Callback assignment replaced previous listeners; dispatch did not reach those callbacks; delegated events lacked DOM target/path | Listener sets, capture/target/bubble dispatch, once/identity removal, AbortSignal, passive listeners, listener objects, stopImmediatePropagation, native payload bridging, text-origin handling and matched click gestures. Real mouse interaction and event ordering tested. |
| Bindings | Raw native payloads and focus stubs broke browser-runtime assumptions | Input binding, explicit focus/blur, activeElement, live bounds, input submission bridge. Binding tested with actual mock input. |
| Props | Hardcoded subset silently ignored native setters; style mutations never reached renderer | Native setter discovery and case normalization, style object application/removal, actual attribute presence, strict unknown tags, extensible catalogue. |
| Primitives | Only boxes/input and separate raw text nodes | Native input, textarea, selection, scrolling, ASCII art, code/diff constructors; inline rich text composition and reactive branches. New catalogue entries are not a claim of exhaustive prop/event coverage. |
| Build | No shared rune modules, lost source maps, guessed auto-render entrypoint names | Component and rune-module compilation, TypeScript erasure, inline maps, CSS rejection, warning reporting, explicit entrypoints. Shared rune reactivity tested. |
| Packaging | Stale upstream monorepo URL, private official-scope package, core dependency `latest`, no consumer plugin export | Independent scope, exact tested peers, explicit exports, standalone scripts, provenance and support limits. |
| Consumer workarounds | App manually allocated ASCII renderables and attached mouse callbacks | App now uses native adapter primitive and declarative Svelte event. Existing setup interaction tests pass. |

## Remaining blockers for first-class adoption

1. **Renderer isolation:** Svelte's DOM runtime caches document operations and the adapter still installs process globals. Full concurrent roots, embedding alongside a real DOM, and document isolation require a host-context design (or a custom compiler/runtime integration). The explicit guard prevents corruption but does not provide parity here.
2. **Editor types:** opt-in intrinsic definitions cover new terminal tags, and common terminal layout/color/focus attributes extend HTML/SVG types with lowercase spellings. Select options/index and tabselect event detail have types, but Svelte's built-in HTML select event types do not describe native detail. `svelte-check` checks component fixtures plus negative type assertions. Specialized input/selection options and native event payloads still need complete types. Terminal projects must opt in; mixed browser/terminal programs need isolated type scopes.
3. **Event fidelity:** not a complete DOM EventTarget implementation. AbortSignal, passive behavior, listener objects, stopImmediatePropagation, target phases and matching click gestures are implemented with regression tests; browser exception reporting and event redispatch semantics are not fully equivalent. Global document/window events and full native selection/paste/drag element semantics are incomplete. Payloads currently live under `detail`.
4. **Svelte feature matrix:** keyed blocks, snippets in the consumer, bindings, effects, shared runes, and remounts have coverage. Await blocks, actions, spreads, dynamic elements and onMount cleanup also have runtime tests. Boundaries, attachments, portals, transitions, animation, and runtime development diagnostics still need dedicated coverage. Browser CSS, hydration, raw HTML, media, and web custom elements are not supported.
5. **Rich-text performance:** logical text children still allocate native placeholder renderables, and updates currently recompose the text subtree. A production text-host design should avoid those allocations and benchmark long lists/text/rapid updates. Removed inline native placeholders are explicitly destroyed and regression-tested; allocation/load stress testing is still needed.
6. **Surface completeness:** Markdown, image/video, line-number, slider/table, and advanced core features are not in the catalogue. Core additions and constructor-only options need explicit policies. Select and tabselect keyboard movement/activation now bridge to Svelte change/select events, with regression coverage. Verify scrolling, code/diff highlighting, and broader selection and keyboard interaction with frame-level tests before promising comprehensive coverage.
7. **Release engineering:** exact peer versions prevent accidental compatibility claims, but a tested version matrix, package install smoke tests on Linux/macOS/Windows, semver policy, benchmarks, and the upstream license notice are still required. A clean Linux tarball consumer passed keyboard/paste/resize hook removal and remount with the documented preload; separately built adapter output passed the same smoke test without a runtime preload. The Svelte checker uses TypeScript 5.9.3 because its declared support does not include TypeScript 7. In the vscan workspace, both development toolchains use 5.9.3: divergent TypeScript peers in bun-ffi-structs caused Bun to instantiate duplicate OpenTUI modules and broke class identity checks. Installed consumers do not install this package's dev dependencies. Full dependency declaration checking currently reports an upstream OpenTUI InternalKeyHandler/EventEmitter signature mismatch; normal checks retain skipLibCheck. Node runtime support is not claimed.
8. **Upstream status:** adoption, ownership of the official package scope, maintainer review, and ongoing maintenance are organizational requirements. This fork cannot confer first-party status itself.

The fork is a tested improvement, not a declaration that the above blockers are solved. Regression tests should accompany each further claim of compatibility.

## Consumer simplification

The vscan consumer imports this package and its preload/build plugin directly; no local adapter forwarding library is needed. Its ASCII-font wrapper is replaced by the native `asciifont` element. Keyboard, paste, and resize hooks now own their Svelte subscriptions, matching the lifecycle behavior expected from React/Solid hooks. Tests cover component removal/remount, explicit cancellation, and legacy effect callers. The adapter build compiles its internal rune module too.

The remaining vscan Button is application styling/composition using `box` and `text`, not a native renderer workaround. Neither documented React nor Solid intrinsic catalogue includes a button primitive. Tab order remains application policy, as in React's login example; system-information shell commands likewise remain application code. No unrelated native features were added merely to remove these app-specific components.
