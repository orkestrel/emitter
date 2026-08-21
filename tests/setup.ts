// Base test setup — environment-agnostic helpers loaded first by every
// Vitest project (`setupFiles[0]`). Keep this file free of `node:*` and of
// `document` / `window`: environment-specific helpers get their own setup
// file when this surface grows one.

import { afterEach, vi } from 'vitest'

afterEach(() => {
	vi.restoreAllMocks()
})

// Recorders come from `@orkestrel/test`. A listener-error recorder is
// `createRecorder<Parameters<EmitterErrorHandler>>()` at the call site, which derives
// its tuple from this package's own handler type rather than restating it here.

/** Whether a repository-relative Vue SFC path belongs to the private browser application. */
export function isBrowserVuePath(path: string): boolean {
	const normalized = path.replaceAll('\\', '/')
	return normalized.startsWith('app/browser/')
}
