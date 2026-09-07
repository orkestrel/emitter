# @orkestrel/emitter

> The foundational observable primitive: a typed, synchronous event emitter that a
> stateful entity owns as a `#emitter` field and exposes through a `readonly emitter`
> property, fanning each event out to its listeners in the current tick and isolating a
> throwing listener from its siblings.

Create an emitter with the `createEmitter` function, subscribe with `on` or `once`, and
call `emit` to fan an event out to its listeners. Own one as a `#emitter` field where an
entity of your own reports lifecycle transitions, and pass an `error` handler to receive a
listener's throw. Part of the `@orkestrel` line.

## Install

```sh
npm install @orkestrel/emitter
```

## Requirements

- Node.js >= 22.12.0
- ESM and CommonJS builds

## Usage

```ts
import { createEmitter } from '@orkestrel/emitter'

// The event map names each event and the argument tuple its listeners receive.
type ClockEventMap = {
	tick: readonly [at: number]
	done: readonly []
}

const clock = createEmitter<ClockEventMap>({
	on: { done: () => stop() }, // initial listeners wired at construction
	error: (error, event) => logger.warn(`listener for "${event}" threw`, error),
})

const onTick = (at: number) => render(at)
clock.on('tick', onTick) // `at` is typed `number` from the map
clock.emit('tick', Date.now()) // synchronous — every `tick` listener runs now
clock.once('done', () => cleanup()) // removes itself after its first call
clock.off('tick', onTick) // remove a listener by its original handler
clock.count() // live listener count, total or per-event
clock.clear() // drop listeners, total or per-event; emitter stays usable
clock.destroy() // teardown — drops every listener, flips `destroyed`
```

`createEmitter(options)` (or `new Emitter(options)`) returns an
`EmitterInterface<TMap>`. The reserved `on` option wires initial listeners at
construction; the optional `error` option receives any listener's throw as
`(error, event)` so `emit` never has to rethrow — with no `error` handler, a
throw is swallowed silently. `emit` never stops on a throw: every listener
runs regardless, and every throw surfaces (not only the first).

## Guide

For the full surface — the `Emitter` class, `EmitterInterface`, and the
listener-isolation contract — see
[`guides/emitter.md`](guides/emitter.md).

## Package

Published as a single typed entry point per the `exports` field in
`package.json`.

## License

MIT © [Orkestrel](https://github.com/orkestrel) — see [LICENSE](./LICENSE).
