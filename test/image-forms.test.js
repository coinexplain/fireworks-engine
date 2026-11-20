import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireworksEngine } from '../src/index.js';
import { fixture, seeded } from './fixture.js';

function loadedImage(width = 256, height = 128) {
    return { complete: true, naturalWidth: width, naturalHeight: height, width, height };
}

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
        burstForms: { enabled: true, count: 20, sizeMin: 5, sizeMax: 5, spin: 0, wobble: 0, ...burstForms },
    });
}

function formParticles(f) {
    return f.engine.particles.filter((particle) => particle.type === 'form');
}

function drawImageCallsWith(f, source) {
    return f.calls.filter(([key, first]) => key === 'drawImage' && first === source);
}

test('image shape: each particle picks a frame from images', () => {
    const atlas = loadedImage();
    const frameA = { source: atlas, x: 0, y: 0, width: 128, height: 128 };
    const frameB = { source: atlas, x: 128, y: 0, width: 128, height: 128 };
    seeded(() => {
        const f = setup({ shape: 'image', images: [frameA, frameB] });
        f.engine.burst(100, 80);
        const particles = formParticles(f);
        assert.equal(particles.length, 20);
        const used = new Set(particles.map((particle) => particle.formImage));
        assert.deepEqual([...used].sort((a, b) => a.x - b.x), [frameA, frameB]);
        for (const particle of particles) assert.equal(particle.formShape, 'image');
        f.engine.destroy();
    });
});

test('image shape: frame is drawn from its atlas rectangle at the glyph size, aspect kept', () => {
    const atlas = loadedImage();
    const frame = { source: atlas, x: 128, y: 0, width: 128, height: 64 };
    const f = setup({ shape: 'image', images: [frame], count: 1 });
    f.engine.burst(100, 80);
    f.step();
    // radius 5 × 3.2 = 16 → long side 16, short side 8.
    assert.deepEqual(drawImageCallsWith(f, atlas), [['drawImage', atlas, 128, 0, 128, 64, 0, 0, 16, 8]]);
    f.engine.destroy();
});

test('image shape: pre-scaled frame is cached across frames and bursts of the same size', () => {
    const atlas = loadedImage();
    const frame = { source: atlas, x: 0, y: 0, width: 128, height: 128 };
    const f = setup({ shape: 'image', images: [frame], count: 5 });
    f.engine.burst(100, 80);
    f.step();
    f.engine.burst(120, 90);
    f.step();
    f.step();
    assert.equal(drawImageCallsWith(f, atlas).length, 1);
    f.engine.destroy();
});

test('image shape falls back to a circle without throwing', async (t) => {
    const cases = {
        'image not loaded': [{ source: { complete: false, naturalWidth: 0, naturalHeight: 0 }, x: 0, y: 0, width: 8, height: 8 }],
        'frame out of bounds': [{ source: loadedImage(64, 64), x: 32, y: 0, width: 64, height: 64 }],
        'empty images': [],
        'no images option': undefined,
    };
    for (const [name, images] of Object.entries(cases)) {
        await t.test(name, () => {
            const f = setup({ shape: 'image', count: 3, ...(images === undefined ? {} : { images }) });
            assert.doesNotThrow(() => {
                f.engine.burst(100, 80);
                f.step();
            });
            assert.equal(f.calls.filter(([key]) => key === 'drawImage').length, 0);
            assert.equal(f.calls.filter(([key]) => key === 'arc').length, 3);
            f.engine.destroy();
        });
    }
});

test('images passed per launch apply only to that burst', () => {
    const engineFrame = { source: loadedImage(), x: 0, y: 0, width: 128, height: 128 };
    const launchFrame = { source: loadedImage(), x: 0, y: 0, width: 128, height: 128 };
    const f = setup({ shape: 'image', images: [engineFrame], count: 4 });
    f.engine.burst(100, 80, { burstForms: { images: [launchFrame] } });
    assert.ok(formParticles(f).every((particle) => particle.formImage === launchFrame));
    f.engine.particles.length = 0;
    f.engine.burst(100, 80);
    assert.ok(formParticles(f).every((particle) => particle.formImage === engineFrame));
    f.engine.destroy();
});

test('images: invalid entries are dropped and frames are kept by reference', () => {
    const frame = { source: loadedImage(), x: 0, y: 0, width: 128, height: 128 };
    const f = setup({
        shape: 'image',
        images: [frame, null, { x: 0, y: 0, width: 8, height: 8 }, { source: loadedImage(), x: 0, y: 0, width: 0, height: 8 }],
    });
    assert.equal(f.engine.burstForms.images.length, 1);
    assert.equal(f.engine.burstForms.images[0], frame);
    f.engine.destroy();
});

test('shapeWeights sets shape shares; weight 0 excludes a shape', () => {
    seeded(() => {
        const f = setup({ shape: 'circle|square', shapeWeights: { circle: 0, square: 1 }, count: 50 });
        f.engine.burst(100, 80);
        assert.ok(formParticles(f).every((particle) => particle.formShape === 'square'));
        f.engine.destroy();
    });

    seeded(() => {
        const f = setup({ shape: 'circle|square', shapeWeights: { circle: 1, square: 3 }, count: 400 });
        f.engine.burst(100, 80);
        const squares = formParticles(f).filter((particle) => particle.formShape === 'square').length;
        assert.ok(squares > 260 && squares < 340, `squares: ${squares}`);
        f.engine.destroy();
    });
});

test('shapeWeights: missing shape counts as 1, all-zero weights fall back to uniform', () => {
    seeded(() => {
        const f = setup({ shape: 'circle|square', shapeWeights: { square: 1 }, count: 200 });
        f.engine.burst(100, 80);
        const shapes = new Set(formParticles(f).map((particle) => particle.formShape));
        assert.deepEqual([...shapes].sort(), ['circle', 'square']);
        f.engine.destroy();
    });

    seeded(() => {
        const f = setup({ shape: 'circle|square', shapeWeights: { circle: 0, square: 0 }, count: 200 });
        f.engine.burst(100, 80);
        const shapes = new Set(formParticles(f).map((particle) => particle.formShape));
        assert.deepEqual([...shapes].sort(), ['circle', 'square']);
        f.engine.destroy();
    });
});

test('shapeWeights mixes image and abstract forms', () => {
    const frame = { source: loadedImage(), x: 0, y: 0, width: 128, height: 128 };
    seeded(() => {
        const f = setup({ shape: 'image|circle', shapeWeights: { image: 1, circle: 0 }, images: [frame], count: 30 });
        f.engine.burst(100, 80);
        assert.ok(formParticles(f).every((particle) => particle.formImage === frame));
        f.engine.destroy();
    });
});
