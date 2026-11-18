import sveltePlugin from '../src/svelte-plugin'
const result = await Bun.build({
	entrypoints: [
		'src/index.ts',
		'src/dom.ts',
		'src/keyboard.ts',
		'src/hooks.ts',
		'src/preload.ts',
		'src/svelte-plugin.ts',
	],
	target: 'bun',
	plugins: [sveltePlugin],
	packages: 'external',
	outdir: 'dist',
	splitting: true,
	sourcemap: 'external',
})
if (!result.success) throw new AggregateError(result.logs, 'Adapter build failed')
