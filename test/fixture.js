// Only the DOM/canvas and clock surface needed by the real public engine.
export function fixture(createEngine, options = {}) {
    let now = 0;
    let id = 0;
    const frames = new Map();
    const timers = new Map();
    const calls = [];
    const gradient = { addColorStop() {} };
    const context = new Proxy({}, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient;
            if (key === 'measureText') return () => ({ width: 12 });
            return (...args) => { calls.push([key, ...args]); };
        },
    });
    const root = {
        children: [],
        appendChild(child) { child.parentNode = this; this.children.push(child); },
        removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 280 }),
    };
    const document = {
        body: root, documentElement: root, hidden: false, visibilityState: 'visible',
        createElement: () => ({ style: {}, getContext: () => context }),
    };
    const window = {
        innerWidth: 420, innerHeight: 280, devicePixelRatio: 1,
        addEventListener() {}, removeEventListener() {},
    };
    const engine = createEngine({
        ...options,
        runtime: {
            document, window, prefersReducedMotion: () => false, now: () => now,
            requestAnimationFrame: (callback) => { frames.set(++id, callback); return id; },
            cancelAnimationFrame: (handle) => frames.delete(handle),
            setTimeout: (callback, delay) => { timers.set(++id, { callback, at: now + delay }); return id; },
            clearTimeout: (handle) => timers.delete(handle),
        },
    });
    function step(ms = 16) {
        now += ms;
        // Timers scheduled by a callback run on a subsequent turn.
        for (const [handle, timer] of [...timers]) {
            if (timer.at <= now && timers.delete(handle)) timer.callback();
        }
        for (const [handle, callback] of [...frames]) {
            if (frames.delete(handle)) callback(now);
        }
    }
    return { engine, frames, timers, document, root, calls, step };
}

export const smallBurst = {
    performance: { enableBurstQueueThrottling: false },
    burstForms: { enabled: true, shape: 'circle', count: 4 },
    burstSparks: { enabled: true, count: 3 },
    burstCenterFlash: { enabled: false },
    burstTwinkleCloud: { enabled: false },
    rocketTailEmbers: { enabled: false },
};

export function seeded(run) {
    const original = Math.random;
    let seed = 12345;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    try { return run(); } finally { Math.random = original; }
}
