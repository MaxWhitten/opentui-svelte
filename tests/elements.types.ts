import type { BoxOptions } from '@opentui/core'
import type { TerminalProps } from '../src/elements'

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
void [valid, invalidDirection, invalidProperty, invalidStyle]
