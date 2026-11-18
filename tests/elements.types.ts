import type { BoxOptions } from '@opentui/core'
import type { TabSelectProps, TerminalProps } from '../src/elements'

const valid: TerminalProps<BoxOptions> = {
	flexdirection: 'column',
	paddingLeft: 2,
	style: { border: true },
}
// @ts-expect-error invalid layout enums must not be widened to string
const invalidDirection: TerminalProps<BoxOptions> = { flexdirection: 'sideways' }
// @ts-expect-error typos must not be swallowed by a catch-all attribute type
const invalidProperty: TerminalProps<BoxOptions> = { widht: 10 }
// @ts-expect-error browser CSS strings are not native style objects
const invalidStyle: TerminalProps<BoxOptions> = { style: 'padding: 1px' }
const validTab: TabSelectProps = {
	options: [{ name: 'first', description: '' }],
	onchange: (event) => { const index: number = event.detail[0]; void index },
}
// @ts-expect-error native options need a name and description
const invalidTab: TabSelectProps = { options: [{ name: 'missing description' }] }
// @ts-expect-error selection detail index is a number
const invalidEvent: TabSelectProps = { onselect: (event) => { const index: string = event.detail[0]; void index } }
void [valid, invalidDirection, invalidProperty, invalidStyle, validTab, invalidTab, invalidEvent]
