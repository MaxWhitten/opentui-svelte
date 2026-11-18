<script lang="ts">
 let count = $state(0)
</script>
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (terminal mouse fixture) -->
<box onclick={() => count++}>Clicks: {count}</box>
