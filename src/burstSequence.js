import { buildEngineConfig } from './configBuilder.js';

// Internal launch context; never normalized into public visual options.
export const BURST_SEQUENCE = Symbol('burstSequence');
export const BURST_WORK = Symbol('burstWork');
const defaults = buildEngineConfig();
const groups = ['rocket', 'rocketTailEmbers', 'burstForms', 'burstSparks',
    'burstCenterFlash', 'burstTwinkleCloud', 'performance'];
const allowed = new Set(['trackBurstSequence', 'sizeScale', 'timeScale', 'count']);
const sequencesByEngine = new WeakMap();

export function invalidateBurstSequences(engine) {
    const sequences = sequencesByEngine.get(engine);
    if (!sequences) return;
    for (const sequence of sequences) sequence.active = false;
    sequences.clear();
}

export function supportsSequenceConfig(engine) {
    return engine.sizeScale === defaults.sizeScale
        && engine.enableBurstQueueThrottling === defaults.toggles.enableBurstQueueThrottling
        && engine.maxBurstParticlesPerFrame === defaults.performance.maxBurstParticlesPerFrame
        && groups.every((key) => JSON.stringify(engine[key]) === JSON.stringify(defaults[key]));
}

export function supportsSequenceLaunch(engine, name, options) {
    return name === 'victory-finale' && options.sizeScale === 1.05 && options.timeScale === 0.95
        && (options.count === undefined || options.count === 1)
        && Object.keys(options).every((key) => allowed.has(key))
        && supportsSequenceConfig(engine);
}

export function createBurstSequence(engine) {
    const sequence = { id: Symbol('victory-finale'), generation: engine.runGeneration,
        pending: 0, index: 0, active: true };
    if (!sequencesByEngine.has(engine)) sequencesByEngine.set(engine, new Set());
    sequencesByEngine.get(engine).add(sequence);
    return sequence;
}

export function discardBurstSequence(engine, sequence) {
    if (!sequence) return;
    sequence.active = false;
    sequencesByEngine.get(engine)?.delete(sequence);
}

export function reserveBurstWork(sequence, children = []) {
    sequence.pending += 1;
    return { sequence, children, materialized: false };
}

export function materializeBurstWork(engine, work) {
    if (!work || work.materialized) return null;
    const sequence = work.sequence;
    if (!sequence.active || engine.runGeneration !== sequence.generation) return null;
    // Configuration changes during a launch interrupt its tracking, not its visuals.
    if (!supportsSequenceConfig(engine)) {
        sequence.active = false;
        sequencesByEngine.get(engine)?.delete(sequence);
        return null;
    }
    work.materialized = true;
    sequence.pending -= 1;
    const index = sequence.index++;
    if (sequence.pending === 0) sequencesByEngine.get(engine)?.delete(sequence);
    return { id: sequence.id, index, isFirst: index === 0, isLast: sequence.pending === 0 };
}
