/** Maps each event name to the argument tuple its listeners receive. */
export type EventMap = Record<string, readonly unknown[]>

/** Represents a listener for one event's argument tuple. */
export type EmitterHandler<TArgs extends readonly unknown[]> = (...args: TArgs) => void

/**
 * Represents the emitter's OWN listener-error handler — invoked when a listener throws during
 * `emit`, with the caught error and the (stringified) event name.
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
 * Declares the initial event listeners for an emitter — the reserved `on` option: a partial map
 * of event name to its handler, wired at construction.
 */
export type EmitterHooks<TMap extends EventMap> = {
	readonly [K in keyof TMap]?: EmitterHandler<TMap[K]>
}

/** Configures `createEmitter` and the `Emitter` constructor. */
export interface EmitterOptions<TMap extends EventMap> {
	readonly on?: EmitterHooks<TMap>
	/**
	 * Holds the emitter's listener-error handler — a throw from ANY listener during `emit` is
	 * routed here (with the error + the event name) instead of being rethrown. Omit it
	 * and a listener throw is swallowed silently.
	 */
	readonly error?: EmitterErrorHandler
}

/**
 * Represents a typed synchronous event emitter — the foundational observable primitive.
 * Entities OWN one as `#emitter` and expose `readonly emitter`; they never
 * inherit from it.
 */
export interface EmitterInterface<TMap extends EventMap> {
	/** Reports the teardown state: true after `destroy()`; false otherwise. */
	readonly destroyed: boolean
	/**
	 * Registers a listener for an event. Does nothing after `destroy()`.
	 *
	 * @param event - The event to listen for.
	 * @param handler - The listener invoked with the event's argument tuple.
	 */
	on<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	/**
	 * Registers a listener that removes itself after its first call. Does nothing after
	 * `destroy()`.
	 *
	 * @param event - The event to listen for.
	 * @param handler - The listener invoked with the event's argument tuple, once.
	 */
	once<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	/**
	 * Removes a listener registered for an event, including one registered through `once`.
	 *
	 * @param event - The event to unregister from.
	 * @param handler - The original handler passed to `on` or `once`, never a `once` wrapper.
	 */
	off<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void
	/**
	 * Invokes an event's listeners synchronously, in registration order. Does nothing after
	 * `destroy()`.
	 *
	 * @remarks
	 * Every listener runs: a throw is isolated and routed to {@link EmitterOptions.error},
	 * never rethrown. The listeners are snapshotted before the loop, so one registered
	 * during this call does not run in it.
	 *
	 * @param event - The event to fire.
	 * @param args - The argument tuple the event's listeners receive.
	 */
	emit<K extends keyof TMap>(event: K, ...args: TMap[K]): void
	/**
	 * Returns the live listener count.
	 *
	 * @param event - The event to count listeners for. Omit to count across every event.
	 * @returns The number of registered listeners.
	 */
	count(event?: keyof TMap): number
	/**
	 * Drops registered listeners, leaving the emitter usable and `destroyed` unchanged.
	 *
	 * @param event - The event to clear. Omit to clear every event.
	 */
	clear(event?: keyof TMap): void
	/** Tears down the emitter: drops every listener and sets `destroyed` to `true`. Idempotent. */
	destroy(): void
}
