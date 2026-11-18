<script lang="ts">
 import { onDestroy } from 'svelte'
 let { cleanup = () => {} }: {cleanup?: () => void} = $props()
 onDestroy(() => cleanup())
 $effect(() => { throw new Error('intentional mount failure') })
</script>
<div>never mounted</div>
