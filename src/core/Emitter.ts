import type {
	EmitterErrorHandler,
	EmitterHandler,
	EmitterHooks,
	EmitterInterface,
	EmitterOptions,
	EventMap,
} from './types.js'
import { isFunction } from '@orkestrel/contract'
import { extractKeys } from './helpers.js'

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
	// Each original handler may have MULTIPLE pending once-wrappers (repeated `once(event, h)`
	// calls before any of them fire), so the value is a Set of wrappers, not a single wrapper.
	#wrappers: { [K in keyof TMap]?: Map<EmitterHandler<TMap[K]>, Set<EmitterHandler<TMap[K]>>> } = {}
	// The emitter's own listener-error handler (§13) — a listener throw is routed here, never
	// rethrown. Held opaquely so an isolated throw becomes the entity's concern, not the loop's.
	#error: EmitterErrorHandler | undefined

	// Construction is the validation boundary (AGENTS §14): `error` and each `on` hook are
	// defensively guarded with `isFunction` here so a malformed options bag is skipped rather
	// than blowing up at first `emit` — `emit()` itself stays assertion-free and dependency-free
	// (the hot path), trusting only what construction has already let through.
	constructor(options?: EmitterOptions<TMap>) {
		const error = options?.error
		this.#error = isFunction(error) ? error : undefined
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
		// The wrapper removes ITSELF from the listener Set (captured through its reference) instead
		// of routing through `off` — routing through `off` would look the handler up by the
		// original handler, which a second `once(event, handler)` registration keeps alongside
		// this one (both pending wrappers share the same original handler), orphaning whichever
		// wrapper `off` doesn't happen to pick if only a single wrapper were tracked.
		const pending = (this.#wrappers[event] ??= new Map())
		const reference = new Set<EmitterHandler<TMap[K]>>()
		const wrapper = this.#wrap(event, handler, pending, reference)
		reference.add(wrapper)
		const wrappers = pending.get(handler) ?? new Set<EmitterHandler<TMap[K]>>()
		wrappers.add(wrapper)
		pending.set(handler, wrappers)
		this.on(event, wrapper)
	}

	off<K extends keyof TMap>(event: K, handler: EmitterHandler<TMap[K]>): void {
		const listeners = this.#listeners[event]
		const wrappers = this.#wrappers[event]
		const pending = wrappers?.get(handler)
		if (pending !== undefined) {
			for (const wrapper of pending) listeners?.delete(wrapper)
			wrappers?.delete(handler)
		}
		// Remove the plain handler too — `on(event, h)` + `once(event, h)` registers `h` twice,
		// and one `off(event, h)` call is meant to clear both registrations.
		listeners?.delete(handler)
	}

	// Snapshot semantics: the listener list is copied before iterating, so a listener added
	// DURING this emit does not fire this round, while a listener removed (or an emitter
	// destroyed) during this emit STILL fires this round if it was already in the snapshot.
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

	#wrap<K extends keyof TMap>(
		event: K,
		handler: EmitterHandler<TMap[K]>,
		pending: Map<EmitterHandler<TMap[K]>, Set<EmitterHandler<TMap[K]>>>,
		reference: Set<EmitterHandler<TMap[K]>>,
	): EmitterHandler<TMap[K]> {
		return (...args) => {
			for (const wrapper of reference) {
				this.#listeners[event]?.delete(wrapper)
				const wrappers = pending.get(handler)
				wrappers?.delete(wrapper)
				if (wrappers !== undefined && wrappers.size === 0) pending.delete(handler)
			}
			handler(...args)
		}
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
	// Defensively guards each hook value with `isFunction` (AGENTS §14) — a non-function
	// entry is skipped rather than registered, so a malformed `on` bag fails safe at
	// construction instead of throwing later when the bad "handler" is invoked in `emit`.
	#wire(hooks: EmitterHooks<TMap>): void {
		for (const event of extractKeys(hooks)) {
			const handler = hooks[event]
			if (isFunction(handler)) this.on(event, handler)
		}
	}
}
