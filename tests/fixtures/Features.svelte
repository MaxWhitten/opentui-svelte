<script lang="ts">
 import { onMount } from 'svelte'
 let { record = (_event: string) => {} } = $props()
 let label = $state('before')
 let properties = $state<Record<string, unknown>>({title: 'first', paddingLeft: 2})
 let tag = $state('box')
 let resolve!: (value: string) => void
 const pending = new Promise<string>(done => { resolve = done })
 function observe(_node: unknown, value: string) {
  record(`action:${value}`)
  return {update(next: string) {record(`update:${next}`)}, destroy() {record('action:destroy')}}
 }
 onMount(() => {record('mount'); return () => record('mount:destroy')})
 export function update() {label = 'after'; properties = {title: 'second'}; tag = 'section'; resolve('resolved')}
</script>
<div use:observe={label} {...properties}>
 <svelte:element this={tag}>{label}</svelte:element>
 {#await pending}<div>pending</div>{:then value}<div>{value}</div>{/await}
</div>
