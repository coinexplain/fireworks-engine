# Fireworks Engine Core

Reusable canvas fireworks runtime for browser applications.

Live examples: <https://coinexplain.github.io/fireworks-engine/example/examples.html>

`@fireworks-engine/core` creates and manages a canvas, runs an animation loop, and exposes a small imperative API for launching rockets, bursts, confetti, and curated presets. It is framework-agnostic and can be used from plain JavaScript, React, Vue, or any UI shell that can provide a DOM container.

> Publication note: this package stays `private: true` until the final release step. The repository is being prepared for the first public npm release.

## Install

```sh
npm install @fireworks-engine/core
```

## Quick Start

```js
import { createFireworksEngine } from '@fireworks-engine/core';

const fireworks = createFireworksEngine({
    canvas: {
        appendTarget: document.body,
    },
});

fireworks.startPreset('base');
```

For a one-shot launch from a button:

```js
import { createFireworksEngine } from '@fireworks-engine/core';

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

## Public API

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
import { createFireworksEngine } from '@fireworks-engine/core';

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
import { createFireworksEngine } from '@fireworks-engine/core';

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
} from '@fireworks-engine/core';

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
