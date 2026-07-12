import { Emitter } from '@src/core'
import { describe, expect, it } from 'vitest'
import { createErrorRecorder, createRecorder } from '../../../setup.js'

// Emitter — the foundational synchronous, listener-isolating observable primitive
// (AGENTS §13). Real listeners (recorders from tests/setup.ts), no mocks: assert
// observable behavior — what fired, in what order, how many remain. The event map
// is a `type` alias (not `interface extends EventMap`): a type-literal satisfies the
// `EventMap` constraint structurally without inheriting its index signature, which
// keeps `on`-hook literals precisely typed (§4.5 — `EventMap` is a `type` kind).
type TestEventMap = {
	tick: readonly [count: number]
	named: readonly [name: string, age: number]
	signal: readonly []
}

describe('Emitter', () => {
	it('on/emit — a listener receives the exact typed args', () => {
		const emitter = new Emitter<TestEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.on('tick', tick.handler)

		emitter.emit('tick', 7)

		expect(tick.calls).toEqual([[7]])
	})

	it('on/emit — multiple listeners fire in registration order', () => {
		const emitter = new Emitter<TestEventMap>()
		const order: string[] = []
		emitter.on('signal', () => order.push('first'))
		emitter.on('signal', () => order.push('second'))
		emitter.on('signal', () => order.push('third'))

		emitter.emit('signal')

		expect(order).toEqual(['first', 'second', 'third'])
	})

	it('emit — passes every labeled tuple element to the listener', () => {
		const emitter = new Emitter<TestEventMap>()
		const named = createRecorder<readonly [string, number]>()
		emitter.on('named', named.handler)

		emitter.emit('named', 'Ada', 36)

		expect(named.calls).toEqual([['Ada', 36]])
	})

	it('once — fires exactly once, then auto-removes', () => {
		const emitter = new Emitter<TestEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.once('tick', tick.handler)

		emitter.emit('tick', 1)
		emitter.emit('tick', 2)
		emitter.emit('tick', 3)

		expect(tick.calls).toEqual([[1]])
		expect(emitter.count('tick')).toBe(0)
	})

	it('off — removes a specific handler so later emits skip it', () => {
		const emitter = new Emitter<TestEventMap>()
		const kept = createRecorder<readonly [number]>()
		const removed = createRecorder<readonly [number]>()
		emitter.on('tick', kept.handler)
		emitter.on('tick', removed.handler)

		emitter.off('tick', removed.handler)
		emitter.emit('tick', 5)

		expect(kept.calls).toEqual([[5]])
		expect(removed.count).toBe(0)
	})

	it('off — by the original handler also removes a once wrapper', () => {
		const emitter = new Emitter<TestEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.once('tick', tick.handler)

		emitter.off('tick', tick.handler)
		emitter.emit('tick', 9)

		expect(tick.count).toBe(0)
		expect(emitter.count('tick')).toBe(0)
	})

	it('count — totals across events, and reports one event', () => {
		const emitter = new Emitter<TestEventMap>()
		emitter.on('tick', () => {})
		emitter.on('tick', () => {})
		emitter.on('signal', () => {})

		expect(emitter.count('tick')).toBe(2)
		expect(emitter.count('signal')).toBe(1)
		expect(emitter.count()).toBe(3)
	})

	it('clear — drops one event, leaving the others', () => {
		const emitter = new Emitter<TestEventMap>()
		emitter.on('tick', () => {})
		emitter.on('signal', () => {})

		emitter.clear('tick')

		expect(emitter.count('tick')).toBe(0)
		expect(emitter.count('signal')).toBe(1)
		expect(emitter.count()).toBe(1)
	})

	it('clear — with no event drops every listener', () => {
		const emitter = new Emitter<TestEventMap>()
		emitter.on('tick', () => {})
		emitter.on('signal', () => {})

		emitter.clear()

		expect(emitter.count()).toBe(0)
		expect(emitter.destroyed).toBe(false)
	})

	it('destroy — clears listeners, flips destroyed, and makes on/emit no-ops', () => {
		const emitter = new Emitter<TestEventMap>()
		const tick = createRecorder<readonly [number]>()
		emitter.on('tick', tick.handler)

		emitter.destroy()

		expect(emitter.destroyed).toBe(true)
		expect(emitter.count()).toBe(0)

		emitter.on('tick', tick.handler)
		emitter.emit('tick', 1)
		expect(tick.count).toBe(0)
		expect(emitter.count()).toBe(0)
	})

	it('destroy — is idempotent', () => {
		const emitter = new Emitter<TestEventMap>()
		emitter.destroy()
		emitter.destroy()

		expect(emitter.destroyed).toBe(true)
		expect(emitter.count()).toBe(0)
	})

	it('initial on hooks fire on the matching event', () => {
		const tick = createRecorder<readonly [number]>()
		const signal = createRecorder<readonly []>()
		const emitter = new Emitter<TestEventMap>({
			on: { tick: tick.handler, signal: signal.handler },
		})

		emitter.emit('tick', 4)
		emitter.emit('signal')

		expect(tick.calls).toEqual([[4]])
		expect(signal.count).toBe(1)
	})

	it('listener isolation — a throwing listener does not stop its siblings; the throw routes to the error handler, not rethrown', () => {
		const errors = createErrorRecorder()
		const emitter = new Emitter<TestEventMap>({ error: errors.handler })
		const before = createRecorder<readonly [number]>()
		const after = createRecorder<readonly [number]>()
		const failure = new Error('listener boom')
		emitter.on('tick', before.handler)
		emitter.on('tick', () => {
			throw failure
		})
		emitter.on('tick', after.handler)

		// emit does NOT rethrow — both siblings still ran, and the error went to the handler.
		expect(() => emitter.emit('tick', 2)).not.toThrow()
		expect(before.calls).toEqual([[2]])
		expect(after.calls).toEqual([[2]])
		expect(errors.calls).toEqual([[failure, 'tick']])
	})

	it('with no error handler, a listener throw is swallowed silently', () => {
		const emitter = new Emitter<TestEventMap>()
		const after = createRecorder<readonly [number]>()
		emitter.on('tick', () => {
			throw new Error('boom')
		})
		emitter.on('tick', after.handler)

		expect(() => emitter.emit('tick', 1)).not.toThrow()
		expect(after.calls).toEqual([[1]])
	})

	it('routes EVERY throwing listener, not just the first', () => {
		const errors = createErrorRecorder()
		const emitter = new Emitter<TestEventMap>({ error: errors.handler })
		const first = new Error('first')
		const second = new Error('second')
		emitter.on('tick', () => {
			throw first
		})
		emitter.on('tick', () => {
			throw second
		})

		emitter.emit('tick', 3)

		expect(errors.calls).toEqual([
			[first, 'tick'],
			[second, 'tick'],
		])
	})

	it('a throwing error handler is swallowed — no recursion, no escape', () => {
		const errors = createErrorRecorder()
		const emitter = new Emitter<TestEventMap>({
			error: (error, event) => {
				errors.handler(error, event)
				throw new Error('handler bug')
			},
		})
		const failure = new Error('listener boom')
		emitter.on('tick', () => {
			throw failure
		})

		// Neither the listener throw nor the handler throw escapes; the handler fired exactly once.
		expect(() => emitter.emit('tick', 4)).not.toThrow()
		expect(errors.calls).toEqual([[failure, 'tick']])
	})

	it('empty-tuple events work as pure signals', () => {
		const emitter = new Emitter<TestEventMap>()
		const signal = createRecorder<readonly []>()
		emitter.on('signal', signal.handler)

		emitter.emit('signal')
		emitter.emit('signal')

		expect(signal.count).toBe(2)
		expect(signal.calls).toEqual([[], []])
	})
})
