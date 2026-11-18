import { file, Transpiler, type BunPlugin } from 'bun'
import { compile, compileModule } from 'svelte/compiler'

/** Compile components and shared rune modules with the same client runtime. */
export function createSveltePlugin(): BunPlugin {
	return {
		name: 'opentui-svelte',
		setup(build) {
			build.onLoad({ filter: /\.svelte(?:\.[jt]s)?$/ }, async ({ path }) => {
				let source = await file(path).text()
				const module = /\.svelte\.[jt]s$/.test(path)
				if (path.endsWith('.ts'))
					source = new Transpiler({ loader: 'ts' }).transformSync(source)
				const result = module
					? compileModule(source, { filename: path, generate: 'client', dev: false })
					: compile(source, {
							filename: path,
							generate: 'client',
							fragments: 'tree',
							dev: false,
							css: 'external',
						})
				if ('css' in result && result.css?.code) {
					throw new Error(
						`${path}: CSS stylesheets are not supported in a terminal. Use OpenTUI properties.`
					)
				}
				for (const warning of result.warnings) {
					if (warning.code.startsWith('a11y_')) continue
					console.warn(`${path}:${warning.start?.line ?? 1}: ${warning.message}`)
				}
				const map = Buffer.from(JSON.stringify(result.js.map)).toString('base64')
				return {
					contents: `${result.js.code}\n//# sourceMappingURL=data:application/json;base64,${map}`,
					loader: 'js',
				}
			})
		},
	}
}
export default createSveltePlugin()
