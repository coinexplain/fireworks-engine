# Fireworks Engine

Reusable canvas fireworks runtime for browser applications.

Live examples: <https://coinexplain.github.io/fireworks-engine/example/examples.html>

Fireworks Engine creates and manages a canvas, runs an animation loop, and exposes a small imperative API for launching rockets, bursts, confetti, and curated presets. It is framework-agnostic and can be used from plain JavaScript, React, Vue, or any UI shell that can provide a DOM container.

## Install

Install from npm:

```sh
npm install fireworks-engine
```

Or open the live examples: <https://coinexplain.github.io/fireworks-engine/example/examples.html>

## Quick Start

```js
import { createFireworksEngine } from 'fireworks-engine';

const fireworks = createFireworksEngine({
    canvas: {
        appendTarget: document.body,
    },
});

fireworks.startPreset('base');
```

For a one-shot launch from a button:

```js
import { createFireworksEngine } from 'fireworks-engine';

const fireworks = createFireworksEngine({
    canvas: {
        appendTarget: document.body,
    },
});

button.addEventListener('click', () => {
    fireworks.boom(window.innerWidth * 0.5, window.innerHeight * 0.5);
});
```

Always call `destroy()` when the owning UI unmounts.

```js
fireworks.destroy();
```

## Burst notifications

Pass `onBurst` when creating the engine to synchronize another effect with each
logical explosion:

```js
const fireworks = createFireworksEngine({
    onBurst: ({ x, y }) => {
        // Trigger an already prepared effect at these canvas coordinates.
    },
});
```

The callback runs synchronously after the first visual component is created,
once per logical burst, including rocket detonations and cascade children.
Queued bursts notify on materialization, not enqueue, and particle batches,
trails, and later twinkles do not produce additional notifications. Flash-only
and twinkle-only bursts also notify; a twinkle cloud notifies when created even
if its twinkles appear later. Completely empty bursts do not notify. This is a
component-creation signal, not a pixel visibility or audio hardware timestamp.

`onBurst` is constructor-only: `start`, launch methods, and `updateOptions` neither
replace nor reset it. Exceptions in the callback are isolated from rendering.
Calling `stop()` or `destroy()` from the callback cancels the rest of that run;
starting a replacement effect leaves the new run intact. Ordinary additive
launches remain part of the current run. Call `destroy()` when the owner unmounts.

TypeScript exports `FireworksBurstEvent`, `FireworksBurstCallback`, and
`FireworksEngineCreationOptions`; existing `FireworksEngineOptions` still work
for both construction and start/update configuration.

## Public API

### Tracked victory boundaries

For the supported game victory configuration, opt in per launch:

```js
const fireworks = createFireworksEngine({
    onBurst: ({ x, y, sequence }) => {
        // sequence is available on tracked victory bursts only.
        // It describes this explosion now, never a delayed completion signal.
        if (sequence?.isFirst || sequence?.isLast) {
            // Trigger a prepared sound here.
        }
    },
});
fireworks.launchPresetAt('victory-finale', 210, 90, {
    trackBurstSequence: true,
    sizeScale: 1.05,
    timeScale: 0.95,
});
```

`sequence` contains an opaque symbol `id`, zero-based materialization `index`,
and boolean `isFirst`/`isLast`. Each additive launch has its own identity and
boundaries. Future rocket and delayed cascade bursts are reserved before the
first explosion; particles fading after their first appearance do not count
as future bursts. A final burst is flagged during its own normal `onBurst`
callback, not when the animation later becomes idle. A one-burst sequence has
both flags; no extra callbacks are generated for cancellation or empty work.

This deliberately narrow opt-in accepts only `victory-finale`, `count` omitted
or exactly `1`, `sizeScale: 1.05`, `timeScale: 0.95`, and no other launch keys.
Effective engine visual and performance settings must match defaults (including
`sizeScale: 1`, burst components, rocket/tail settings and performance budgets;
default queue throttling is **off**). Constructor canvas/runtime references and
callbacks may be customized. Engine timeScale may differ because the launch
explicitly sets it. Other tracking configurations, including `count: 0/2` and
queued engines, return `false` before creating a canvas, scheduling work,
changing timeScale, drawing random numbers or notifying callbacks. Calls without
`trackBurstSequence: true` keep their existing behavior and `{ x, y }` payload.

Changing effective visual/performance configuration via `updateOptions` during
a sequence interrupts its tracking permanently, even if defaults are restored.
The visual effect continues normally, with subsequent callbacks lacking
`sequence`. `stop`, `destroy` and replacement starts invalidate all old tracking;
no synthetic final sound should be added. Do not mutate engine internals directly.
This is a component-creation synchronization signal, not an audio-output timestamp.

Primary exports:

- `FireworksEngine`
- `createFireworksEngine(options?)`
- `resolveFireworksEnginePreset(name?)`
- default export: `FireworksEngine`

Instance methods:

- `start(config?)` starts a scheduled effect.
- `startPreset(name?)` starts one of the engine presets.
- `boom(x, y, options?)` launches a rocket toward a target point.
- `burst(x, y, options?)` creates a direct burst at a target point.
- `confetti(x, y, options?)` creates a forms-only confetti burst.
- `launchRocket(options?)` launches one or more rockets using runtime targeting.
- `launchRocketAt(x, y, options?)` launches a rocket toward a target point.
- `launchRocketFromTo(startX, startY, targetX, targetY, options?)` launches a rocket along an authored path.
- `launchPresetAt(name, x, y, options?)` launches a named launch preset at a point.
- `updateOptions(options?)` updates future launches without recreating the engine.
- `stop(clearCanvas?)` stops the loop and clears active particles.
- `destroy()` stops the loop and releases DOM/runtime resources.

Coordinates are canvas-local pixels. When the engine owns a full-page canvas, those coordinates line up with viewport pixels.

## Presets

Engine presets are used with `startPreset(...)` or `resolveFireworksEnginePreset(...)`:

- `base`
- `rocket`
- `cascade`
- `finale`

Launch presets are used with `launchPresetAt(...)`:

- `button-click`
- `success-burst`
- `win-celebration`
- `achievement-unlock`
- `confetti-pop`
- `purchase-success`
- `victory-finale`
- `snowfall`
- `leaf-fall`
- `ambient-sparkle`

```js
fireworks.startPreset('finale');
fireworks.launchPresetAt('confetti-pop', x, y);
```

## Options

The public options are grouped by runtime area:

- `canvas`: canvas ownership and sizing.
- `runtime`: injected DOM, timers, animation frame, clock, and reduced-motion hooks.
- `performance`: queue throttling and render pressure thresholds.
- `rocket`: rocket trail, color, speed, duration, and cascade behavior.
- `rocketTailEmbers`: ember particles emitted by rockets.
- `burstForms`: circle, square, rectangle, glyph, and mixed form particles.
- `burstSparks`: spark trails and fade/spindle/uniform spark shapes.
- `burstCenterFlash`: radial center flash.
- `burstTwinkleCloud`: delayed twinkle particles around a burst.

Common launch tuning fields can be passed at engine creation, `start(...)`, `updateOptions(...)`, or individual launch calls:

```js
fireworks.burst(x, y, {
    sizeScale: 1.2,
    timeScale: 1.4,
    burstForms: {
        shape: 'circle|square',
        count: 80,
        spin: 0.3,
        spinCoverage: 0.6,
        spinDuration: 2,
        spinPause: 2,
        highlight: 0.25,
        highlightWidth: 0.2,
        wobble: 0.4,
    },
    burstSparks: {
        shape: 'fade',
        count: 60,
        tailScale: 1.4,
    },
});
```

Rocket cascade example:

```js
fireworks.launchRocketAt(x, y, {
    rocket: {
        cascade: {
            mode: 'rocket',
            bursts: 4,
            childBursts: 2,
            delay: 160,
            spreadX: 180,
            spreadY: 220,
        },
    },
});
```

## Canvas Ownership

If `canvas.appendTarget` is provided, the engine appends a managed canvas inside that element and sizes it to the element bounds.

```js
const fireworks = createFireworksEngine({
    canvas: {
        appendTarget: document.querySelector('#fireworks-layer'),
        maxDevicePixelRatio: 2,
        zIndex: 20,
    },
});
```

If `appendTarget` is omitted, the engine resolves a root from `runtime.root`, `document.body`, or `document.documentElement` and mounts a fixed viewport canvas.

## Framework Usage

React example:

```jsx
import { useEffect, useRef } from 'react';
import { createFireworksEngine } from 'fireworks-engine';

export function FireworksLayer() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) {
            return undefined;
        }

        const fireworks = createFireworksEngine({
            canvas: { appendTarget: containerRef.current },
        });

        fireworks.startPreset('base');

        return () => {
            fireworks.destroy();
        };
    }, []);

    return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />;
}
```

Vue example:

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createFireworksEngine } from 'fireworks-engine';

const containerRef = ref(null);
let fireworks = null;

onMounted(() => {
    fireworks = createFireworksEngine({
        canvas: { appendTarget: containerRef.value },
    });

    fireworks.startPreset('base');
});

onBeforeUnmount(() => {
    fireworks?.destroy();
    fireworks = null;
});
</script>

<template>
    <div ref="containerRef" style="position: fixed; inset: 0;" />
</template>
```

## Examples

The npm package is intentionally core-only. Browser examples live in the repository:

- `example/minimal-usage.html` for the smallest browser integration.
- `example/examples.html` for an interactive examples gallery.
- `example/lab.html` for full effect tuning.
- `example/fireworks-engine-options-reference.html` for a generated options reference page.
- `example/scratch.html` for running standalone snippets.

Serve the repository with any static file server and open the example page you need.

## TypeScript

The package ships with `index.d.ts`.

```ts
import {
    createFireworksEngine,
    type FireworksEngineOptions,
} from 'fireworks-engine';

const options: FireworksEngineOptions = {
    burstForms: {
        shape: 'glyph',
        glyph: '*',
    },
};

const fireworks = createFireworksEngine(options);
```

## Reduced Motion

The runtime checks reduced-motion preferences before starting scheduled effects. You can override the check when embedding in a custom shell:

```js
const fireworks = createFireworksEngine({
    runtime: {
        prefersReducedMotion: () => false,
    },
});
```

## Development

```sh
npm run smoke
npm run typecheck
npm test
npm pack --dry-run
```

The public npm package includes the core runtime, type declarations, README, and license. Repository-local planning docs and development tests are intentionally not part of the published package.

## License

BSD-2-Clause
