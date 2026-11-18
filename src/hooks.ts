import { readable } from 'svelte/store'
import type { PasteEvent } from '@opentui/core'
import { getRenderer } from './dom'

export const useRenderer = getRenderer

/** Call in a Svelte $effect and return the unsubscribe function. */
export function usePaste(handler: (event: PasteEvent) => void): () => void {
	const input = getRenderer().keyInput
	input.on('paste', handler)
	return () => {
		input.off('paste', handler)
	}
}

/** Call in a Svelte $effect and return the unsubscribe function. */
export function onResize(handler: (width: number, height: number) => void): () => void {
	const renderer = getRenderer()
	renderer.on('resize', handler)
	return () => {
		renderer.off('resize', handler)
	}
}

/** A Svelte store; $dimensions subscriptions are disposed by Svelte. */
export function useTerminalDimensions() {
	const renderer = getRenderer()
	const dimensions = () => ({ width: renderer.terminalWidth, height: renderer.terminalHeight })
	return readable(dimensions(), (set) => {
		const update = () => set(dimensions())
		update()
		renderer.on('resize', update)
		return () => {
			renderer.off('resize', update)
		}
	})
}
