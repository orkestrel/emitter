import * as setup from './setup.js'
import { describe, expect, it } from 'vitest'

// tests/setup.test.ts — proves `tests/setup.ts`, `setupFiles[0]` for every Vitest project. The
// module exports only the fixtures the mirrored tests share and runs nothing when it loads.

describe('setup', () => {
	it('exports only the shared fixtures', () => {
		expect(Object.keys(setup)).toEqual(['receiveEvent'])
	})

	it('receives an event and returns nothing', () => {
		expect(setup.receiveEvent()).toBeUndefined()
	})
})
