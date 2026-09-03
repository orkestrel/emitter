import { extractKeys } from '@src/core'
import { describe, expect, it } from 'vitest'

// extractKeys — the pure, testable leaf behind Emitter's `#wire`: the typed keys of a
// mapped object, narrowed back from `Object.keys`'s `string[]` widening.
describe('extractKeys', () => {
	it('returns the own enumerable keys of a record, typed as its key union', () => {
		const hooks = { tick: () => {}, done: () => {} }

		expect(extractKeys(hooks)).toEqual(['tick', 'done'])
	})

	it('returns an empty array for an empty record', () => {
		expect(extractKeys({})).toEqual([])
	})

	it('excludes an inherited enumerable key', () => {
		const base = { inherited: () => {} }
		const hooks: { readonly tick: () => void } = { tick: () => {} }
		Object.setPrototypeOf(hooks, base)

		// The control: the inherited key is reachable, so a walk that included it would collect it.
		expect('inherited' in hooks).toBe(true)

		expect(extractKeys(hooks)).toEqual(['tick'])
	})
})
