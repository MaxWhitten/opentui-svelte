import { expect, test } from 'bun:test'
import { flushSync } from 'svelte'
import { testRender } from '../src'
import { document } from '../src/dom'
import Adapter from './fixtures/Adapter.svelte'

test('props, keyed reconciliation, binding, delegated events and disposal', async () => {
	let destroyed = 0
	const tui = await testRender(
		Adapter,
		{ width: 60, height: 20 },
		{ props: { cleanup: () => destroyed++ } }
	)
	try {
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('initial')
		await tui.mockInput.typeText('x')
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame().match(/initialx/g)?.length).toBe(2)
		tui.app.reset()
		tui.app.reorder()
		flushSync()
		await tui.renderOnce()
		const frame = tui.captureCharFrame()
		expect(frame).toContain('reset')
		expect(frame).not.toContain('two')
		expect(frame.indexOf('three')).toBeLessThan(frame.indexOf('one'))
		expect(frame.indexOf('one')).toBeLessThan(frame.indexOf('four'))
		const lines = frame.split('\n')
		const y = lines.findIndex((line) => line.includes('Count:'))
		await tui.mockMouse.click(1, y)
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('Count: 1')
		await expect(testRender(Adapter)).rejects.toThrow('Only one')
		tui.app.clear()
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).not.toContain('four')
	} finally {
		await tui.dispose()
		await tui.dispose()
	}
	expect(destroyed).toBe(1)
})

test('fragments, moves, live clones, listener identity and focus', async () => {
	const tui = await testRender(Adapter)
	try {
		const parent = document.createElement('div')
		const a = document.createElement('div')
		const b = document.createElement('div')
		const fragment = document.createDocumentFragment()
		fragment.append(a, b)
		parent.append(fragment)
		expect(fragment.children).toHaveLength(0)
		expect(parent.children).toEqual([a, b])
		a.before(b)
		expect(parent.children).toEqual([b, a])
		a.setAttribute('title', 'first')
		a.cloneNode()
		a.setAttribute('title', 'second')
		expect((a.cloneNode() as typeof a).getAttribute('title')).toBe('second')
		expect(document.importNode(a)).not.toBe(a)
		let first = 0,
			second = 0
		const handler = () => first++
		a.addEventListener('click', handler)
		a.addEventListener('click', handler)
		a.addEventListener('click', () => second++, { once: true })
		a.dispatchEvent(new Event('click'))
		a.removeEventListener('click', handler)
		a.dispatchEvent(new Event('click'))
		expect(first).toBe(1)
		expect(second).toBe(1)
		expect(document.activeElement?.tag).toBe('input')
		expect(() => document.createElement('typo')).toThrow('Unknown terminal element')
	} finally {
		await tui.dispose()
	}
})

test('shared TypeScript rune modules update components', async () => {
	const { default: Runes } = await import('./fixtures/Runes.svelte')
	const tui = await testRender(Runes)
	try {
		tui.app.increment()
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('3')
	} finally {
		await tui.dispose()
	}
})

test('rich text preserves inline spacing, styles and reactive branches', async () => {
	const { default: RichText } = await import('./fixtures/RichText.svelte')
	const tui = await testRender(RichText, { width: 40, height: 10 })
	try {
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('Hello world!')
		expect(tui.captureCharFrame()).toContain('next line')
		tui.app.update()
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('Hello Svelte')
		expect(tui.captureCharFrame()).not.toContain('!')
	} finally {
		await tui.dispose()
	}
})

test('formatting whitespace does not take layout space and reactive text remains visible', async () => {
	const { default: Whitespace } = await import('./fixtures/Whitespace.svelte')
	const tui = await testRender(Whitespace, { width: 40, height: 10 })
	try {
		await tui.renderOnce()
		let lines = tui.captureCharFrame().split('\n')
		expect(lines[0]).toContain('first')
		expect(lines[1]).toContain('second')
		expect(lines[2]).toMatch(/^A B/)
		expect(lines[3]).toContain('inline bold text')
		tui.app.update('live')
		tui.app.updateSeparator('  ')
		flushSync()
		await tui.renderOnce()
		lines = tui.captureCharFrame().split('\n')
		expect(lines[1]).toContain('live')
		expect(lines[2]).toContain('second')
		expect(lines[4]).toContain('inline bold  text')
		tui.app.update(' \t\n')
		flushSync()
		await tui.renderOnce()
		lines = tui.captureCharFrame().split('\n')
		expect(lines[1]).toContain('second')
		expect(lines[2]).toMatch(/^A B/)
	} finally {
		await tui.dispose()
	}
})

test('a failed initial effect releases the root and component resources', async () => {
	const { default: Failure } = await import('./fixtures/Failure.svelte')
	let cleaned = 0
	await expect(testRender(Failure, {}, { props: { cleanup: () => cleaned++ } })).rejects.toThrow(
		'intentional mount failure'
	)
	expect(cleaned).toBe(1)
	const tui = await testRender(Adapter)
	await tui.dispose()
})

test('native primitives, style reset, attribute casing and removal release resources', async () => {
	const { ASCIIFontRenderable, SelectRenderable, BoxRenderable, Yoga } =
		await import('@opentui/core')
	const { extend } = await import('../src')
	const tui = await testRender(Adapter)
	try {
		const ascii = document.createElement('asciifont')
		ascii.setAttribute('text', 'hello')
		expect((ascii._renderable as InstanceType<typeof ASCIIFontRenderable>).text).toBe('hello')
		const select = document.createElement('select')
		select.setAttribute('options', [
			{ name: 'first', description: '' },
			{ name: 'second', description: '' },
		])
		select.setAttribute('selectedindex', 1)
		expect(
			(select._renderable as InstanceType<typeof SelectRenderable>).getSelectedIndex()
		).toBe(1)
		const node = document.createElement('box')
		node.style = { paddingLeft: 3 }
		expect(node._renderable.getPadding(Yoga.Edge.Left).value).toBe(3)
		node.style = {}
		expect(node._renderable.getPadding(Yoga.Edge.Left).unit).toBe(Yoga.Unit.Undefined)
		node.setAttribute('borderColor', 'red')
		expect(node.hasAttribute('bordercolor')).toBe(true)
		expect(node.getAttribute('BORDERCOLOR')).toBe('red')
		node.removeAttribute('bordercolor')
		expect(node.hasAttribute('borderColor')).toBe(false)
		extend({ custombox: BoxRenderable })
		expect(document.createElement('custombox')._renderable).toBeInstanceOf(BoxRenderable)
		document.body!.append(node)
		node.remove()
		await Promise.resolve()
		expect(node._renderable.isDestroyed).toBe(true)
	} finally {
		await tui.dispose()
	}
})

test('inline subtree removal releases every native placeholder', async () => {
	const tui = await testRender(Adapter)
	try {
		const text = document.createElement('text')
		const span = document.createElement('span')
		const value = document.createTextNode('retained')
		span.append(value)
		text.append(span)
		document.body!.append(text)
		text.remove()
		await Promise.resolve()
		expect(text._renderable.isDestroyed).toBe(true)
		expect(span._renderable.isDestroyed).toBe(true)
		expect(value._renderable.isDestroyed).toBe(true)
	} finally {
		await tui.dispose()
	}
})

test('a real mouse click dispatches one delegated click', async () => {
	const { default: Click } = await import('./fixtures/Click.svelte')
	const tui = await testRender(Click, { width: 30, height: 5 })
	try {
		await tui.renderOnce()
		await tui.mockMouse.click(1, 0)
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('Clicks: 1')
	} finally {
		await tui.dispose()
	}
})

test('actions, spreads, dynamic elements, await blocks and onMount cleanup', async () => {
	const { default: Features } = await import('./fixtures/Features.svelte')
	const { tick } = await import('svelte')
	const { Yoga } = await import('@opentui/core')
	const records: string[] = []
	const tui = await testRender(
		Features,
		{ width: 50, height: 10 },
		{ props: { record: (value: string) => records.push(value) } }
	)
	try {
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('before')
		expect(tui.captureCharFrame()).toContain('pending')
		expect(records).toContain('action:before')
		expect(records).toContain('mount')
		const node = document.body!.children.find((node) => node.tag === 'div')!
		expect(node._renderable.getPadding(Yoga.Edge.Left).value).toBe(2)
		tui.app.update()
		await tick()
		flushSync()
		await tui.renderOnce()
		expect(tui.captureCharFrame()).toContain('after')
		expect(tui.captureCharFrame()).toContain('resolved')
		expect(tui.captureCharFrame()).not.toContain('pending')
		expect(records).toContain('update:after')
		expect(node._renderable.getPadding(Yoga.Edge.Left).unit).toBe(Yoga.Unit.Undefined)
	} finally {
		await tui.dispose()
	}
	expect(records.filter((value) => value === 'action:destroy')).toHaveLength(1)
	expect(records.filter((value) => value === 'mount:destroy')).toHaveLength(1)
})

test('hooks own subscriptions across component removal and remount', async () => {
	const { default: Hooks } = await import('./fixtures/Hooks.svelte')
	const { PasteEvent } = await import('@opentui/core')
	const records: string[] = []
	const tui = await testRender(
		Hooks,
		{},
		{ props: { record: (event: string) => records.push(event) } }
	)
	const input = tui.renderer.keyInput
	const counts = () => [
		input.listenerCount('keypress'),
		input.listenerCount('keyrelease'),
		input.listenerCount('paste'),
		tui.renderer.listenerCount('resize'),
	]
	const fire = () => {
		tui.mockInput.pressTab()
		input.emit('paste', new PasteEvent(new Uint8Array()))
		tui.renderer.emit('resize', 40, 10)
	}
	try {
		const mounted = counts()
		fire()
		expect(records).toEqual(['key', 'paste', 'resize'])
		tui.app.toggle()
		flushSync()
		expect(counts()).toEqual(mounted.map((count) => count - 1))
		fire()
		expect(records).toHaveLength(3)
		tui.app.toggle()
		flushSync()
		expect(counts()).toEqual(mounted)
		fire()
		expect(records).toEqual(['key', 'paste', 'resize', 'key', 'paste', 'resize'])
	} finally {
		await tui.dispose()
	}
})

test('hooks may be cancelled before their mount effect runs', async () => {
	const { default: Hooks } = await import('./fixtures/Hooks.svelte')
	const records: string[] = []
	const tui = await testRender(
		Hooks,
		{},
		{ props: { record: (event: string) => records.push(event), cancelImmediately: true } }
	)
	try {
		tui.mockInput.pressTab()
		tui.renderer.emit('resize', 40, 10)
		expect(records).toEqual([])
	} finally {
		await tui.dispose()
	}
})

test('selection controls bridge native keyboard changes and activation to Svelte events', async () => {
	const { default: Selection } = await import('./fixtures/Selection.svelte')
	const records: Array<[string, unknown]> = []
	const tui = await testRender(Selection, { width: 40, height: 10 }, {
		props: { record: (kind: string, detail: unknown) => records.push([kind, detail]) },
	})
	const option = { name: 'second', description: '' }
	try {
		await tui.renderOnce()
		tui.mockInput.pressArrow('down')
		tui.mockInput.pressEnter()
		expect(records).toEqual([['change', [1, option]], ['select', [1, option]]])
		records.length = 0
		tui.app.toggle()
		flushSync()
		await tui.renderOnce()
		tui.mockInput.pressArrow('right')
		tui.mockInput.pressEnter()
		expect(records).toEqual([['change', [1, option]], ['select', [1, option]]])
	} finally {
		await tui.dispose()
	}
})
