import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireworksEngine } from '../src/index.js';
import { fixture, seeded } from './fixture.js';
import { createBurstSequence, reserveBurstWork, materializeBurstWork } from '../src/burstSequence.js';

const launchOptions = { trackBurstSequence: true, sizeScale: 1.05, timeScale: 0.95 };
const launch = (f, options = launchOptions, name = 'victory-finale') => f.engine.launchPresetAt(name, 210, 90, options);
const finish = (f) => { for (let i = 0; i < 600; i++) f.step(); };

function checkSequence(events) {
    assert.ok(events.length > 7, 'root, child rockets, and delayed grandchildren appeared');
    assert.equal(events.filter((e) => e.sequence.isFirst).length, 1);
    assert.equal(events.filter((e) => e.sequence.isLast).length, 1);
    assert.ok(events[0].sequence.isFirst);
    assert.ok(events.at(-1).sequence.isLast);
    const id = events[0].sequence.id;
    events.forEach((event, index) => {
        assert.equal(event.sequence.id, id);
        assert.equal(event.sequence.index, index);
        assert.equal(event.sequence.isFirst, index === 0);
        assert.equal(event.sequence.isLast, index === events.length - 1);
    });
}

test('real victory notifies in actual materialization order, including final delayed burst', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst(event) { events.push(event); } });
    const flashes = [];
    const push = f.engine.flashes.push.bind(f.engine.flashes);
    f.engine.flashes.push = (...items) => { flashes.push(...items.map(({ x, y }) => ({ x, y }))); return push(...items); };
    assert.equal(launch(f), true);
    assert.equal(events.length, 0);
    finish(f);
    checkSequence(events);
    assert.deepEqual(events.map(({ x, y }) => ({ x, y })), flashes);
    assert.equal(f.engine.rockets.length, 0);
    assert.equal(f.engine.burstQueue.length, 0);
    assert.equal(f.timers.size, 0);
    f.engine.destroy();
}));

test('zero/single work and duplicate materialization', () => {
    const f = fixture(createFireworksEngine);
    const sequence = createBurstSequence(f.engine);
    assert.equal(sequence.pending, 0);
    assert.equal(sequence.index, 0);
    const work = reserveBurstWork(sequence);
    assert.deepEqual(materializeBurstWork(f.engine, work), { id: sequence.id, index: 0, isFirst: true, isLast: true });
    assert.equal(materializeBurstWork(f.engine, work), null);
    assert.equal(sequence.pending, 0);
    f.engine.destroy();
});

test('additive tracked launches have independent identities, boundaries and indices', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst: (event) => events.push(event) });
    assert.equal(launch(f), true);
    for (let i = 0; i < 10; i++) f.step();
    assert.equal(launch(f), true);
    finish(f);
    const ids = new Set(events.map((e) => e.sequence.id));
    assert.equal(ids.size, 2);
    for (const id of ids) checkSequence(events.filter((e) => e.sequence.id === id));
    f.engine.destroy();
}));

test('reversed child flight durations and simultaneous detonations keep boundaries correct', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst: (event) => events.push(event) });
    launch(f);
    while (events.length === 0) f.step();
    const children = [...f.engine.rockets];
    assert.ok(children.length > 1);
    children.forEach((rocket, i) => { rocket.life = i % 2 ? 0 : 0.032; });
    finish(f);
    checkSequence(events);
    assert.deepEqual(events.slice(1, 4).map(({ x, y }) => [x, y]),
        children.filter((_, i) => i % 2).map((r) => [r.targetX, r.targetY]));
    f.engine.destroy();
}));

for (const operation of ['stop', 'destroy']) {
    test(`${operation} before first burst has no callbacks`, () => {
        const events = [];
        const f = fixture(createFireworksEngine, { onBurst: (e) => events.push(e) });
        launch(f);
        f.engine[operation]();
        finish(f);
        assert.equal(events.length, 0);
        assert.equal(f.frames.size, 0);
        assert.equal(f.timers.size, 0);
    });
    test(`${operation} inside callback does not manufacture a final event`, () => seeded(() => {
        const events = [];
        const f = fixture(createFireworksEngine, { onBurst(event) { events.push(event); f.engine[operation](); } });
        launch(f);
        finish(f);
        assert.equal(events.length, 1);
        assert.equal(events[0].sequence.isLast, false);
        assert.equal(f.engine.rockets.length, 0);
        assert.equal(f.timers.size, 0);
    }));
}

test('replacement launched from callback survives and old sequence has no later events', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst(event) {
        events.push(event);
        if (events.length === 1) { f.engine.stop(); launch(f); }
    } });
    launch(f);
    finish(f);
    const firstId = events[0].sequence.id;
    assert.equal(events.filter((e) => e.sequence.id === firstId).length, 1);
    checkSequence(events.slice(1));
    f.engine.destroy();
}));

test('callback exception does not corrupt subsequent accounting', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst(event) { events.push(event); throw new Error('consumer'); } });
    launch(f);
    finish(f);
    checkSequence(events);
    f.engine.destroy();
}));

test('failed launch without RAF leaves an existing additive sequence intact', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst: (event) => events.push(event) });
    assert.equal(launch(f), true);
    const raf = f.engine.requestAnimationFrameRef;
    f.engine.requestAnimationFrameRef = null;
    assert.equal(launch(f), false);
    assert.equal(launch(f), false);
    f.engine.requestAnimationFrameRef = raf;
    finish(f);
    checkSequence(events);
    assert.equal(new Set(events.map((event) => event.sequence.id)).size, 1);
    f.engine.destroy();
}));

test('additive launch directly inside onBurst completes both independent sequences', () => seeded(() => {
    const events = [];
    let additiveResult;
    const f = fixture(createFireworksEngine, { onBurst(event) {
        events.push(event);
        if (events.length === 1) additiveResult = launch(f);
    } });
    launch(f);
    finish(f);
    assert.equal(additiveResult, true);
    const ids = new Set(events.map((event) => event.sequence.id));
    assert.equal(ids.size, 2);
    for (const id of ids) checkSequence(events.filter((event) => event.sequence.id === id));
    f.engine.destroy();
}));

test('start directly inside tracked callback invalidates old work and preserves replacement', () => seeded(() => {
    const events = [];
    let startResult;
    let replacementResult;
    const f = fixture(createFireworksEngine, { onBurst(event) {
        events.push(event);
        if (events.length === 1) {
            startResult = f.engine.start({ bursts: 0, duration: 5000 });
            replacementResult = launch(f);
        }
    } });
    launch(f);
    finish(f);
    assert.equal(startResult, true);
    assert.equal(replacementResult, true);
    assert.equal(events[0].sequence.isLast, false);
    assert.notEqual(events[0].sequence.id, events[1].sequence.id);
    assert.equal(events.filter((event) => event.sequence.id === events[0].sequence.id).length, 1);
    checkSequence(events.slice(1));
    f.engine.destroy();
}));

for (const patch of [{ count: 0 }, { count: 2 }, { sizeScale: 1 }, { timeScale: 1 },
    { rocket: { enabled: false } }, { burstForms: { enabled: false } }]) {
    test(`unsupported launch ${JSON.stringify(patch)} fails without side effects`, () => {
        const f = fixture(createFireworksEngine, { onBurst() { assert.fail('no callback'); } });
        const originalRandom = Math.random;
        Math.random = () => { throw new Error('must not draw random'); };
        try { assert.equal(launch(f, { ...launchOptions, ...patch }), false); }
        finally { Math.random = originalRandom; }
        assert.equal(f.root.children.length, 0);
        assert.equal(f.frames.size, 0);
        assert.equal(f.timers.size, 0);
        assert.equal(f.engine.timeScale, 1);
        assert.equal(f.engine.rockets.length, 0);
        assert.equal(f.engine.running, false);
    });
}

test('unsupported preset fails before canvas or timers', () => {
    const f = fixture(createFireworksEngine);
    assert.equal(launch(f, launchOptions, 'ambient-sparkle'), false);
    assert.equal(f.root.children.length, 0);
    assert.equal(f.timers.size, 0);
});

for (const patch of [{ rocket: { enabled: false } }, { burstCenterFlash: { enabled: false } },
    { sizeScale: 2 }, { performance: { enableBurstQueueThrottling: true } }]) {
    test(`effective engine config ${JSON.stringify(patch)} is rejected at creation and after update`, () => {
        for (const update of [false, true]) {
            const f = fixture(createFireworksEngine, update ? {} : patch);
            if (update) f.engine.updateOptions(patch);
            const before = f.engine.timeScale;
            assert.equal(launch(f), false);
            assert.equal(f.engine.timeScale, before);
            assert.equal(f.root.children.length, 0);
            assert.equal(f.frames.size, 0);
        }
    });
}

test('configuration change interrupts metadata without a late synthetic final', () => seeded(() => {
    const events = [];
    const f = fixture(createFireworksEngine, { onBurst: (e) => events.push(e) });
    launch(f);
    while (events.length === 0) f.step();
    f.engine.updateOptions({ burstCenterFlash: { enabled: false } });
    f.engine.updateOptions({ burstCenterFlash: { enabled: true } });
    finish(f);
    assert.equal(events.filter((e) => e.sequence).length, 1);
    assert.equal(events[0].sequence.isLast, false);
    f.engine.destroy();
}));

test('tracking leaves the seeded visuals and random stream identical to a normal launch', () => {
    function snapshot(tracked) {
        return seeded(() => {
            const events = [];
            const f = fixture(createFireworksEngine, { onBurst: (event) => events.push(event) });
            const options = { ...launchOptions };
            if (!tracked) delete options.trackBurstSequence;
            launch(f, options);
            const states = [];
            for (let i = 0; i < 250; i++) {
                f.step();
                states.push(JSON.stringify({ particles: f.engine.particles, flashes: f.engine.flashes,
                    clouds: f.engine.twinkleClouds, rockets: f.engine.rockets.map(({ sequenceWork, ...rocket }) => rocket) }));
            }
            const result = { states, drawing: f.calls, random: Math.random(),
                events: events.map(({ x, y }) => ({ x, y })) };
            if (!tracked) assert.ok(events.every((e) => !Object.hasOwn(e, 'sequence')));
            f.engine.destroy();
            return JSON.stringify(result);
        });
    }
    assert.deepEqual(snapshot(true), snapshot(false));
});
