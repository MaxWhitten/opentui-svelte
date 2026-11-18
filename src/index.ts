import { createCliRenderer, engine, type CliRendererConfig } from '@opentui/core'
import { createTestRenderer, type TestRendererOptions } from '@opentui/core/testing'
import { mount, unmount, flushSync, type Component } from 'svelte'
import { document, TUINode, TUIElement, setRenderer, wrap } from './dom'

// Install DOM shims globally
// Called explicitly by compiled components
// Idempotent - safe to call multiple times
let shimsInstalled = false
export function installDOMShims() {
	if (shimsInstalled) return
	if (globalThis.document && globalThis.document !== (document as unknown as Document)) {
		throw new Error('OpenTUI Svelte cannot replace an existing browser DOM')
	}
	shimsInstalled = true
	;(globalThis as any).document = document
	;(globalThis as any).window = globalThis
	;(globalThis as any).navigator ??= { userAgent: '' }
	;(globalThis as any).HTMLMediaElement = TUIElement
	;(globalThis as any).Node = TUINode
	;(globalThis as any).Element = TUIElement
	;(globalThis as any).HTMLElement = TUIElement
	;(globalThis as any).Text = TUINode
	;(globalThis as any).Comment = TUINode
	;(globalThis as any).DocumentFragment = TUINode
}

// Svelte's DOM runtime caches global document operations. Until it exposes a host
// renderer API, explicitly reject simultaneous roots instead of cross-wiring them.
let active = false
function reserve() {
	if (active)
		throw new Error(
			'Only one OpenTUI Svelte root may be mounted at a time. Dispose the current root first.'
		)
	active = true
}

export interface MountOptions<Props extends Record<string, any>> {
	props?: Props
	context?: Map<any, any>
}

function mountComponent<Props extends Record<string, any>, Exports extends Record<string, any>>(
	Component: Component<Props, Exports>,
	renderer: Awaited<ReturnType<typeof createCliRenderer>>,
	options: MountOptions<Props>
) {
	setRenderer(renderer)
	const app = mount(Component, {
		target: wrap(renderer.root) as unknown as Element,
		props: options.props ?? ({} as Props),
		context: options.context,
		intro: false,
	})
	try {
		flushSync()
	} catch (error) {
		void unmount(app)
		throw error
	}
	let disposed: Promise<void> | undefined
	const dispose = () =>
		(disposed ??= (async () => {
			try {
				await unmount(app)
			} finally {
				try {
					if (!renderer.isDestroyed) renderer.destroy()
				} finally {
					setRenderer(null)
					active = false
				}
			}
		})())
	renderer.once('destroy', () => {
		void dispose()
	})
	return { app, dispose }
}

export async function render<
	Props extends Record<string, any>,
	Exports extends Record<string, any>,
>(
	Component: Component<Props, Exports>,
	config: CliRendererConfig = {},
	options: MountOptions<Props> = {}
) {
	reserve()
	let renderer: Awaited<ReturnType<typeof createCliRenderer>> | undefined
	try {
		installDOMShims()
		renderer = await createCliRenderer({ exitOnCtrlC: true, targetFps: 30, ...config })
		const mounted = mountComponent(Component, renderer, options)
		renderer.start()
		return { renderer, root: renderer.root, ...mounted }
	} catch (error) {
		try {
			renderer?.destroy()
		} finally {
			setRenderer(null)
			active = false
		}
		throw error
	}
}

export async function testRender<
	Props extends Record<string, any>,
	Exports extends Record<string, any>,
>(
	Component: Component<Props, Exports>,
	config: TestRendererOptions = {},
	options: MountOptions<Props> = {}
) {
	reserve()
	let setup: Awaited<ReturnType<typeof createTestRenderer>> | undefined
	try {
		installDOMShims()
		setup = await createTestRenderer(config)
		engine.attach(setup.renderer)
		const mounted = mountComponent(Component, setup.renderer, options)
		const originalDispose = setup.dispose
		let disposal: Promise<void> | undefined
		return {
			...setup,
			app: mounted.app,
			dispose: () =>
				(disposal ??= (async () => {
					try {
						await mounted.dispose()
					} finally {
						await originalDispose()
					}
				})()),
		}
	} catch (error) {
		try {
			await setup?.dispose()
		} finally {
			setRenderer(null)
			active = false
		}
		throw error
	}
}

export { extend, getComponentCatalogue, type RenderableConstructor, type TUIElement } from './dom'
export { useKeyboard, type UseKeyboardOptions } from './keyboard'

export { useRenderer, usePaste, onResize, useTerminalDimensions } from './hooks'
