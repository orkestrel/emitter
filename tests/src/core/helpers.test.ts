import { extractKeys } from '@src/core'
import { describe, expect, it } from 'vitest'

// extractKeys — the pure, testable leaf behind Emitter's `#wire` (AGENTS §5): the
// typed keys of a mapped object, narrowed back from `Object.keys`'s `string[]` widening.
describe('extractKeys', () => {
	it('returns the own enumerable keys of a record, typed as its key union', () => {
		const hooks = { tick: () => {}, done: () => {} }

		expect(extractKeys(hooks)).toEqual(['tick', 'done'])
	})

	it('returns an empty array for an empty record', () => {
		expect(extractKeys({})).toEqual([])
	})
})
