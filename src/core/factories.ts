import type { EmitterInterface, EmitterOptions, EventMap } from './types.js'
import { Emitter } from './Emitter.js'

/**
 * Creates a typed synchronous event emitter and returns it as an `EmitterInterface<TMap>`,
 * wiring the initial `on` hooks and the `error` handler its options carry.
 *
 * @remarks
 * Entities that own an emitter construct `new Emitter(...)` for their `#emitter`
 * field directly; this factory is the standalone entry point.
 *
 * @typeParam TMap - The event map: each event name to its listener argument tuple.
 * @param options - Optional `on` hooks (initial listeners wired at construction) and
 *   an optional `error` handler for a listener's throw
 * @returns A typed {@link EmitterInterface}
 *
 * @example Standalone emitter
 * ```ts
 * import { createEmitter } from '@orkestrel/emitter'
 *
 * type DownloadEventMap = {
 * 	chunk: readonly [bytes: number]
 * 	done: readonly []
 * }
 *
 * const emitter = createEmitter<DownloadEventMap>()
 * emitter.on('chunk', (bytes) => accumulate(bytes))
 * emitter.once('done', () => finish())
 * emitter.emit('chunk', 1024)
 * emitter.emit('done')
 * ```
 */
export function createEmitter<TMap extends EventMap>(
	options?: EmitterOptions<TMap>,
): EmitterInterface<TMap> {
	return new Emitter(options)
}
