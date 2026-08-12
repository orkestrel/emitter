/**
 * Extract the own enumerable keys of a mapped object, typed as its key union.
 *
 * @remarks
 * `Object.keys` widens its result to `string[]`, which breaks the key↔value
 * correlation a mapped type (like `EmitterHooks<TMap>`) otherwise guarantees.
 * A `for…in` push into a `keyof`-typed array narrows the result back,
 * type-safely and with no assertion.
 *
 * @typeParam T - The object shape whose keys are extracted.
 * @param object - The object to read keys from.
 * @returns The object's own enumerable keys, typed as `ReadonlyArray<keyof T>`.
 *
 * @example
 * ```ts
 * import { extractKeys } from '@src/core'
 *
 * const hooks = { tick: () => {}, done: () => {} }
 * extractKeys(hooks) // ['tick', 'done']
 * extractKeys({}) // []
 * ```
 */
export function extractKeys<T extends object>(object: T): ReadonlyArray<keyof T> {
	const collected: Array<keyof T> = []
	for (const key in object) collected.push(key)
	return collected
}
