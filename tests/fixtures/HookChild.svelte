<script lang="ts">
 import { untrack } from 'svelte'
 import { useKeyboard, usePaste, onResize } from '../../src'
 let { record, cancelImmediately = false }: { record: (event: string) => void; cancelImmediately?: boolean } = $props()
 const cancelKeyboard = useKeyboard(() => record('key'), {release: true})
 const cancelPaste = usePaste(() => record('paste'))
 const cancelResize = onResize(() => record('resize'))
 if (untrack(() => cancelImmediately)) { cancelKeyboard(); cancelPaste(); cancelResize() }
</script>
<div>subscribed</div>
