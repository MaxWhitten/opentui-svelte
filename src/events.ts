/** Event propagation for the logical terminal tree, independent of native layout. */
export interface EventHost {
	readonly parentNode: EventHost | null
}
type Listener = EventListenerOrEventListenerObject
type Entry = {
	listener: Listener
	capture: boolean
	once: boolean
	passive: boolean
	cleanup?: () => void
}
const registry = new WeakMap<EventHost, Map<string, Set<Entry>>>()
const dispatching = new WeakSet<Event>()

export function addListener(
	host: EventHost,
	type: string,
	listener: Listener | null,
	options: boolean | AddEventListenerOptions = {}
) {
	if (!listener) return
	const config = typeof options === 'boolean' ? { capture: options } : options
	if (config.signal?.aborted) return
	const events = registry.get(host) ?? new Map<string, Set<Entry>>()
	registry.set(host, events)
	const entries = events.get(type) ?? new Set<Entry>()
	events.set(type, entries)
	const capture = !!config.capture
	if ([...entries].some((entry) => entry.listener === listener && entry.capture === capture))
		return
	const entry: Entry = { listener, capture, once: !!config.once, passive: !!config.passive }
	entries.add(entry)
	if (config.signal) {
		const signal = config.signal
		const abort = () => removeListener(host, type, listener, capture)
		signal.addEventListener('abort', abort, { once: true })
		entry.cleanup = () => signal.removeEventListener('abort', abort)
	}
}

export function removeListener(
	host: EventHost,
	type: string,
	listener: Listener | null,
	options: boolean | EventListenerOptions = {}
) {
	const capture = typeof options === 'boolean' ? options : !!options.capture
	const entries = registry.get(host)?.get(type)
	for (const entry of entries ?? []) {
		if (entry.listener === listener && entry.capture === capture) {
			entries!.delete(entry)
			entry.cleanup?.()
		}
	}
}

export function clearListeners(host: EventHost) {
	for (const entries of registry.get(host)?.values() ?? [])
		for (const entry of entries) entry.cleanup?.()
	registry.delete(host)
}

export function dispatch(host: EventHost, event: Event): boolean {
	if (dispatching.has(event) || !event.type)
		throw new Error('Cannot dispatch an active or uninitialized event')
	dispatching.add(event)
	const path: EventHost[] = []
	for (let node: EventHost | null = host; node; node = node.parentNode) path.push(node)
	let immediate = false
	let passive = false
	const originalPrevent = event.preventDefault
	const originalImmediate = event.stopImmediatePropagation
	const originalPath = Object.getOwnPropertyDescriptor(event, 'composedPath')
	const define = (key: string, value: unknown) =>
		Object.defineProperty(event, key, { configurable: true, value })
	define('target', host)
	define('composedPath', () => [...path])
	define('preventDefault', function () {
		if (!passive) originalPrevent.call(event)
	})
	define('stopImmediatePropagation', function () {
		immediate = true
		originalImmediate.call(event)
	})
	const invoke = (node: EventHost, capture: boolean, phase: number) => {
		const entries = registry.get(node)?.get(event.type)
		for (const entry of [...(entries ?? [])]) {
			if (entry.capture !== capture || !entries!.has(entry)) continue
			if (entry.once) removeListener(node, event.type, entry.listener, entry.capture)
			define('currentTarget', node)
			define('eventPhase', phase)
			passive = entry.passive
			try {
				if (typeof entry.listener === 'function')
					entry.listener.call(node as unknown as EventTarget, event)
				else entry.listener.handleEvent(event)
			} finally {
				passive = false
			}
			if (immediate) break
		}
	}
	try {
		for (const node of path.slice(1).reverse()) {
			invoke(node, true, Event.CAPTURING_PHASE)
			if (event.cancelBubble) return !event.defaultPrevented
		}
		invoke(host, true, Event.AT_TARGET)
		if (!immediate) invoke(host, false, Event.AT_TARGET)
		if (event.bubbles && !event.cancelBubble)
			for (const node of path.slice(1)) {
				invoke(node, false, Event.BUBBLING_PHASE)
				if (event.cancelBubble) break
			}
		return !event.defaultPrevented
	} finally {
		dispatching.delete(event)
		define('currentTarget', null)
		define('eventPhase', Event.NONE)
		define('preventDefault', originalPrevent)
		define('stopImmediatePropagation', originalImmediate)
		if (originalPath) Object.defineProperty(event, 'composedPath', originalPath)
		else Reflect.deleteProperty(event, 'composedPath')
	}
}
