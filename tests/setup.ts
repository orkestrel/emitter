// Base test setup — environment-agnostic helpers loaded first by every
// Vitest project (`setupFiles[0]`). Keep this file free of `node:*` and of
// `document` / `window`: environment-specific helpers get their own setup
// file when this surface grows one.

import type { EmitterErrorHandler } from '@src/core'
import type { RecorderInterface } from '@orkestrel/test'
import { createRecorder } from '@orkestrel/test'
import { afterEach, vi } from 'vitest'

afterEach(() => {
	vi.restoreAllMocks()
})

// ── Recorders ──────────────────────────────────────────────────────────────
// A recorder is a real callback with recorded calls (AGENTS §16.1) — used
// instead of a test-framework spy when a test only needs to count calls or
// inspect arguments. `createRecorder` and `RecorderInterface` are the fleet-
// wide form from `@orkestrel/test`; what remains here is specific to this
// package's error channel.

/** A recorder whose `handler` is assignable to `EmitterErrorHandler` (AGENTS §13). */
export function createErrorRecorder(): RecorderInterface<readonly [unknown, string]> {
	const recorder = createRecorder<readonly [unknown, string]>()
	const handler: EmitterErrorHandler = (error, event) => recorder.handler(error, event)
	return {
		get calls(): ReadonlyArray<readonly [unknown, string]> {
			return recorder.calls
		},
		get count(): number {
			return recorder.count
		},
		handler,
		clear(): void {
			recorder.clear()
		},
	}
}

/** Whether a repository-relative Vue SFC path belongs to the private browser application. */
export function isBrowserVuePath(path: string): boolean {
	const normalized = path.replaceAll('\\', '/')
	return normalized.startsWith('app/browser/')
}
