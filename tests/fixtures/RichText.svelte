<script lang="ts">
 let name = $state('world')
 let show = $state(true)
 export function update() { name = 'Svelte'; show = false }
</script>
<text>Hello <b>{name}</b>{#if show}<span fg="red">!</span>{/if}<br />next line</text>
