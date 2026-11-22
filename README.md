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
- `burstForms`: circle, square, rectangle, glyph, image, and mixed form particles.
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
        shrinkStart: 0.6,
        shrinkTo: 0.2,
        shrinkEasing: 'easeIn',
        rotationDeg: 360,
        rotationSpeedMin: 20,
        rotationSpeedMax: 60,
    },
    burstSparks: {
        shape: 'fade',
        count: 60,
        tailScale: 1.4,
    },
});
```

### Shrinking while fading

Form particles fade out over their whole life. Since 1.2.0 they can also shrink at the end of it:

- `shrinkStart` — share of lifetime (0–1) after which shrinking starts. `0.6` keeps full size for the
  first 60% of life. Default `1`: never shrink.
- `shrinkTo` — size at the end of life, as a share of the original (0–1). `0.2` ends at 20%, `0` shrinks
  to nothing. Default `1`: no shrinking.
- `shrinkEasing` — `'linear'` (default), `'easeIn'` (slow, then fast), `'easeOut'` (fast, then slow) or
  `'easeInOut'`.

Works for every form shape, including glyphs and images. Values are read at spawn, like other form
settings, and are clamped to 0–1; an unknown easing falls back to `'linear'`.

### Flat rotation and spin profiles

Since 1.3.0 form particles can be rotated in the screen plane without the 3D flip of `spin`:

- `rotationDeg` — spread of the start angle in degrees (0–360). `360` gives any angle, `40` gives
  −20°…+20°. Default `0`: particles keep their drawn orientation.
- `rotationSpeedMin` / `rotationSpeedMax` — turn speed range in degrees per second; each particle
  picks a speed and a random direction. Default `0`: the start angle stays.

`spin` imitates a flipping coin: the particle turns in the plane and periodically flattens to 2–12%
of its width. In the default `spinProfile: 'classic'` a particle snaps back fully open during spin
pauses and flattens again when spinning resumes, so even small values look jerky.

With `spinProfile: 'progressive'` each particle starts at a random 3D orientation (any flip phase)
and keeps it: `spin` only sets how fast it turns, so small values give a slow, smooth tumble and large
ones a fast flip. Pauses (`spinCoverage`, `spinDuration`, `spinPause`) ease the turn speed down and
back up instead of snapping the particle open, and the easing is slower for small `spin`. Flat
rotation adds to either profile.

### Image forms and shape weights

The `image` shape draws frames of an image or atlas in their own colors. Each particle picks a
random frame from `burstForms.images`; repeat a frame to raise its share. `shapeWeights` sets the
relative share of each shape listed in `shape`.

```js
const atlas = new Image();
atlas.src = '/sprites/particles.webp';

fireworks.burst(x, y, {
    burstForms: {
        shape: 'image|circle',
        shapeWeights: { image: 3, circle: 1 },
        images: [
            { source: atlas, x: 0, y: 0, width: 128, height: 128 },
            { source: atlas, x: 128, y: 0, width: 128, height: 128 },
        ],
    },
});
```

- Size: the longer frame side equals the glyph size of the same particle
  (`radius × 3.2`, at least 8 px); aspect ratio is kept.
- Palette and `highlight` do not apply to images. Fade, spin, and wobble work as for other forms.
- Image forms are drawn with normal blending, other forms keep additive blending.
- Frames are pre-scaled per size and cached like glyph sprites.
- A frame whose image is not loaded yet, is out of bounds, or is missing falls back to a
  palette-colored circle. No exception is thrown.
- `images` and `shapeWeights` can be passed per launch; frame objects are kept by reference.
- Without `shapeWeights` shapes are picked uniformly, exactly as before. A shape listed in
  `shape` but missing in `shapeWeights` counts as 1; weight 0 excludes it. If all weights
  are 0, the pick is uniform.

#### Using part of an atlas per burst

The engine draws only the frames it receives, so one atlas can serve several categories:
build the frames once, then pass each burst only the cells of its category.

```js
const cell = 128;
const columns = Math.floor(atlas.naturalWidth / cell);
// Cell index = row * columns + column, counted over the whole grid.
const frameOf = (index) => ({
    source: atlas,
    x: (index % columns) * cell,
    y: Math.floor(index / columns) * cell,
    width: cell,
    height: cell,
});
const framesByCategory = {
    bamboo: [2, 6].map(frameOf),
    seasons: [12, 13, 14, 15].map(frameOf),
};

// Create frame objects once and reuse them: the sprite cache is keyed by frame object.
fireworks.burst(x, y, {
    burstForms: { shape: 'image', images: framesByCategory.bamboo },
});
```

In `example/lab.html` the same is done with frame groups: load an atlas, add a group
(for example `bamboo`), and click its cells in the atlas preview. Launches and
**Copy snippet** then use only the active group's cells.

The lab slices an atlas as a grid: the first cell starts at **Grid offset X/Y**, the
next ones repeat every cell size + **Gap X/Y**, and only whole cells count (leftovers at
the right and bottom are ignored). For example, 200 px frames placed in 256 px slots of a
1024×256 atlas, centered in each slot, are cell 200, offset 28/28, gap 56/56. Atlases packed
by a texture packer, with frames of different sizes, are not supported by the lab yet; see
`docs/proposals/lab-atlas-frames-from-packer-json.md`.

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
- `example/lab.html` for full effect tuning, including image atlases with frame groups,
  shape weights, and an `onBurst` log with tracked victory boundaries.
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
