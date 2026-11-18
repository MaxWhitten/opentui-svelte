import type { HTMLAttributes } from 'svelte/elements'
import type {
	BoxOptions,
	ScrollBoxOptions,
	ASCIIFontOptions,
	TabSelectRenderableOptions,
} from '@opentui/core'

/** Opt-in terminal intrinsic types: add this file to compilerOptions.types. */
export type TerminalProps<Options> = Omit<HTMLAttributes<HTMLElement>, keyof Options | 'style'> &
	Partial<Options> &
	LowercaseProps<Options> & { focused?: boolean; style?: Partial<Options> }

declare module 'svelte/elements' {
	interface SvelteHTMLElements {
		box: TerminalProps<BoxOptions>
		scrollbox: TerminalProps<ScrollBoxOptions>
		asciifont: TerminalProps<ASCIIFontOptions>
		tabselect: TerminalProps<TabSelectRenderableOptions>
	}
}

type Layout = Pick<
	BoxOptions,
	| 'flexDirection'
	| 'flexGrow'
	| 'flexShrink'
	| 'flexBasis'
	| 'flexWrap'
	| 'alignItems'
	| 'alignSelf'
	| 'justifyContent'
	| 'gap'
	| 'rowGap'
	| 'columnGap'
	| 'padding'
	| 'paddingX'
	| 'paddingY'
	| 'paddingTop'
	| 'paddingRight'
	| 'paddingBottom'
	| 'paddingLeft'
	| 'margin'
	| 'marginX'
	| 'marginY'
	| 'marginTop'
	| 'marginRight'
	| 'marginBottom'
	| 'marginLeft'
	| 'backgroundColor'
	| 'borderStyle'
	| 'borderColor'
	| 'titleAlignment'
>
type LowercaseProps<T> = { [K in keyof T as Lowercase<K & string>]?: T[K] }
type TerminalLayout = Layout &
	LowercaseProps<Layout> & {
		focused?: boolean
		width?: string | number | null
		height?: string | number | null
		fg?: import('@opentui/core').ColorInput
		bg?: import('@opentui/core').ColorInput
	}

declare module 'svelte/elements' {
	interface HTMLAttributes<T extends EventTarget> extends TerminalLayout {}
	interface SVGAttributes<T extends EventTarget> extends TerminalLayout {}
}
