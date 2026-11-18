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
 <div onmousedown={() => count++} width={20} height={1}>Count: {count}</div>
 {#each items as item (item)}<div>{item}</div>{/each}
</div>
