export function createCounter(initial: number) {
	let value = $state(initial)
	return {
		get value() {
			return value
		},
		increment() {
			value++
		},
	}
}
