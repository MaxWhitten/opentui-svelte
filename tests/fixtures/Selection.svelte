<script lang="ts">
 import type { TabSelectOption } from '@opentui/core'
 import type { SelectionEvent } from '../../src/elements'
 let { record }: { record: (kind: string, detail: unknown) => void } = $props()
 const options = [{ name: 'first', description: '' }, { name: 'second', description: '' }]
 let tab = $state(false)
 export function toggle() { tab = !tab }
 const onTabChange = (event: SelectionEvent<TabSelectOption>) => record('change', event.detail)
 const onTabSelect = (event: SelectionEvent<TabSelectOption>) => record('select', event.detail)
 const onChange = (event: Event) => record('change', 'detail' in event ? event.detail : undefined)
 const onSelect = (event: Event) => record('select', 'detail' in event ? event.detail : undefined)
</script>
{#if tab}
 <tabselect {options} focused onchange={onTabChange} onselect={onTabSelect}></tabselect>
{:else}
 <select {options} focused onchange={onChange} onselect={onSelect}></select>
{/if}
