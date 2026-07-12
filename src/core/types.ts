/** An event map — each event name maps to the argument tuple its listeners receive. */
export type EventMap = Record<string, readonly unknown[]>

/** A listener for one event's argument tuple. */
export type EmitterHandler<TArgs extends readonly unknown[]> = (...args: TArgs) => void

/**
 * The emitter's OWN listener-error handler (AGENTS §13) — invoked when a listener
 * throws during `emit`, with the caught error and the (stringified) event name.
 *
 * @remarks
 * This is machinery, NOT a domain event: a throwing listener is isolated by the
 * emitter and its error routed here, never onto the entity's `EventMap`. An entity
 * exposes it by threading `EmitterOptions.error` (beside `on`) into its `#emitter`.
 * The handler runs inside its own try/catch, so a throwing error-handler is swallowed
 * (anti-recursion) — it can neither escape nor re-enter the emit loop.
 */
export type EmitterErrorHandler = (error: unknown, event: string) => void

/**
 * Initial event listeners for an emitter — the reserved `on` option (AGENTS §8):
 * a partial map of event name to its handler, wired at construction.
 */
export type EmitterHooks<TMap extends EventMap> = {
	readonly [K in keyof TMap]?: EmitterHandler<TMap[K]>
}

/** Options for `createEmitter` / the `Emitter` constructor. */
export interface EmitterOptions<TMap extends EventMap> {
	readonly on?: EmitterHooks<TMap>
	/**
	 * The emitter's listener-error handler (AGENTS §13) — a throw from ANY listener
	 * during `emit` is routed here (with the error + the event name) instead of being
	 * rethrown. Omit it and a listener throw is swallowed silently.
	 */
	readonly error?: EmitterErrorHandler
}

/**
 * A typed synchronous event emitter — the foundational observable primitive
 * (AGENTS §13). Entities OWN one as `#emitter` and expose `readonly emitter`;
 * they never inherit from it.
 */
export interface EmitterInterface<TMap extends EventMap> {
	readonly destroyed: boolean
	on<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	once<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	off<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	emit<K extends keyof TMap>(event: K, ...args: TMap[K]): void
	count(event?: keyof TMap): number
	clear(event?: keyof TMap): void
	destroy(): void
}
