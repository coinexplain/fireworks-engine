// One-off release check: run against a freshly extracted npm pack tarball.
// node test/verify-package.mjs <extracted-package-dir> [baseline-repo-dir]
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { fixture, smallBurst, seeded } from './fixture.js';

const packageDir = path.resolve(process.argv[2]);
const sourceDir = fileURLToPath(new URL('../', import.meta.url));
const metadata = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
assert.equal(metadata.version, '1.0.1');
assert.equal(metadata.exports['.'].default, metadata.main);
assert.equal(metadata.exports['.'].types, './index.d.ts');
const { createFireworksEngine } = await import(pathToFileURL(path.join(packageDir, metadata.main)));
let events = 0;
const f = fixture(createFireworksEngine, {
    ...smallBurst,
    performance: { enableBurstQueueThrottling: true, maxBurstParticlesPerFrame: 1 },
    onBurst({ x, y }) { assert.equal(x, 100); assert.equal(y, 80); events++; },
});
f.engine.burst(100, 80);
assert.equal(events, 0);
for (let i = 0; i < 12; i++) f.step();
assert.equal(events, 1);
assert.equal(f.engine.particles.length, 7);
assert.equal(f.engine.burstQueue.length, 0);
f.engine.destroy();
assert.equal(f.frames.size, 0);
assert.equal(f.timers.size, 0);

const files = [];
async function verifyFiles(relative = '') {
    for (const entry of await readdir(path.join(packageDir, relative), { withFileTypes: true })) {
        const name = path.join(relative, entry.name);
        if (entry.isDirectory()) await verifyFiles(name);
        else {
            assert.deepEqual(await readFile(path.join(packageDir, name)), await readFile(path.join(sourceDir, name)), name);
            files.push(name.replaceAll('\\', '/'));
        }
    }
}
await verifyFiles();
console.log(`Extracted public entrypoint/onBurst/cleanup OK; ${files.length} package files match reviewed source byte for byte.`);

if (process.argv[3]) {
    const baseline = await import(pathToFileURL(path.resolve(process.argv[3], 'src/index.js')));
    function snapshot(createEngine, queued) {
        return seeded(() => {
            const instance = fixture(createEngine, {
                ...smallBurst,
                performance: { enableBurstQueueThrottling: queued, maxBurstParticlesPerFrame: 2 },
                burstCenterFlash: { enabled: true },
                burstTwinkleCloud: { enabled: true, count: 2 },
            });
            instance.engine.launchPresetAt('victory-finale', 210, 90);
            const states = [];
            for (let i = 0; i < 300; i++) {
                instance.step();
                states.push(JSON.stringify({
                    particles: instance.engine.particles, rockets: instance.engine.rockets,
                    flashes: instance.engine.flashes, clouds: instance.engine.twinkleClouds,
                }));
            }
            const result = JSON.stringify({ states, drawing: instance.calls });
            instance.engine.destroy();
            return result;
        });
    }
    for (const queued of [false, true]) assert.equal(snapshot(createFireworksEngine, queued), snapshot(baseline.createFireworksEngine, queued));
    console.log('No-callback victory-finale matches 1.0.0 baseline: 300 frames each, immediate and queued, component state and canvas calls.');
}
