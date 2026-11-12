// A stop invalidates every stack/timer belonging to the previous run. Additive
// launches deliberately keep the generation, including cascade children.
export function isCurrentRun(engine, generation) {
    return engine.runGeneration === generation;
}

import { materializeBurstWork } from './burstSequence.js';

export function createBurstEvent(engine, x, y, work) {
    return { generation: engine.runGeneration, x, y, notified: false, work };
}

export function notifyBurst(engine, burst) {
    if (burst.notified || !isCurrentRun(engine, burst.generation)) return;
    burst.notified = true;
    const sequence = materializeBurstWork(engine, burst.work);
    try {
        engine.onBurstCallback?.({ x: burst.x, y: burst.y, ...(sequence ? { sequence } : {}) });
    } catch {
        // Consumer code must not interrupt rendering or lifecycle cleanup.
    }
}
