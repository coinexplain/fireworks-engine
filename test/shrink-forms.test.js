import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireworksEngine } from '../src/index.js';
import { resolveFormShrinkScale } from '../src/renderer.js';
import { fixture } from './fixture.js';

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
            enabled: true, shape: 'square', count: 1, sizeMin: 5, sizeMax: 5, lifeMin: 1, lifeMax: 1,
            spin: 0, wobble: 0, gravity: 0, speedMin: 0, speedMax: 0, ...burstForms,
        },
    });
}

function particleAt(lifeShare, shrink) {
    return {
        life: 1 - lifeShare, maxLife: 1,
        formShrinkStart: shrink.start, formShrinkTo: shrink.to, formShrinkEasing: shrink.easing,
    };
}

test('shrink scale: full size before shrinkStart, linear down to shrinkTo at the end of life', () => {
    const shrink = { start: 0.6, to: 0.2, easing: 'linear' };
    assert.equal(resolveFormShrinkScale(particleAt(0, shrink)), 1);
    assert.equal(resolveFormShrinkScale(particleAt(0.6, shrink)), 1);
    assert.ok(Math.abs(resolveFormShrinkScale(particleAt(0.8, shrink)) - 0.6) < 1e-9);
    assert.ok(Math.abs(resolveFormShrinkScale(particleAt(1, shrink)) - 0.2) < 1e-9);
});

test('shrink scale: easing changes the curve, not the end points', () => {
    const at = (easing, share) => resolveFormShrinkScale(particleAt(share, { start: 0, to: 0, easing }));
    assert.ok(Math.abs(at('linear', 0.5) - 0.5) < 1e-9);
    assert.ok(Math.abs(at('easeIn', 0.5) - 0.75) < 1e-9);
    assert.ok(Math.abs(at('easeOut', 0.5) - 0.25) < 1e-9);
    assert.ok(Math.abs(at('easeInOut', 0.25) - 0.875) < 1e-9);
    for (const easing of ['linear', 'easeIn', 'easeOut', 'easeInOut']) {
        assert.equal(at(easing, 0), 1);
        assert.ok(Math.abs(at(easing, 1)) < 1e-9);
    }
});

test('shrink scale: defaults and missing fields keep full size', () => {
    assert.equal(resolveFormShrinkScale({ life: 0.1, maxLife: 1 }), 1);
    assert.equal(resolveFormShrinkScale(particleAt(0.9, { start: 1, to: 0 })), 1);
    assert.equal(resolveFormShrinkScale(particleAt(0.9, { start: 0, to: 1 })), 1);
    assert.equal(resolveFormShrinkScale({ life: 0, maxLife: 0, formShrinkStart: 0, formShrinkTo: 0 }), 1);
});

test('spawn: shrink options are clamped and stored on the particle, unknown easing is linear', () => {
    const f = setup({ shrinkStart: 1.5, shrinkTo: -1, shrinkEasing: 'bounce' });
    f.engine.burst(100, 80);
    const [particle] = f.engine.particles;
    assert.equal(particle.formShrinkStart, 1);
    assert.equal(particle.formShrinkTo, 0);
    assert.equal(particle.formShrinkEasing, 'linear');
    f.engine.destroy();
});

test('render: square shrinks through the canvas scale after shrinkStart', () => {
    const f = setup({ shrinkStart: 0.5, shrinkTo: 0.5 });
    f.engine.burst(100, 80);
    f.step();
    const scaleCalls = () => f.calls.filter(([key]) => key === 'scale');
    assert.equal(scaleCalls().length, 0, 'no scaling before shrinkStart');
    const [particle] = f.engine.particles;
    particle.life = 0.25;
    f.calls.length = 0;
    f.step(0);
    const [[, scaleX, scaleY]] = scaleCalls();
    assert.ok(Math.abs(scaleY - 0.75) < 0.02, `scaleY ${scaleY}`);
    assert.ok(Math.abs(scaleX - scaleY) < 1e-9);
    f.engine.destroy();
});

test('render: without shrink options nothing is scaled', () => {
    const f = setup({});
    f.engine.burst(100, 80);
    f.step();
    f.engine.particles[0].life = 0.05;
    f.step(0);
    assert.equal(f.calls.filter(([key]) => key === 'scale').length, 0);
    f.engine.destroy();
});
