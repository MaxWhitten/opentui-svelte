<script lang="ts">
 let value = $state(' ')
 let separator = $state(' ')
 export function update(next: string) { value = next }
 export function updateSeparator(next: string) { separator = next }
</script>

<box flexDirection="column" gap={0}>
 <box height={1}><text>first</text></box>
 {value}
 <box height={1}><text>second</text></box>
 <box flexDirection="row" gap={1}>
  <text>A</text>
  <text>B</text>
 </box>
 <text>inline <b>bold</b>{separator}<i>text</i></text>
</box>
