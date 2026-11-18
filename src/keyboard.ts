import { getRenderer } from './dom'
import type { KeyEvent } from '@opentui/core'

export interface UseKeyboardOptions {
	/** Include release events - callback receives events with eventType: "release" */
	release?: boolean
}

/**
 * Subscribe to keyboard events in an OpenTUI Svelte app.
 *
 * Call inside a `$effect` so cleanup runs when the component is destroyed:
 *
 * ```svelte
 * $effect(() => {
 *     const cleanup = useKeyboard((key) => {
 *         if (key.name === 'tab') { ... }
 *     })
 *     return cleanup
 * })
 * ```
 */
export function useKeyboard(
	handler: (key: KeyEvent) => void,
	options: UseKeyboardOptions = {}
): () => void {
	const renderer = getRenderer()
	const keyInput = renderer.keyInput
	const release = options.release

	keyInput.on('keypress', handler)
	if (release) {
		keyInput.on('keyrelease', handler)
	}

	return () => {
		keyInput.off('keypress', handler)
		if (release) {
			keyInput.off('keyrelease', handler)
		}
	}
}
