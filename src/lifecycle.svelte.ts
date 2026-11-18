/** Own a native subscription with the calling component/effect's Svelte lifecycle. */
export function useSubscription(subscribe: () => () => void): () => void {
	let stopped = false
	let cleanup: (() => void) | undefined
	const unsubscribe = () => {
		const dispose = cleanup
		cleanup = undefined
		dispose?.()
	}
	$effect(() => {
		if (stopped) return
		cleanup = subscribe()
		return unsubscribe
	})
	return () => {
		stopped = true
		unsubscribe()
	}
}
