import type { HTMLAttributes } from 'svelte/elements'
import type {
	BoxOptions,
	ScrollBoxOptions,
	ASCIIFontOptions,
	TabSelectRenderableOptions,
} from '@opentui/core'

/** Opt-in terminal intrinsic types: add this file to compilerOptions.types. */
export type TerminalProps<Options> = Omit<HTMLAttributes<HTMLElement>, keyof Options | 'style'> &
	Partial<Options> & { focused?: boolean; style?: Partial<Options> }

declare module 'svelte/elements' {
	interface SvelteHTMLElements {
		box: TerminalProps<BoxOptions>
		scrollbox: TerminalProps<ScrollBoxOptions>
		asciifont: TerminalProps<ASCIIFontOptions>
		tabselect: TerminalProps<TabSelectRenderableOptions>
	}
}
