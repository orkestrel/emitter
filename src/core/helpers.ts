/**
 * Extracts the own enumerable keys of a mapped object, typed as its key union.
 *
 * @remarks
 * `Object.keys` widens its result to `string[]`, which breaks the key↔value
 * correlation a mapped type (like `EmitterHooks<TMap>`) otherwise guarantees.
 * An own-key predicate narrows the result back without an assertion.
 * Inherited enumerable keys are excluded.
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
	return Object.keys(object).filter((key): key is Extract<keyof T, string> =>
		Object.hasOwn(object, key),
	)
}
