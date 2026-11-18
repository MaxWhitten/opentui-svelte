import { addListener, removeListener, clearListeners, dispatch } from './events'
// Adapted from https://github.com/slowsage/opentui-svelte (MIT).
import {
	Renderable,
	TextRenderable,
	BoxRenderable,
	InputRenderable,
	ScrollBoxRenderable,
	TextareaRenderable,
	SelectRenderable,
	TabSelectRenderable,
	ASCIIFontRenderable,
	CodeRenderable,
	DiffRenderable,
	type CliRenderer,
	TextNodeRenderable,
	StyledText,
	TextAttributes,
} from '@opentui/core'

// ============================================================================
// Type definitions
// ============================================================================

type TUIDOMTokenList = {
	add(...tokens: string[]): void
	remove(...tokens: string[]): void
	contains(token: string): boolean
}

// ============================================================================
// Property mappings - DOM properties → OpenTUI Renderable properties
// ============================================================================

// Properties that map directly to Renderable properties (same name)
const DIRECT_MAPPINGS = new Set([
	// Layout
	'width',
	'height',
	'visible',
	'zIndex',
	'position',
	'left',
	'top',
	'right',
	'bottom',

	// Yoga Flexbox
	'flexDirection',
	'flexGrow',
	'flexShrink',
	'flexBasis',
	'flexWrap',
	'alignItems',
	'alignSelf',
	'justifyContent',
	'gap',
	'rowGap',
	'columnGap',
	'padding',
	'paddingX',
	'paddingY',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'margin',
	'marginX',
	'marginY',
	'marginTop',
	'marginBottom',
	'marginLeft',
	'marginRight',
	'minWidth',
	'maxWidth',
	'minHeight',
	'maxHeight',

	// Visual Styling
	'backgroundColor',
	'borderStyle',
	'borderColor',
	'border',
	'fg',
	'bg',

	// BoxRenderable-specific
	'title',
	'titleColor',
	'titleAlignment',
	'bottomTitle',
	'bottomTitleAlignment',
	'focusable',
	'focusedBorderColor',
	'shouldFill',
	'customBorderChars',

	// InputRenderable-specific
	'value',
	'placeholder',
	'maxLength',
	'textColor',
	'focusedBackgroundColor',
	'focusedTextColor',
	'cursorColor',
	'placeholderColor',

	// TextRenderable-specific
	'selectable',
	'content',
])
const CANONICAL_MAPPINGS = new Map([...DIRECT_MAPPINGS].map((name) => [name.toLowerCase(), name]))

// Properties that need name remapping (DOM name → Renderable property name)
const SPECIAL_MAPPINGS: Record<string, string> = {
	innerHTML: 'content',
	textContent: 'content',
	innerText: 'content',
}

// ============================================================================
// Event name mappings - DOM event names → OpenTUI callback property names
// ============================================================================
const EVENT_TO_CALLBACK: Record<string, string> = {
	mousedown: 'onMouseDown',
	mouseup: 'onMouseUp',
	mousemove: 'onMouseMove',
	mousedrag: 'onMouseDrag',
	click: 'onMouse',
	mouseenter: 'onMouseOver',
	mouseleave: 'onMouseOut',
	wheel: 'onMouseScroll',
	keydown: 'onKeyDown',
	submit: 'onSubmit',
}

// ============================================================================
// Renderer context
// ============================================================================

let globalRenderer: CliRenderer | null = null
let pointerDown: TUIElement | null = null

export function getRenderer() {
	if (!globalRenderer) {
		throw new Error('Renderer not initialized. Call render() first.')
	}
	return globalRenderer
}

export function setRenderer(renderer: CliRenderer | null) {
	globalRenderer = renderer
	pointerDown = null
}

// ============================================================================
// DOM wrapper classes
// ============================================================================

// Base class - Node operations
type TemplateSnapshot = {
	tag: string
	text: string
	attributes: Record<string, any>
	children: TemplateSnapshot[]
}

export class TUINode {
	private snapshot?: TemplateSnapshot
	private _children: TUINode[] = []
	private _parent: TUINode | null = null
	constructor(
		public _renderable: Renderable,
		public tag = ''
	) {
		wrappers.set(_renderable, this)
	}

	// Logical DOM ownership is separate from native layout ownership (notably scrollboxes and inline text).
	get firstChild(): TUINode | null {
		return this._children[0] ?? null
	}
	get lastChild(): TUINode | null {
		return this._children.at(-1) ?? null
	}
	get parentNode(): TUINode | null {
		return this._parent
	}
	get nextSibling(): TUINode | null {
		const siblings = this._parent?._children ?? []
		return siblings[siblings.indexOf(this) + 1] ?? null
	}
	get children(): TUINode[] {
		return [...this._children]
	}

	protected refreshText() {
		let root: TUINode | null = this
		while (root && root.tag !== 'text') root = root.parentNode
		if (!root) return
		const collect = (node: TUINode): TextNodeRenderable => {
			const element = node instanceof TUIElement ? node : undefined
			const attributes =
				(
					{
						b: TextAttributes.BOLD,
						strong: TextAttributes.BOLD,
						i: TextAttributes.ITALIC,
						em: TextAttributes.ITALIC,
						u: TextAttributes.UNDERLINE,
					} as Record<string, number>
				)[node.tag] ?? 0
			const text = new TextNodeRenderable({
				id: node._renderable.id,
				fg: element?._getProp('fg'),
				bg: element?._getProp('bg'),
				attributes: attributes | (element?._getProp('attributes') ?? 0),
				link: node.tag === 'a' ? { url: element?.getAttribute('href') ?? '' } : undefined,
			})
			if (node.tag === '#text') text.add(node.nodeValue ?? '')
			else if (node.tag === 'br') text.add('\n')
			else if (node.tag !== '#comment')
				for (const child of node.children) text.add(collect(child))
			return text
		}
		;(root._renderable as TextRenderable).content = new StyledText(collect(root).toChunks())
	}

	private get insideText(): boolean {
		return this.tag === 'text' || !!this.parentNode?.insideText
	}

	get nodeName(): string {
		return this.tag.toUpperCase()
	}

	get nodeType(): number {
		return this.tag === '#text'
			? 3
			: this.tag === '#comment'
				? 8
				: this.tag === '#fragment'
					? 11
					: 1
	}

	get nodeValue(): string | null {
		if (this._renderable instanceof TextRenderable) {
			return this._renderable.content.chunks.map((chunk) => chunk.text).join('')
		}
		return null
	}

	set nodeValue(value: string | null) {
		if (this._renderable instanceof TextRenderable && value !== null) {
			;(this._renderable as TextRenderable).content = value
			this._renderable.visible = value.length !== 0
			this.refreshText()
		}
	}

	get textContent(): string {
		return this.tag === '#text'
			? (this.nodeValue ?? '')
			: this.children.map((child) => child.textContent).join('')
	}
	set textContent(value: string) {
		if (this.tag === '#text') {
			this.nodeValue = value
			return
		}
		for (const child of this.children) this.removeChild(child)
		if (value) this.appendChild(document.createTextNode(value))
	}

	get ownerDocument() {
		return document
	}

	// Node manipulation methods
	appendChild(child: TUINode): TUINode {
		return this.insertBefore(child, null)
	}

	insertBefore(child: TUINode, anchor: TUINode | null): TUINode {
		if (anchor && anchor.parentNode !== this)
			throw new Error('Anchor is not a child of this node')
		if (child === anchor) return child
		for (let parent: TUINode | null = this; parent; parent = parent.parentNode) {
			if (parent === child) throw new Error('Cannot insert an ancestor into its descendant')
		}
		const nodes = child.tag === '#fragment' ? [...child.children] : [child]
		for (const node of nodes) {
			if (node._parent) {
				const previous = node._parent
				previous._children.splice(previous._children.indexOf(node), 1)
				if (!previous.insideText) previous._renderable.remove(node._renderable)
				previous.refreshText()
			}
			const index = anchor ? this._children.indexOf(anchor) : this._children.length
			this._children.splice(index, 0, node)
			node._parent = this
			if (!this.insideText) this._renderable.add(node._renderable, index)
			this._propagateTextStyles(node._renderable)
			this.refreshText()
		}
		return child
	}

	append(...children: TUINode[]) {
		for (const child of children) this.appendChild(child)
	}

	remove() {
		this.parentNode?.removeChild(this)
	}

	removeChild(child: TUINode) {
		if (child.parentNode !== this) throw new Error('Node is not a child of this parent')
		this._children.splice(this._children.indexOf(child), 1)
		if (!this.insideText) this._renderable.remove(child._renderable)
		child._parent = null
		this.refreshText()
		// Moving a node is synchronous; release removed native resources after the move window.
		queueMicrotask(() => {
			if (!child.parentNode) child.destroyDetachedSubtree()
		})
		return child
	}

	private destroyDetachedSubtree() {
		clearListeners(this)
		// Inline descendants are logical children, not native layout children.
		for (const child of this.children) child.destroyDetachedSubtree()
		if (!this._renderable.isDestroyed) this._renderable.destroyRecursively()
	}

	before(...nodes: TUINode[]) {
		const parent = this.parentNode
		if (parent) for (const node of nodes) parent.insertBefore(node, this)
	}

	after(...nodes: TUINode[]) {
		const parent = this.parentNode
		const anchor = this.nextSibling
		if (parent) for (const node of nodes) parent.insertBefore(node, anchor)
	}

	replaceWith(...nodes: TUINode[]) {
		this.before(...nodes)
		if (!nodes.includes(this)) this.remove()
	}

	get childNodes() {
		return this.children
	}
	get isConnected(): boolean {
		return this._renderable === globalRenderer?.root || !!this.parentNode?.isConnected
	}
	get previousSibling(): TUINode | null {
		const siblings = this.parentNode?.children ?? []
		return siblings[siblings.indexOf(this) - 1] ?? null
	}

	cloneNode(deep: boolean = false): TUINode {
		return cloneSnapshot(this.getSnapshot(), deep)
	}

	private getSnapshot(): TemplateSnapshot {
		if (this._renderable.isDestroyed && this.snapshot) return this.snapshot
		return (this.snapshot = {
			tag: this.tag,
			text: this.nodeValue ?? '',
			attributes: this instanceof TUIElement ? { ...this._attributes } : {},
			children: this.children.map((child) => child.getSnapshot()),
		})
	}

	/** Propagate fg/bg styling from this node to child text renderables */
	protected _propagateTextStyles(childRenderable: Renderable) {
		if (!(this instanceof TUIElement)) return
		const parentFg = (this as TUIElement)._getProp('fg')
		const parentBg = (this as TUIElement)._getProp('bg')

		if ((parentFg || parentBg) && childRenderable instanceof TextRenderable) {
			const rootNode = (childRenderable as TextRenderable).textNode
			if (rootNode) {
				if (parentFg) rootNode.fg = parentFg
				if (parentBg) rootNode.bg = parentBg
			}
		}
	}
}

function cloneSnapshot(snapshot: TemplateSnapshot, deep: boolean): TUINode {
	const cloned =
		snapshot.tag === '#text'
			? document.createTextNode(snapshot.text)
			: snapshot.tag === '#comment'
				? document.createComment('')
				: snapshot.tag === '#fragment'
					? document.createDocumentFragment()
					: document.createElement(snapshot.tag)
	if (cloned instanceof TUIElement) {
		for (const [key, value] of Object.entries(snapshot.attributes))
			cloned.setAttribute(key, value)
	}
	if (deep) {
		for (const child of snapshot.children) cloned.appendChild(cloneSnapshot(child, true))
	}
	return cloned
}

// TypeScript interface for generated properties
export interface TUIElement {
	innerHTML: string
	innerText: string
	className: string
	id: string
	value: string
	checked: boolean
	selected: boolean
	disabled: boolean
	name: string
	type: string
	alt: string
	src: string
	height: string
	multiple: boolean
	files: string[] | null
	form: string | null
	dir: string
	currentTime: number
	readonly duration: number
	readonly ended: boolean
	paused: boolean
	muted: boolean
	volume: number
	playbackRate: number
	readonly seeking: boolean
	readonly readyState: number
}

// Element class - adds element-specific operations
export class TUIElement extends TUINode {
	_attributes: Record<string, any> = {}
	private defaults = new Map<string, any>()
	private writableProps = new Map<string, string>()
	// Element properties generated below via Object.defineProperty

	// classList special handling
	get classList(): TUIDOMTokenList {
		const self = this
		return {
			add(...tokens: string[]) {
				const classes = (self.className || '').split(' ').filter(Boolean)
				const set = new Set([...classes, ...tokens])
				self.className = Array.from(set).join(' ')
			},
			remove(...tokens: string[]) {
				const classes = (self.className || '').split(' ').filter(Boolean)
				const set = new Set(classes)
				tokens.forEach((t) => set.delete(t))
				self.className = Array.from(set).join(' ')
			},
			contains(token: string) {
				const classes = (self.className || '').split(' ').filter(Boolean)
				return classes.includes(token)
			},
		}
	}

	private styleValues: Record<string, any> = {}
	get style(): any {
		const self = this
		return new Proxy(this.styleValues, {
			get(target, key: string) {
				if (key === 'setProperty')
					return (name: string, value: any) => self.setStyle(name, value)
				if (key === 'removeProperty')
					return (name: string) => self.setStyle(name, undefined)
				return target[key]
			},
			set(_target, key: string, value) {
				self.setStyle(key, value)
				return true
			},
		})
	}
	private setStyle(name: string, value: any) {
		const key = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
		this.styleValues[name] = value
		this._setProp(key, value)
	}
	set style(value: Record<string, any>) {
		if (typeof value !== 'object' || value === null)
			throw new Error('Use an OpenTUI style object, not CSS text')
		for (const key of Object.keys(this.styleValues))
			if (!(key in value)) this.setStyle(key, undefined)
		for (const [key, item] of Object.entries(value)) this.setStyle(key, item)
	}

	// Element methods
	setAttribute(name: string, value: any) {
		this._attributes[name.toLowerCase()] = value
		this._setProp(name, value)
	}

	setAttributeNS(_namespace: string, name: string, value: any) {
		this.setAttribute(name, value)
	}

	getAttribute(name: string): any {
		return this._attributes[name.toLowerCase()] ?? null
	}

	hasAttribute(name: string): boolean {
		return Object.hasOwn(this._attributes, name.toLowerCase())
	}

	removeAttribute(name: string) {
		delete this._attributes[name.toLowerCase()]
		this._setProp(name, undefined)
	}

	addEventListener(
		event: string,
		handler: EventListenerOrEventListenerObject | null,
		options: boolean | AddEventListenerOptions = {}
	) {
		addListener(this, event, handler, options)
	}
	removeEventListener(
		event: string,
		handler: EventListenerOrEventListenerObject | null,
		options: boolean | EventListenerOptions = {}
	) {
		removeListener(this, event, handler, options)
	}
	dispatchEvent(event: Event): boolean {
		return dispatch(this, event)
	}

	constructor(renderable: Renderable, tag = '') {
		super(renderable, tag)
		for (
			let prototype = Object.getPrototypeOf(renderable);
			prototype;
			prototype = Object.getPrototypeOf(prototype)
		) {
			for (const [name, descriptor] of Object.entries(
				Object.getOwnPropertyDescriptors(prototype)
			)) {
				if (descriptor.set) this.writableProps.set(name.toLowerCase(), name)
			}
		}
		for (const name of this.writableProps.values()) {
			if (!(name in this))
				Object.defineProperty(this, name, {
					configurable: true,
					get: () => this._getProp(name),
					set: (value) => this._setProp(name, value),
				})
		}
		const dispatch = (type: string, detail: any) => {
			// Core already bubbles mouse events. Only their originating wrapper dispatches.
			if (detail?.target) {
				let target: TUINode | null = wrap(detail.target)
				while (target && !(target instanceof TUIElement)) target = target.parentNode
				if (target !== this) return false
			}
			if (type === 'mousedown') pointerDown = detail?.button === 0 ? this : null
			const event = new Event(type, { bubbles: true, cancelable: true })
			Object.defineProperty(event, 'detail', { value: detail })
			if (!this.dispatchEvent(event)) detail?.preventDefault?.()
			return true
		}
		for (const [event, callback] of Object.entries(EVENT_TO_CALLBACK)) {
			if (event === 'click') continue
			;(renderable as any)[callback] = (detail: any) => {
				const handled = dispatch(event, detail)
				if (handled && event === 'mousedrag') pointerDown = null
				if (handled && event === 'mouseup') {
					const clicked = pointerDown === this && detail?.button === 0
					pointerDown = null
					if (clicked) dispatch('click', detail)
				}
			}
		}
		for (const event of [
			'input',
			'change',
			'focus',
			'blur',
			'selectionChanged',
			'itemSelected',
		])
			renderable.on(event, (...detail) =>
				dispatch(event, detail.length === 1 ? detail[0] : detail)
			)
		if (renderable instanceof InputRenderable)
			renderable.on('enter', (value) => dispatch('submit', value))
	}

	focus() {
		;(this._renderable as any).focus?.()
	}

	blur() {
		this._renderable.blur()
	}

	scroll(options: { top?: number; left?: number } = {}) {
		if (!(this._renderable instanceof ScrollBoxRenderable))
			throw new Error('scroll() requires a scrollbox element')
		this._renderable.scrollTo({
			x: options.left ?? this._renderable.scrollLeft,
			y: options.top ?? this._renderable.scrollTop,
		})
	}

	getBoundingClientRect() {
		const { x, y, width, height } = this._renderable
		return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height }
	}

	// Helper methods
	private _props: Record<string, any> | undefined

	public _getProp(name: string): any {
		name =
			this.writableProps.get(name.toLowerCase()) ??
			CANONICAL_MAPPINGS.get(name.toLowerCase()) ??
			name
		// Check if this property maps to an actual Renderable property
		if (DIRECT_MAPPINGS.has(name) || this.writableProps.has(name.toLowerCase())) {
			return (this._renderable as any)[name]
		}

		// Check if this needs special name mapping
		const mappedKey = SPECIAL_MAPPINGS[name]
		if (mappedKey) {
			return (this._renderable as any)[mappedKey]
		}

		// Fallback to stub storage
		return this._props?.[name]
	}

	public _setProp(name: string, value: any) {
		name =
			this.writableProps.get(name.toLowerCase()) ??
			CANONICAL_MAPPINGS.get(name.toLowerCase()) ??
			name
		// Special handling for 'focused' - call focus() instead of setting property
		if (name === 'focused') {
			if (value !== false && value != null) {
				this._renderable.focus?.()
			} else if (this._renderable.focused) {
				this._renderable.blur?.()
			}
			return
		}

		// Check if this property maps to an actual Renderable property
		if (DIRECT_MAPPINGS.has(name) || this.writableProps.has(name.toLowerCase())) {
			if (!this.defaults.has(name)) this.defaults.set(name, (this._renderable as any)[name])
			if (value === '' && typeof this.defaults.get(name) === 'boolean') value = true
			;(this._renderable as any)[name] = value
			if (name === 'fg' || name === 'bg')
				for (const child of this.children) this._propagateTextStyles(child._renderable)
			this.refreshText()
			return
		}

		// Check if this needs special name mapping
		const mappedKey = SPECIAL_MAPPINGS[name]
		if (mappedKey) {
			;(this._renderable as any)[mappedKey] = value
			return
		}

		if (name === 'style') {
			this.style = value ?? {}
			return
		}
		// Fallback to stub storage for properties with no terminal equivalent
		if (!this._props) this._props = {}
		this._props[name] = value
		this.refreshText()
	}
}

// ============================================================================
// Element property generation
// ============================================================================

type PropConfig = { key?: string; default?: unknown; writable?: boolean }

const ELEMENT_PROPS: Record<string, PropConfig> = {
	innerHTML: { default: '' },
	innerText: { default: '' },
	className: { key: 'class', default: '' },
	id: { default: '' },
	value: { default: '' },
	checked: { default: false },
	selected: { default: false },
	disabled: { default: false },
	name: {},
	type: {},
	alt: {},
	src: {},
	height: {},
	multiple: {},
	files: {},
	form: { writable: false },
	dir: {},
	currentTime: { default: 0 },
	duration: { default: 0, writable: false },
	ended: { default: false, writable: false },
	paused: { default: false },
	muted: { default: false },
	volume: { default: 1 },
	playbackRate: { default: 1 },
	seeking: { default: false, writable: false },
	readyState: { default: 0, writable: false },
}

// Generate properties at module load
for (const [prop, config] of Object.entries(ELEMENT_PROPS)) {
	const key = config.key || prop
	const defaultValue = config.default
	const writable = config.writable !== false

	Object.defineProperty(TUIElement.prototype, prop, {
		get(this: TUIElement) {
			return this._getProp(key) ?? defaultValue
		},
		set: writable
			? function (this: TUIElement, v) {
					this._setProp(key, v)
				}
			: undefined,
		enumerable: true,
		configurable: true,
	})
}

// Helpers
const wrappers = new WeakMap<Renderable, TUINode>()
export function wrap(r: Renderable): TUINode {
	return (
		wrappers.get(r) ??
		(r instanceof TextRenderable ? new TUINode(r, '#text') : new TUIElement(r, 'div'))
	)
}

export function unwrap(node: TUINode | Renderable): Renderable {
	return node instanceof TUINode ? node._renderable : node
}

// ============================================================================
// Document API
// ============================================================================

const ELEMENT_MAP: Record<string, any> = {
	div: BoxRenderable,
	span: BoxRenderable,
	p: BoxRenderable,
	section: BoxRenderable,
	article: BoxRenderable,
	main: BoxRenderable,
	header: BoxRenderable,
	footer: BoxRenderable,
	nav: BoxRenderable,
	box: BoxRenderable,
	text: TextRenderable,
	b: BoxRenderable,
	strong: BoxRenderable,
	i: BoxRenderable,
	em: BoxRenderable,
	u: BoxRenderable,
	a: BoxRenderable,
	br: BoxRenderable,
	input: InputRenderable,
	textarea: TextareaRenderable,
	scrollbox: ScrollBoxRenderable,
	select: SelectRenderable,
	tabselect: TabSelectRenderable,
	asciifont: ASCIIFontRenderable,
	code: CodeRenderable,
	diff: DiffRenderable,
}

let idCounter = 0
function nextId(tag: string): string {
	return `${tag}-${++idCounter}`
}

class TUIDocument {
	addEventListener() {}
	removeEventListener() {}
	private _create<T extends Renderable>(
		Class: new (...args: any[]) => T,
		tag: string,
		props: any = {}
	): TUINode {
		const renderer = getRenderer()
		const renderable = new Class(renderer, { id: nextId(tag), ...props })
		return tag === '#text' || tag === '#comment' || tag === '#fragment'
			? new TUINode(renderable, tag)
			: new TUIElement(renderable, tag)
	}

	createElementNS(_namespace: string, tag: string): TUIElement {
		return this.createElement(tag)
	}

	createElement(tag: string): TUIElement {
		const RenderableClass = ELEMENT_MAP[tag]
		if (!RenderableClass)
			throw new Error(
				`Unknown terminal element <${tag}>. Register custom renderables with extend().`
			)
		return this._create(RenderableClass, tag) as TUIElement
	}

	createTextNode(text: string | number): TUINode {
		return this._create(TextRenderable, '#text', {
			content: String(text),
			visible: String(text).length !== 0,
		})
	}

	createComment(text: string): TUINode {
		return this._create(BoxRenderable, '#comment', { visible: false })
	}

	createDocumentFragment(): TUINode {
		return this._create(BoxRenderable, '#fragment', { visible: false })
	}

	importNode(node: TUINode, _deep?: boolean): TUINode {
		return node.cloneNode(_deep)
	}

	querySelector(selector: string): TUINode | null {
		if (!/^(#[\w-]+|[a-z][a-z0-9]*)$/.test(selector))
			throw new Error('Only tag and #id selectors are supported')
		const find = (node: TUINode): TUINode | null => {
			if (
				selector.startsWith('#')
					? node instanceof TUIElement && node.id === selector.slice(1)
					: node.tag === selector
			)
				return node
			return node.children.map(find).find(Boolean) ?? null
		}
		return this.body ? find(this.body) : null
	}

	get activeElement(): TUINode | null {
		const find = (node: TUINode): TUINode | null =>
			node._renderable.focused ? node : (node.children.map(find).find(Boolean) ?? null)
		return this.body ? find(this.body) : null
	}

	private _getRoot(): TUINode | null {
		const root = globalRenderer?.root
		return root ? wrap(root) : null
	}

	get body(): TUINode | null {
		return this._getRoot()
	}

	get head(): TUINode | null {
		return this._getRoot()
	}
}

export const document = new TUIDocument()

export type RenderableConstructor = new (context: any, options: any) => Renderable
export function extend(elements: Record<string, RenderableConstructor>) {
	for (const [name, Constructor] of Object.entries(elements)) ELEMENT_MAP[name] = Constructor
}
export function getComponentCatalogue(): Readonly<Record<string, RenderableConstructor>> {
	return { ...ELEMENT_MAP }
}
