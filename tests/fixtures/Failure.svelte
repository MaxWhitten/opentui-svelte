<script>
 import { onDestroy } from 'svelte'
 let { cleanup = () => {} } = $props()
 onDestroy(() => cleanup())
 $effect(() => { throw new Error('intentional mount failure') })
</script>
<div>never mounted</div>
