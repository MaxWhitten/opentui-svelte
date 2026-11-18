<script lang="ts">
 import { createCounter } from './counter.svelte.ts'
 const counter = createCounter(2)
 export const increment = () => counter.increment()
</script>
<div>{counter.value}</div>
