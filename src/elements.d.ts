import type { HTMLAttributes } from 'svelte/elements'
import type {
	BoxOptions,
	ScrollBoxOptions,
	ASCIIFontOptions,
	SelectRenderableOptions,
	TabSelectOption,
	TabSelectRenderableOptions,
} from '@opentui/core'

/** Opt-in terminal intrinsic types: add this file to compilerOptions.types. */
export type TerminalProps<Options> = Omit<HTMLAttributes<HTMLElement>, keyof Options | 'style'> &
	Partial<Options> &
	LowercaseProps<Options> & { focused?: boolean; style?: Partial<Options> }

/** Native selection events carry OpenTUI's index and option in detail. */
export type SelectionEvent<Option> = Event & { readonly detail: [index: number, option: Option | null] }
export type TabSelectProps = Omit<TerminalProps<TabSelectRenderableOptions>, 'onchange' | 'onselect'> & {
	onchange?: (event: SelectionEvent<TabSelectOption>) => void
	onselect?: (event: SelectionEvent<TabSelectOption>) => void
}

declare module 'svelte/elements' {
	// Svelte already defines the HTML select tag; augment only its native-only props.
	interface HTMLSelectAttributes {
		options?: SelectRenderableOptions['options']
		selectedIndex?: number
		selectedindex?: number
	}
	interface SvelteHTMLElements {
		box: TerminalProps<BoxOptions>
		scrollbox: TerminalProps<ScrollBoxOptions>
		asciifont: TerminalProps<ASCIIFontOptions>
		tabselect: TabSelectProps
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
