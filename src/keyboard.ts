import { useSubscription } from './lifecycle.svelte'
import { getRenderer } from './dom'
import type { KeyEvent } from '@opentui/core'

export interface UseKeyboardOptions {
	/** Include release events - callback receives events with eventType: "release" */
	release?: boolean
}

/** Subscribe during component initialization; Svelte automatically removes listeners on teardown.
 * Also supports existing $effect callers and an optional explicit unsubscribe.
 */
export function useKeyboard(
	handler: (key: KeyEvent) => void,
	options: UseKeyboardOptions = {}
): () => void {
	const renderer = getRenderer()
	const keyInput = renderer.keyInput
	const release = options.release

	return useSubscription(() => {
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
	})
}
