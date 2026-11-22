import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireworksEngine } from '../src/index.js';
import { fixture, seeded } from './fixture.js';

const base = {
    performance: { enableBurstQueueThrottling: false },
    burstSparks: { enabled: false },
    burstCenterFlash: { enabled: false },
    burstTwinkleCloud: { enabled: false },
    rocketTailEmbers: { enabled: false },
};

function setup(burstForms) {
    return fixture(createFireworksEngine, {
        ...base,
        burstForms: {
            enabled: true, shape: 'square', count: 40, sizeMin: 5, sizeMax: 5, lifeMin: 2, lifeMax: 2,
            spin: 0, wobble: 0, gravity: 0, speedMin: 0, speedMax: 0, ...burstForms,
        },
    });
}

const forms = (f) => f.engine.particles.filter((particle) => particle.type === 'form');
const DEG = Math.PI / 180;

test('rotationDeg: start angles spread within ±rotationDeg/2, without spin', () => {
    seeded(() => {
        const f = setup({ rotationDeg: 60 });
        f.engine.burst(100, 80);
        const angles = forms(f).map((particle) => particle.formRotation);
        for (const angle of angles) assert.ok(Math.abs(angle) <= 30 * DEG + 1e-9);
        assert.ok(new Set(angles).size > 30, 'angles differ between particles');
        assert.ok(Math.max(...angles) > 15 * DEG && Math.min(...angles) < -15 * DEG);
        f.engine.destroy();
    });
});

test('rotationDeg: rotation is drawn with spin 0 and stays still without rotation speed', () => {
    const f = setup({ rotationDeg: 360, count: 1 });
    f.engine.burst(100, 80);
    const [particle] = forms(f);
    const start = particle.formRotation;
    f.step();
    f.step();
    assert.equal(particle.formRotation, start);
    const rotateCalls = f.calls.filter(([key]) => key === 'rotate');
    assert.ok(rotateCalls.length > 0);
    assert.ok(Math.abs(rotateCalls.at(-1)[1] - start) < 1e-9);
    f.engine.destroy();
});

test('rotation speed: turns at rotationSpeedMin..Max deg/s in a random direction', () => {
    seeded(() => {
        const f = setup({ rotationSpeedMin: 30, rotationSpeedMax: 60 });
        f.engine.burst(100, 80);
        const speeds = forms(f).map((particle) => particle.formRotationSpeed);
        for (const speed of speeds) {
            assert.ok(Math.abs(speed) >= 30 * DEG - 1e-9 && Math.abs(speed) <= 60 * DEG + 1e-9);
        }
        assert.ok(speeds.some((speed) => speed > 0) && speeds.some((speed) => speed < 0));
        const [particle] = forms(f);
        const before = particle.formRotation;
        f.step(16);
        f.step(16);
        // Frame dt is clamped by the engine; two 16 ms frames advance the angle by speed × elapsed.
        const turned = particle.formRotation - before;
        assert.ok(Math.sign(turned) === Math.sign(particle.formRotationSpeed));
        assert.ok(Math.abs(turned) <= Math.abs(particle.formRotationSpeed) * 0.05);
        f.engine.destroy();
    });
});

test('rotation defaults: no rotation, no transform', () => {
    const f = setup({ count: 1 });
    f.engine.burst(100, 80);
    f.step();
    const [particle] = forms(f);
    assert.equal(particle.formRotation, 0);
    assert.equal(particle.formRotationSpeed, 0);
    assert.equal(f.calls.filter(([key]) => key === 'rotate').length, 0);
    f.engine.destroy();
});

test('rotation: invalid values are clamped', () => {
    seeded(() => {
        const f = setup({ rotationDeg: 9999, rotationSpeedMin: -10, rotationSpeedMax: -5 });
        f.engine.burst(100, 80);
        for (const particle of forms(f)) {
            assert.ok(Math.abs(particle.formRotation) <= Math.PI + 1e-9);
            assert.equal(particle.formRotationSpeed, 0);
        }
        f.engine.destroy();
    });
});

function widthsAfter(spin, frames) {
    let result;
    seeded(() => {
        const f = setup({ spin, spinProfile: 'progressive', spinCoverage: 1, spinDuration: 8, spinPause: 0.05 });
        f.engine.burst(100, 80);
        const particles = forms(f);
        const start = particles.map((particle) => particle.formWidthScale);
        for (let frame = 0; frame < frames; frame += 1) f.step(16);
        result = { start, end: particles.map((particle) => particle.formWidthScale), particles };
        f.engine.destroy();
    });
    return result;
}

test('progressive spin: particles start at a random 3D orientation, not fully open', () => {
    const { start, particles } = widthsAfter(0.05, 0);
    assert.ok(start.some((width) => width < 0.5), 'some particles start edge-on');
    assert.ok(start.some((width) => width > 0.9), 'some particles start face-on');
    for (const particle of particles) {
        assert.equal(particle.formSpinBlend, 1);
        assert.ok(particle.formSpinMinWidthScale <= 0.12 + 1e-9, 'full flip depth');
    }
});

test('progressive spin: small spin turns slowly, large spin fast', () => {
    const change = (spin) => {
        const { start, end } = widthsAfter(spin, 20);
        return start.reduce((sum, width, index) => sum + Math.abs(end[index] - width), 0) / start.length;
    };
    const slow = change(0.05);
    const fast = change(1);
    assert.ok(slow < 0.05, `small spin changes width by ${slow}`);
    assert.ok(fast > slow * 5, `large spin ${fast} vs small ${slow}`);
});

test('progressive spin: a pause eases the turn speed and keeps the orientation', () => {
    seeded(() => {
        const f = setup({ spin: 1, spinProfile: 'progressive', spinCoverage: 1, count: 1 });
        f.engine.burst(100, 80);
        const [particle] = forms(f);
        particle.formSpinActive = true;
        particle.formSpinRate = 1;
        particle.formSpinToggleTimer = 10;
        f.step(16);
        particle.formSpinActive = false;
        particle.formSpinToggleTimer = 10;
        f.step(16);
        assert.ok(particle.formSpinRate > 0.5 && particle.formSpinRate < 1, `rate eases: ${particle.formSpinRate}`);
        for (let frame = 0; frame < 150; frame += 1) f.step(16);
        assert.equal(particle.formSpinRate, 0);
        const width = particle.formWidthScale;
        f.step(16);
        assert.equal(particle.formWidthScale, width, 'width stays while paused');
        assert.equal(particle.formSpinBlend, 1, 'never snaps back open');
        f.engine.destroy();
    });
});

test('classic spin is unchanged by default and for unknown profiles', () => {
    const snapshot = (spinProfile) => {
        let result;
        seeded(() => {
            const f = setup({ spin: 0.05, ...(spinProfile ? { spinProfile } : {}) });
            f.engine.burst(100, 80);
            for (let frame = 0; frame < 10; frame += 1) f.step(16);
            result = forms(f).map((p) => [p.formSpinMinWidthScale, p.formSpinPhase, p.formWidthScale, p.formSpinBlend]);
            for (const particle of forms(f)) assert.equal(particle.formSpinProgressive, false);
            f.engine.destroy();
        });
        return result;
    };
    const classic = snapshot(undefined);
    assert.deepEqual(snapshot('bogus'), classic);
    assert.deepEqual(snapshot('classic'), classic);
});
