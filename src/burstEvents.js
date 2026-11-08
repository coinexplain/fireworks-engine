// A stop invalidates every stack/timer belonging to the previous run. Additive
// launches deliberately keep the generation, including cascade children.
export function isCurrentRun(engine, generation) {
    return engine.runGeneration === generation;
}

export function createBurstEvent(engine, x, y) {
    return { generation: engine.runGeneration, x, y, notified: false };
}

export function notifyBurst(engine, burst) {
    if (burst.notified || !isCurrentRun(engine, burst.generation)) return;
    burst.notified = true;
    try {
        engine.onBurstCallback?.({ x: burst.x, y: burst.y });
    } catch {
        // Consumer code must not interrupt rendering or lifecycle cleanup.
    }
}
