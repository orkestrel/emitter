import type { EmitterInterface, EmitterOptions, EventMap } from './types.js'
import { Emitter } from './Emitter.js'

/**
 * Creates a typed event emitter — the foundational observable primitive.
 *
 * @remarks
 * Prefer this over `new Emitter(...)` at call sites that only need the interface.
 * Entities that OWN an emitter construct `new Emitter(...)` for their `#emitter`
 * field directly; this factory is the standalone entry point.
 *
 * @typeParam TMap - The event map: each event name to its listener argument tuple.
 * @param options - Optional `on` hooks (initial listeners wired at construction) and
 *   an optional `error` handler for a listener's throw
 * @returns A typed {@link EmitterInterface}
 *
 * @example
 * ```ts
 * import { createEmitter } from '@src/core'
 *
 * type ClockEventMap = {
 * 	tick: readonly [at: number]
 * }
 *
 * const clock = createEmitter<ClockEventMap>({ on: { tick: (at) => log(at) } })
 * clock.emit('tick', Date.now())
 * ```
 */
export function createEmitter<TMap extends EventMap>(
	options?: EmitterOptions<TMap>,
): EmitterInterface<TMap> {
	return new Emitter(options)
}
