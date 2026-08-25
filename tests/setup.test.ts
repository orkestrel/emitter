import { describe, expect, it } from 'vitest'
import { isBrowserVuePath } from './setup.js'

describe('isBrowserVuePath', () => {
	it('accepts a browser Vue path under every separator family', () => {
		expect(isBrowserVuePath('app/browser/component.vue')).toBe(true)
		expect(isBrowserVuePath('app\\browser\\component.vue')).toBe(true)
	})

	it('refuses a sibling environment and a prefix lookalike', () => {
		expect(isBrowserVuePath('app/server/component.vue')).toBe(false)
		expect(isBrowserVuePath('app/browserish/component.vue')).toBe(false)
	})
})
