<script lang="ts">
 import HookChild from './HookChild.svelte'
 let { record, cancelImmediately = false }: { record: (event: string) => void; cancelImmediately?: boolean } = $props()
 let visible = $state(true)
 export function toggle() { visible = !visible }
</script>
{#if visible}<HookChild {record} {cancelImmediately} />{/if}
