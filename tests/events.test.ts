import { expect, test } from 'bun:test'
import { addListener, removeListener, dispatch, type EventHost } from '../src/events'

test('capture, target and bubble phases preserve order and currentTarget', () => {
	const root: EventHost = { parentNode: null },
		target: EventHost = { parentNode: root }
	const calls: string[] = []
	addListener(
		root,
		'event',
		(event) => {
			calls.push('capture')
			expect(event.eventPhase).toBe(Event.CAPTURING_PHASE)
		},
		true
	)
	addListener(
		target,
		'event',
		(event) => {
			calls.push('target capture')
			expect(event.currentTarget as unknown).toBe(target)
		},
		true
	)
	addListener(target, 'event', () => calls.push('target'))
	addListener(root, 'event', (event) => {
		calls.push('bubble')
		expect(event.composedPath() as unknown[]).toEqual([target, root])
	})
	const event = new Event('event', { bubbles: true })
	expect(dispatch(target, event)).toBe(true)
	expect(calls).toEqual(['capture', 'target capture', 'target', 'bubble'])
	expect(event.currentTarget).toBeNull()
	expect(event.eventPhase).toBe(Event.NONE)
})

test('abort, listener objects, passive listeners, removal and once', () => {
	const host: EventHost = { parentNode: null }
	const controller = new AbortController()
	let calls = 0
	const listener = {
		handleEvent: () => {
			calls++
		},
	}
	addListener(host, 'event', listener, { signal: controller.signal })
	controller.abort()
	addListener(host, 'event', listener, { signal: controller.signal })
	dispatch(host, new Event('event'))
	expect(calls).toBe(0)
	addListener(host, 'event', listener, { once: true })
	addListener(host, 'event', (event) => event.preventDefault(), { passive: true })
	expect(dispatch(host, new Event('event', { cancelable: true }))).toBe(true)
	dispatch(host, new Event('event'))
	expect(calls).toBe(1)
	const later = () => {
		calls++
	}
	addListener(host, 'removed', () => removeListener(host, 'removed', later))
	addListener(host, 'removed', later)
	dispatch(host, new Event('removed'))
	expect(calls).toBe(1)
})

test('stopImmediatePropagation stops remaining listeners and ancestors', () => {
	const root: EventHost = { parentNode: null },
		target: EventHost = { parentNode: root }
	const calls: string[] = []
	addListener(target, 'event', (event) => {
		calls.push('first')
		event.stopImmediatePropagation()
	})
	addListener(target, 'event', () => calls.push('second'))
	addListener(root, 'event', () => calls.push('parent'))
	dispatch(target, new Event('event', { bubbles: true }))
	expect(calls).toEqual(['first'])
})

test('stopPropagation on target capture still allows target bubble listeners', () => {
	const root: EventHost = { parentNode: null },
		target: EventHost = { parentNode: root }
	const calls: string[] = []
	addListener(
		target,
		'event',
		(event) => {
			calls.push('capture')
			event.stopPropagation()
		},
		true
	)
	addListener(target, 'event', () => calls.push('target'))
	addListener(root, 'event', () => calls.push('parent'))
	dispatch(target, new Event('event', { bubbles: true }))
	expect(calls).toEqual(['capture', 'target'])
})
