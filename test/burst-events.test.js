import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireworksEngine } from '../src/index.js';
import { fixture, smallBurst, seeded } from './fixture.js';

const callbackErrors = [];
test.afterEach(() => {
    const errors = callbackErrors.splice(0);
    assert.deepEqual(errors, [], 'assertions inside callbacks must not be hidden by exception isolation');
});
function setup({ expectCallbackError = false, onBurst, ...options } = {}) {
    return fixture(createFireworksEngine, {
        ...smallBurst, ...options,
        onBurst: onBurst && ((event) => {
            try { onBurst(event); } catch (error) {
                if (!expectCallbackError) callbackErrors.push(error);
                throw error;
            }
        }),
    });
}
function assertStopped(f) {
    assert.equal(f.engine.running, false);
    for (const key of ['particles', 'rockets', 'flashes', 'twinkleClouds', 'burstQueue']) {
        assert.equal(f.engine[key].length, 0, key);
    }
    assert.equal(f.frames.size, 0);
    assert.equal(f.timers.size, 0);
    assert.equal(f.engine.timeoutIds.size, 0);
    assert.equal(f.engine.rafId, null);
}

test('immediate forms + sparks notify once after materialization, including additive bursts', () => {
    const events = [];
    const f = setup({ onBurst(event) {
        assert.ok(f.engine.particles.length > 0);
        events.push(event);
    } });
    assert.equal(f.engine.burst(100, 80), true);
    assert.deepEqual(events, [{ x: 100, y: 80 }]);
    assert.equal(f.engine.particles.length, 7);
    f.engine.burst(120, 90);
    assert.equal(events.length, 2);
    for (let i = 0; i < 10; i++) f.step();
    assert.equal(events.length, 2);
    f.engine.destroy();
});

test('queue notifies on first materialized portion, once across layers and frames', () => {
    let events = 0;
    const f = setup({
        performance: { enableBurstQueueThrottling: true, maxBurstParticlesPerFrame: 1 },
        onBurst() { assert.equal(f.engine.particles.length, 1); events++; },
    });
    f.engine.burst(100, 80);
    assert.equal(events, 0);
    assert.equal(f.engine.particles.length, 0);
    for (let i = 0; i < 9; i++) f.step();
    assert.equal(events, 1);
    assert.equal(f.engine.burstQueue.length, 0);
    assert.equal(f.engine.particles.length, 7);
    f.engine.destroy();
});

for (const queued of [false, true]) {
    for (const component of ['flash', 'twinkle', 'empty']) {
        test(`${component}-only, queue=${queued}: event follows component creation`, () => {
            let events = 0;
            const f = setup({
                performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 1 },
                burstForms: { enabled: false }, burstSparks: { enabled: false },
                burstCenterFlash: { enabled: component === 'flash' },
                burstTwinkleCloud: { enabled: component === 'twinkle', count: 2, startDelay: 10 },
                onBurst() {
                    events++;
                    assert.equal(f.engine.flashes.length + f.engine.twinkleClouds.length, 1);
                    if (component === 'twinkle') {
                        assert.ok(f.engine.twinkleClouds[0].twinkles.every((t) => t.appearAt >= 10));
                    }
                },
            });
            f.engine.burst(100, 80);
            assert.equal(events, component === 'empty' ? 0 : 1);
            for (let i = 0; i < 10; i++) f.step();
            assert.equal(events, component === 'empty' ? 0 : 1);
            f.engine.destroy();
        });
    }
}

test('real rocket detonation and delayed burst cascade each notify at their own coordinates', () => {
    const events = [];
    const f = setup({ onBurst(event) { events.push(event); } });
    f.engine.launchRocketFromTo(100, 250, 100, 80, {
        rocket: { durationMin: 0.05, durationMax: 0.05, cascade: { mode: 'burst', bursts: 2, delay: 20 } },
    });
    assert.equal(events.length, 0);
    for (let i = 0; i < 60; i++) f.step();
    assert.equal(events.length, 3);
    assert.deepEqual(events[0], { x: 100, y: 80 });
    assert.equal(f.engine.rockets.length, 0);
    f.engine.destroy();
});

for (const queued of [false, true]) {
    test(`real victory-finale: one event per actual flash, queue=${queued}`, () => seeded(() => {
        let events = 0;
        const f = setup({
            performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 2 },
            burstCenterFlash: { enabled: true },
            onBurst({ x, y }) {
                events++;
                assert.ok(f.engine.flashes.some((flash) => flash.x === x && flash.y === y));
            },
        });
        const flashes = [];
        const push = f.engine.flashes.push.bind(f.engine.flashes);
        f.engine.flashes.push = (...items) => { flashes.push(...items); return push(...items); };
        f.engine.launchPresetAt('victory-finale', 210, 90);
        assert.equal(events, 0);
        for (let i = 0; i < 900; i++) f.step();
        assert.ok(events > 7, 'root, child rockets and their child bursts ran');
        assert.equal(events, flashes.length);
        assert.equal(f.engine.rockets.length, 0);
        assert.equal(f.engine.burstQueue.length, 0);
        f.engine.destroy();
    }));
}

test('stop/destroy before queue and timer execution suppress all late events', () => {
    for (const operation of ['stop', 'destroy']) {
        let events = 0;
        const f = setup({ performance: { enableBurstQueueThrottling: true }, onBurst() { events++; } });
        f.engine.start({ bursts: 3, duration: 100 });
        f.engine.burst(100, 80);
        const lateTimers = [...f.timers.values()].map((t) => t.callback);
        f.engine[operation]();
        f.document.hidden = true;
        // Simulate an already dispatched timeout even though clearTimeout ran.
        lateTimers.forEach((callback) => callback());
        for (let i = 0; i < 20; i++) f.step();
        assert.equal(events, 0);
        assertStopped(f);
    }
});

for (const queued of [false, true]) {
    for (const operation of ['stop', 'destroy']) {
        test(`${operation} inside callback cancels old burst/cascade, queue=${queued}`, () => {
            let events = 0;
            const f = setup({
                performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 1 },
                burstCenterFlash: { enabled: true }, burstTwinkleCloud: { enabled: true, count: 2 },
                onBurst() { events++; f.engine[operation](); },
            });
            f.engine.launchPresetAt('victory-finale', 210, 90);
            for (let i = 0; i < 300; i++) f.step();
            assert.equal(events, 1);
            assertStopped(f);
            // Direct, synchronous path must not append components after cancellation either.
            f.engine.burst(100, 80);
            if (queued) f.step();
            assert.equal(events, 2);
            assertStopped(f);
        });
    }
}

for (const queued of [false, true]) {
    for (const explicitStop of [false, true]) {
        test(`replacement start survives old frame/queue/cascade, queue=${queued}, stop=${explicitStop}`, () => {
            let events = 0;
            let replacement;
            const f = setup({
                performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 1 },
                burstCenterFlash: { enabled: true },
                onBurst() {
                    events++;
                    if (events !== 1) return;
                    if (explicitStop) f.engine.stop();
                    f.engine.start({ bursts: 0, duration: 5000 });
                    f.engine.burst(30, 40);
                    f.engine.launchRocketFromTo(10, 200, 20, 30, { rocket: { durationMin: 4, durationMax: 4 } });
                    replacement = {
                        raf: f.engine.rafId, timers: [...f.timers.keys()],
                        rockets: [...f.engine.rockets], queue: [...f.engine.burstQueue],
                        particles: [...f.engine.particles], flashes: [...f.engine.flashes],
                    };
                },
            });
            f.engine.launchPresetAt('victory-finale', 210, 90);
            for (let i = 0; i < 300 && !replacement; i++) f.step();
            assert.ok(replacement);
            assert.equal(f.engine.running, true);
            assert.equal(f.frames.size, 1);
            assert.equal(f.engine.rafId, replacement.raf);
            assert.deepEqual([...f.timers.keys()], replacement.timers);
            for (const key of ['rockets', 'particles', 'flashes']) assert.deepEqual(f.engine[key], replacement[key]);
            assert.deepEqual(f.engine.burstQueue, replacement.queue);
            f.step();
            assert.equal(events, 2);
            assert.equal(f.engine.rockets.length, 1);
            f.engine.destroy();
            assertStopped(f);
        });
    }
}

test('public count batches and multi-launch recipes stop after reentrant cancellation', () => {
    for (const launch of [
        (e) => e.launchPresetAt('button-click', 100, 80, { count: 3 }),
        (e) => e.launchPresetAt('base', 100, 80, { count: 3 }),
        (e) => e.launchRocket({ count: 3, rocket: { enabled: false } }),
        ...['confetti-pop', 'snowfall', 'leaf-fall'].map((name) => (e) => e.launchPresetAt(name, 100, 80)),
        (e) => e.launchPresetAt('ambient-sparkle', 100, 80, { burstTwinkleCloud: { enabled: true, count: 2 } }),
    ]) {
        let events = 0;
        const f = setup({ onBurst() { events++; f.engine.stop(); } });
        // launchRocket's existing low-level public API expects an active run.
        f.engine.start({ bursts: 0, duration: 5000 });
        launch(f.engine);
        assert.equal(events, 1);
        assertStopped(f);
    }
});

test('cancellation after first cloud or particle also aborts remaining layers', () => {
    for (const queued of [false, true]) {
        for (const cloudFirst of [false, true]) {
            for (const operation of ['stop', 'destroy']) {
                let events = 0;
                const f = setup({
                    performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 1 },
                    burstTwinkleCloud: { enabled: cloudFirst, count: 2 },
                    onBurst() { events++; f.engine[operation](); },
                });
                f.engine.burst(100, 80);
                f.step();
                assert.equal(events, 1);
                assertStopped(f);
            }
        }
    }
});

test('stale timers cannot delete replacement timers or reschedule hidden retries', () => {
    const f = setup();
    f.engine.start({ bursts: 3, duration: 100 });
    const stale = [...f.timers.values()].map((t) => t.callback);
    f.engine.start({ bursts: 0, duration: 5000 });
    const current = [...f.timers];
    f.document.hidden = true;
    stale.forEach((callback) => callback());
    assert.deepEqual([...f.timers], current);
    assert.deepEqual([...f.engine.timeoutIds], current.map(([id]) => id));
    f.engine.destroy();
});

test('cancellation in an immediate child prevents the rest of the child-rocket batch', () => {
    let events = 0;
    const f = setup({ onBurst() { if (++events === 2) f.engine.stop(); } });
    f.engine.launchRocketFromTo(100, 250, 100, 80, {
        rocket: {
            durationMin: 0.05, durationMax: 0.05,
            cascade: { mode: 'rocket', bursts: 3, child: { rocket: { enabled: false } } },
        },
    });
    for (let i = 0; i < 20; i++) f.step();
    assert.equal(events, 2);
    assertStopped(f);
});

test('constructor callback survives start/updateOptions/launch options and exceptions', () => {
    let events = 0;
    const unexpected = () => assert.fail('constructor callback replaced');
    const f = setup({ expectCallbackError: true, onBurst() { events++; throw new Error('consumer error'); } });
    f.engine.updateOptions({ onBurst: unexpected });
    f.engine.start({ bursts: 1, duration: 10, onBurst: unexpected });
    f.step();
    assert.equal(events, 1);
    f.engine.burst(100, 80, { onBurst: unexpected });
    assert.equal(events, 2);
    assert.equal(f.engine.particles.length, 14);
    f.step();
    assert.equal(f.engine.running, true);
    f.engine.destroy();
});

test('absent callback and passive callback preserve deterministic visual state and drawing', () => {
    function snapshot(onBurst) {
        return seeded(() => {
            const f = setup({ onBurst });
            f.engine.launchPresetAt('victory-finale', 210, 90);
            for (let i = 0; i < 40; i++) f.step();
            const state = JSON.stringify({
                particles: f.engine.particles, rockets: f.engine.rockets,
                flashes: f.engine.flashes, clouds: f.engine.twinkleClouds, calls: f.calls,
            });
            f.engine.destroy();
            return state;
        });
    }
    assert.equal(snapshot(undefined), snapshot(() => {}));
});
