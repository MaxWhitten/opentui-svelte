<script lang="ts">
 import { onDestroy } from 'svelte'
 let { cleanup = () => {} }: { cleanup?: () => void } = $props()
 let items = $state(['one', 'two', 'three'])
 let value = $state('initial')
 let count = $state(0)
 onDestroy(() => cleanup())
 export function reorder() { items = ['three', 'one', 'four'] }
 export function clear() { items = [] }
 export function reset() { value = 'reset' }
</script>
<div flexDirection="column">
 <input bind:value focused />
 <div>{value}</div>
 <!-- svelte-ignore a11y_no_static_element_interactions (terminal mouse fixture) -->
 <box onmousedown={() => count++} width={20} height={1}>Count: {count}</box>
 {#each items as item (item)}<div>{item}</div>{/each}
</div>
