import type {
	EmitterErrorHandler,
	EmitterHandler,
	EmitterHooks,
	EmitterInterface,
	EmitterOptions,
	EventMap,
} from './types.js'

/**
 * A typed synchronous event emitter — the foundational observable primitive of
 * the codebase (AGENTS §13). Stateful entities OWN one as a `#emitter` field and
 * expose it through `readonly emitter`; they never inherit from it.
 *
 * @typeParam TMap - The event map: each event name to the argument tuple its
 *   listeners receive.
 *
 * @remarks
 * - **Synchronous.** `emit` invokes listeners in registration order, in the
 *   current tick.
 * - **Listener isolation.** A throwing listener never stops its siblings: every
 *   listener runs, and a throw is routed to the `error` handler
 *   ({@link EmitterOptions.error}) — never rethrown. Every throwing listener
 *   surfaces (not just the first), and with no `error` handler a throw is swallowed
 *   silently. The `error` handler runs inside its own try/catch, so a throwing
 *   error-handler is swallowed too (anti-recursion — it cannot escape or re-enter).
 * - **Per-event storage.** Listeners live in a per-event `Set`, so every public
 *   method is precisely typed with no assertions.
 * - **Destroyed → no-op.** After `destroy()`, `on` / `once` / `emit` do nothing
 *   and `destroyed` is `true`.
 *
 * @example
 * ```ts
 * type CounterEventMap = {
 * 	tick: readonly [count: number]
 * 	done: readonly []
 * }
 *
 * const emitter = new Emitter<CounterEventMap>({
 * 	on: { done: () => stop() },
 * 	error: (error, event) => log(`listener for ${event} threw`, error),
 * })
 * emitter.on('tick', (count) => render(count))
 * emitter.emit('tick', 1)
 * ```
 */
export class Emitter<TMap extends EventMap> implements EmitterInterface<TMap> {
	#destroyed = false
	#listeners: { [K in keyof TMap]?: Set<EmitterHandler<TMap[K]>> } = {}
	#wrappers: { [K in keyof TMap]?: Map<EmitterHandler<TMap[K]>, EmitterHandler<TMap[K]>> } = {}
	// The emitter's own listener-error handler (§13) — a listener throw is routed here, never
	// rethrown. Held opaquely so an isolated throw becomes the entity's concern, not the loop's.
	#error: EmitterErrorHandler | undefined

	constructor(options?: EmitterOptions<TMap>) {
		this.#error = options?.error
		const hooks = options?.on
		if (hooks !== undefined) {
			this.#wire(hooks)
		}
	}

	get destroyed(): boolean {
		return this.#destroyed
	}

	on<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void {
		if (this.#destroyed) return
		;(this.#listeners[event] ??= new Set()).add(handler)
	}

	once<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void {
		if (this.#destroyed) return
		const wrapper: EmitterHandler<TMap[K]> = (...args) => {
			this.off(event, handler)
			handler(...args)
		}
		;(this.#wrappers[event] ??= new Map()).set(handler, wrapper)
		this.on(event, wrapper)
	}

	off<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void {
		const listeners = this.#listeners[event]
		const wrappers = this.#wrappers[event]
		const wrapper = wrappers?.get(handler)
		if (wrapper !== undefined) {
			listeners?.delete(wrapper)
			wrappers?.delete(handler)
			return
		}
		listeners?.delete(handler)
	}

	emit<K extends keyof TMap>(event: K, ...args: TMap[K]): void {
		if (this.#destroyed) return
		const listeners = this.#listeners[event]
		if (listeners === undefined) return
		// Every listener runs; a throw is isolated and routed to the `error` handler — never
		// rethrown, never stopping a sibling. EVERY throwing listener surfaces, not just the first.
		for (const handler of [...listeners]) {
			try {
				handler(...args)
			} catch (error) {
				this.#surface(error, event)
			}
		}
	}

	count(event?: keyof TMap): number {
		if (event !== undefined) return this.#listeners[event]?.size ?? 0
		let total = 0
		for (const set of Object.values(this.#listeners)) total += set?.size ?? 0
		return total
	}

	clear(event?: keyof TMap): void {
		if (event !== undefined) {
			delete this.#listeners[event]
			delete this.#wrappers[event]
			return
		}
		this.#listeners = {}
		this.#wrappers = {}
	}

	destroy(): void {
		this.#listeners = {}
		this.#wrappers = {}
		this.#error = undefined
		this.#destroyed = true
	}

	// Route an isolated listener throw to the `error` handler (§13), inside its OWN try/catch:
	// a throwing error-handler is swallowed (anti-recursion — it can neither escape the emit loop
	// nor re-enter it), and with no handler the throw is dropped silently. NEVER rethrows.
	#surface(error: unknown, event: keyof TMap): void {
		const handler = this.#error
		if (handler === undefined) return
		try {
			handler(error, String(event))
		} catch {
			// The error handler itself threw — the end of the line. Swallow it: rethrowing would
			// corrupt the emit loop, and re-surfacing would recurse.
		}
	}

	// Register the initial `on` hooks. Each key is an event name whose value is the
	// matching handler, so registering through `on` preserves the correlation the
	// mapped `EmitterHooks` already guarantees — no assertion needed.
	#wire(hooks: EmitterHooks<TMap>): void {
		for (const event of this.#keys(hooks)) {
			const handler = hooks[event]
			if (handler !== undefined) this.on(event, handler)
		}
	}

	// The own enumerable keys of a mapped object, typed as its key union.
	// `Object.keys` widens to `string[]`, breaking the key↔handler correlation; a
	// `for…in` push into a `keyof`-typed array narrows it back, type-safely.
	#keys<T extends object>(object: T): readonly (keyof T)[] {
		const collected: (keyof T)[] = []
		for (const key in object) collected.push(key)
		return collected
	}
}
