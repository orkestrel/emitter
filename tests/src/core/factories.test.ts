import type { EmitterInterface } from '@src/core'
import { createEmitter } from '@src/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'

// The emitter factory — that `createEmitter` returns a working EmitterInterface.
// Full behavior (once/off/count/clear/destroy, isolation) lives in Emitter.test.ts;
// here we only assert the factory hands back a usable emitter and honors `on` hooks.
// Event map as a `type` alias (see Emitter.test.ts) so `on`-hook literals stay typed.
type ClockEventMap = {
	tick: readonly [at: number]
}

describe('createEmitter', () => {
	it('returns a working EmitterInterface (on → emit round-trip)', () => {
		const emitter = createEmitter<ClockEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.on('tick', tick.handler)

		emitter.emit('tick', 42)

		expect(tick.calls).toEqual([[42]])
		expect(emitter.destroyed).toBe(false)
	})

	it('honors initial on hooks', () => {
		const tick = createRecorder<readonly [number]>()
		const emitter = createEmitter<ClockEventMap>({ on: { tick: tick.handler } })

		emitter.emit('tick', 7)

		expect(tick.calls).toEqual([[7]])
	})

	it('works with no arguments', () => {
		const emitter = createEmitter<ClockEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.on('tick', tick.handler)

		emitter.emit('tick', 1)

		expect(tick.calls).toEqual([[1]])
		expect(emitter.destroyed).toBe(false)
	})

	it('return type matches EmitterInterface', () => {
		expectTypeOf(createEmitter<ClockEventMap>()).toEqualTypeOf<EmitterInterface<ClockEventMap>>()
	})
})
