import { randomRange } from './mathResolvers.js';
import {
    isPlainRecord,
    normalizeGroupedPublicOptions,
} from './valueNormalizers.js';
import { buildEngineConfig } from './configBuilder.js';
import {
    BURST_SEQUENCE, createBurstSequence, discardBurstSequence, invalidateBurstSequences,
    supportsSequenceConfig, supportsSequenceLaunch,
} from './burstSequence.js';
import {
    resolveFireworksEnginePreset,
    resolveFireworksLaunchPreset,
} from './presets.js';
import { loop as renderLoop } from './renderer.js';
import * as lifecycle from './runtimeLifecycle.js';
import { launchBurst } from './burstSpawn.js';
import {
    launchRocket,
    launchRocketAt,
    launchRocketFromTo,
} from './rocketLaunch.js';

export { FIREWORKS_ENGINE_PRESETS, resolveFireworksEnginePreset } from './presets.js';

const FINISH_WHEN_DONE_POLL_MS = 120;
const DEFAULT_CONFETTI_OPTIONS = Object.freeze({
    timeScale: 3,
    sizeScale: 1,
    rocket: Object.freeze({ enabled: false }),
    rocketTailEmbers: Object.freeze({ enabled: false }),
    burstForms: Object.freeze({
        enabled: true,
        shape: 'circle|square',
        colorMode: 'palette',
        count: 100,
        speedMin: 100,
        speedMax: 600,
        directionDeg: 90,
        coneDeg: 100,
        gravity: 80,
        lifeMin: 8,
        lifeMax: 8,
        sizeMin: 3.3,
        sizeMax: 4.4,
        wobble: 0.4,
        spin: 0.3,
        spinCoverage: 0.92,
        spinDuration: 2,
        spinPause: 2,
        highlight: 0,
        highlightAngleDeg: 0,
        highlightWidth: 0.18,
    }),
    burstSparks: Object.freeze({ enabled: false }),
    burstCenterFlash: Object.freeze({ enabled: false }),
    burstTwinkleCloud: Object.freeze({ enabled: false }),
});

const START_MODE_DEFAULTS = {
    rocket: {
        rocketCount: 2,
        rocketDelayMs: 220,
        totalDurationMs: 2200,
    },
    burst: {
        bursts: 4,
        durationMs: 1200,
        finishDelayMs: 500,
        xMinRatio: 0.2,
        xMaxRatio: 0.8,
        yMinRatio: 0.15,
        yMaxRatio: 0.45,
    },
};

function hasOwnOption(options, key) {
    return Object.prototype.hasOwnProperty.call(options, key);
}

function mergeDefined(target, patch) {
    const next = { ...target };
    const keys = Object.keys(patch);

    for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (patch[key] !== undefined) {
            next[key] = patch[key];
        }
    }

    return next;
}

function extractExplicitLaunchOptions(options = {}) {
    if (!isPlainRecord(options)) {
        return {};
    }

    const explicitOptions = {};

    if (hasOwnOption(options, 'timeScale')) {
        explicitOptions.timeScale = options.timeScale;
    }
    if (hasOwnOption(options, 'sizeScale')) {
        explicitOptions.sizeScale = options.sizeScale;
    }

    if (isPlainRecord(options.rocket)) {
        explicitOptions.rocket = { ...options.rocket };
    }
    if (isPlainRecord(options.rocketTailEmbers)) {
        explicitOptions.rocketTailEmbers = { ...options.rocketTailEmbers };
    }
    if (isPlainRecord(options.burstForms)) {
        explicitOptions.burstForms = { ...options.burstForms };
    }
    if (isPlainRecord(options.burstSparks)) {
        explicitOptions.burstSparks = { ...options.burstSparks };
    }
    if (isPlainRecord(options.burstCenterFlash)) {
        explicitOptions.burstCenterFlash = { ...options.burstCenterFlash };
    }
    if (isPlainRecord(options.burstTwinkleCloud)) {
        explicitOptions.burstTwinkleCloud = { ...options.burstTwinkleCloud };
    }

    return explicitOptions;
}

function mergeExplicitLaunchOptions(currentOptions = {}, patch = {}) {
    const nextOptions = { ...currentOptions };

    if (hasOwnOption(patch, 'timeScale')) {
        nextOptions.timeScale = patch.timeScale;
    }
    if (hasOwnOption(patch, 'sizeScale')) {
        nextOptions.sizeScale = patch.sizeScale;
    }

    if (isPlainRecord(patch.rocket)) {
        nextOptions.rocket = mergeDefined(nextOptions.rocket ?? {}, patch.rocket);
    }
    if (isPlainRecord(patch.rocketTailEmbers)) {
        nextOptions.rocketTailEmbers = mergeDefined(nextOptions.rocketTailEmbers ?? {}, patch.rocketTailEmbers);
    }
    if (isPlainRecord(patch.burstForms)) {
        nextOptions.burstForms = mergeDefined(nextOptions.burstForms ?? {}, patch.burstForms);
    }
    if (isPlainRecord(patch.burstSparks)) {
        nextOptions.burstSparks = mergeDefined(nextOptions.burstSparks ?? {}, patch.burstSparks);
    }
    if (isPlainRecord(patch.burstCenterFlash)) {
        nextOptions.burstCenterFlash = mergeDefined(nextOptions.burstCenterFlash ?? {}, patch.burstCenterFlash);
    }
    if (isPlainRecord(patch.burstTwinkleCloud)) {
        nextOptions.burstTwinkleCloud = mergeDefined(nextOptions.burstTwinkleCloud ?? {}, patch.burstTwinkleCloud);
    }

    return nextOptions;
}

function resolveLifecycleHook(callback, fallback = null) {
    if (callback === null) {
        return null;
    }

    if (typeof callback === 'function') {
        return callback;
    }

    return fallback;
}

function resolveLifecycleHooks(options = {}, fallbackHooks = {}) {
    return {
        onStart: resolveLifecycleHook(options.onStart, fallbackHooks.onStart ?? null),
        onStop: resolveLifecycleHook(options.onStop, fallbackHooks.onStop ?? null),
        onFinish: resolveLifecycleHook(options.onFinish, fallbackHooks.onFinish ?? null),
    };
}

function invokeLifecycleHook(callback, engine) {
    if (typeof callback !== 'function') {
        return;
    }

    try {
        callback(engine);
    } catch {
        // Keep runtime lifecycle stable even when user hooks throw.
    }
}

function applyTimeScaleFromLaunchOptions(engine, options) {
    if (!isPlainRecord(options) || !hasOwnOption(options, 'timeScale')) {
        return;
    }

    const nextTimeScale = Number(options.timeScale);
    if (!Number.isFinite(nextTimeScale)) {
        return;
    }

    engine.updateOptions({ timeScale: nextTimeScale });
}

function shouldSkipHiddenLaunch(engine) {
    return lifecycle.isDocumentHidden(engine);
}

function mergeConfettiOptions(engineOverrides = {}, launchOverrides = {}) {
    const safeEngineOverrides = isPlainRecord(engineOverrides) ? engineOverrides : {};
    const safeLaunchOverrides = isPlainRecord(launchOverrides) ? launchOverrides : {};

    return {
        ...DEFAULT_CONFETTI_OPTIONS,
        ...safeEngineOverrides,
        ...safeLaunchOverrides,
        rocket: {
            ...DEFAULT_CONFETTI_OPTIONS.rocket,
            ...(isPlainRecord(safeEngineOverrides.rocket) ? safeEngineOverrides.rocket : {}),
            ...(isPlainRecord(safeLaunchOverrides.rocket) ? safeLaunchOverrides.rocket : {}),
            enabled: false,
        },
        rocketTailEmbers: {
            ...DEFAULT_CONFETTI_OPTIONS.rocketTailEmbers,
            ...(isPlainRecord(safeEngineOverrides.rocketTailEmbers) ? safeEngineOverrides.rocketTailEmbers : {}),
            ...(isPlainRecord(safeLaunchOverrides.rocketTailEmbers) ? safeLaunchOverrides.rocketTailEmbers : {}),
        },
        burstForms: {
            ...DEFAULT_CONFETTI_OPTIONS.burstForms,
            ...(isPlainRecord(safeEngineOverrides.burstForms) ? safeEngineOverrides.burstForms : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstForms) ? safeLaunchOverrides.burstForms : {}),
        },
        burstSparks: {
            ...DEFAULT_CONFETTI_OPTIONS.burstSparks,
            ...(isPlainRecord(safeEngineOverrides.burstSparks) ? safeEngineOverrides.burstSparks : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstSparks) ? safeLaunchOverrides.burstSparks : {}),
        },
        burstCenterFlash: {
            ...DEFAULT_CONFETTI_OPTIONS.burstCenterFlash,
            ...(isPlainRecord(safeEngineOverrides.burstCenterFlash) ? safeEngineOverrides.burstCenterFlash : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstCenterFlash) ? safeLaunchOverrides.burstCenterFlash : {}),
        },
        burstTwinkleCloud: {
            ...DEFAULT_CONFETTI_OPTIONS.burstTwinkleCloud,
            ...(isPlainRecord(safeEngineOverrides.burstTwinkleCloud) ? safeEngineOverrides.burstTwinkleCloud : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstTwinkleCloud) ? safeLaunchOverrides.burstTwinkleCloud : {}),
        },
    };
}

function mergePresetLaunchOptions(presetOptions = {}, launchOverrides = {}) {
    const safePresetOptions = isPlainRecord(presetOptions) ? presetOptions : {};
    const safeLaunchOverrides = isPlainRecord(launchOverrides) ? launchOverrides : {};

    return {
        count: safeLaunchOverrides.count ?? safePresetOptions.count,
        timeScale: safeLaunchOverrides.timeScale ?? safePresetOptions.timeScale,
        sizeScale: safeLaunchOverrides.sizeScale ?? safePresetOptions.sizeScale,
        simple: safeLaunchOverrides.simple ?? safePresetOptions.simple,
        rocket: {
            ...(isPlainRecord(safePresetOptions.rocket) ? safePresetOptions.rocket : {}),
            ...(isPlainRecord(safeLaunchOverrides.rocket) ? safeLaunchOverrides.rocket : {}),
        },
        rocketTailEmbers: {
            ...(isPlainRecord(safePresetOptions.rocketTailEmbers) ? safePresetOptions.rocketTailEmbers : {}),
            ...(isPlainRecord(safeLaunchOverrides.rocketTailEmbers) ? safeLaunchOverrides.rocketTailEmbers : {}),
        },
        burstForms: {
            ...(isPlainRecord(safePresetOptions.burstForms) ? safePresetOptions.burstForms : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstForms) ? safeLaunchOverrides.burstForms : {}),
        },
        burstSparks: {
            ...(isPlainRecord(safePresetOptions.burstSparks) ? safePresetOptions.burstSparks : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstSparks) ? safeLaunchOverrides.burstSparks : {}),
        },
        burstCenterFlash: {
            ...(isPlainRecord(safePresetOptions.burstCenterFlash) ? safePresetOptions.burstCenterFlash : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstCenterFlash) ? safeLaunchOverrides.burstCenterFlash : {}),
        },
        burstTwinkleCloud: {
            ...(isPlainRecord(safePresetOptions.burstTwinkleCloud) ? safePresetOptions.burstTwinkleCloud : {}),
            ...(isPlainRecord(safeLaunchOverrides.burstTwinkleCloud) ? safeLaunchOverrides.burstTwinkleCloud : {}),
        },
    };
}

export class FireworksEngine {
    constructor(options = {}) {
        this.runGeneration = 0;
        this.onBurstCallback = typeof options?.onBurst === 'function' ? options.onBurst : null;
        const normalizedOptions = normalizeGroupedPublicOptions(options);
        this.explicitLaunchOptions = extractExplicitLaunchOptions(options);
        const engineConfig = buildEngineConfig(normalizedOptions);
        const {
            refs,
            toggles,
            timeScale,
            sizeScale,
            rocket,
            rocketTailEmbers,
            burstForms,
            burstSparks,
            burstCenterFlash,
            burstTwinkleCloud,
            performance,
        } = engineConfig;

        this.documentRef = refs.documentRef;
        this.windowRef = refs.windowRef;
        this.rootRef = refs.rootRef;
        this.prefersReducedMotionRef = refs.prefersReducedMotionRef;
        this.requestAnimationFrameRef = refs.requestAnimationFrameRef;
        this.cancelAnimationFrameRef = refs.cancelAnimationFrameRef;
        this.setTimeoutRef = refs.setTimeoutRef;
        this.clearTimeoutRef = refs.clearTimeoutRef;
        this.nowRef = refs.nowRef;
        this.maxDevicePixelRatio = refs.maxDevicePixelRatio;
        this.canvasZIndex = refs.canvasZIndex;

        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;

        this.particles = [];
        this.formPool = [];
        this.sparkPool = [];
        this.emberPool = [];
        this.spriteCache = new Map();
        this.rockets = [];
        this.flashes = [];
        this.twinkleClouds = [];
        this.burstQueue = [];
        this.running = false;
        this.rafId = null;
        this.lastTime = 0;
        this.timeoutIds = new Set();
        this.pendingStartConfig = null;
        this.hasResizeListener = false;
        this.hasResizeObserver = false;
        this.resizeObserver = null;
        this.hasDomReadyListener = false;
        this.defaultLifecycleHooks = resolveLifecycleHooks(normalizedOptions);
        this.activeLifecycleHooks = { ...this.defaultLifecycleHooks };
        this.finishLifecycleNotified = false;

        this.enableBurstQueueThrottling = toggles.enableBurstQueueThrottling;
        this.timeScale = timeScale;
        this.sizeScale = sizeScale;

        this.rocket = rocket;
        this.rocketTailEmbers = rocketTailEmbers;
        this.burstForms = burstForms;
        this.burstSparks = burstSparks;
        this.burstCenterFlash = burstCenterFlash;
        this.burstTwinkleCloud = burstTwinkleCloud;

        this.performance = performance;
        this.maxBurstParticlesPerFrame = this.performance.maxBurstParticlesPerFrame;
        this.particlePressureThreshold = this.performance.particlePressureThreshold;
        this.fastRectRadiusThreshold = this.performance.fastRectRadiusThreshold;
        this.renderPressureMode = false;
        this.renderCachesClearedForIdle = true;

        this.resize = this.resize.bind(this);
        this.loopFrame = (now) => renderLoop(this, now);
        this.handleDOMContentLoaded = () => lifecycle.handleDOMContentLoaded(this);
    }

    resize() {
        lifecycle.resizeCanvas(this);
    }

    launchRocket(options = {}) {
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        applyTimeScaleFromLaunchOptions(this, options);
        return launchRocket(this, options);
    }

    boom(x, y, options = {}) {
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        applyTimeScaleFromLaunchOptions(this, options);
        return launchRocketAt(this, x, y, options);
    }

    burst(targetX, targetY, options = {}) {
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        applyTimeScaleFromLaunchOptions(this, options);
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
            return false;
        }

        if (this.running) {
            return launchBurst(this, targetX, targetY, options);
        }

        return launchRocketAt(this, targetX, targetY, {
            ...options,
            rocket: {
                ...options.rocket,
                enabled: false,
            },
        });
    }

    confetti(targetX, targetY, options = {}) {
        return this.burst(targetX, targetY, mergeConfettiOptions(this.explicitLaunchOptions, options));
    }

    launchRocketAt(targetX, targetY, options = {}) {
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        applyTimeScaleFromLaunchOptions(this, options);
        return launchRocketAt(this, targetX, targetY, options);
    }

    launchPresetAt(name, targetX, targetY, options = {}) {
        if (options?.trackBurstSequence === true && !supportsSequenceLaunch(this, name, options)) {
            return false;
        }
        const generation = this.runGeneration;
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
            return false;
        }

        if (!lifecycle.ensureCanvas(this)) {
            return false;
        }

        const launchPreset = resolveFireworksLaunchPreset(name);
        if (launchPreset) {
            const mergedOptions = mergePresetLaunchOptions(launchPreset.options ?? {}, options);
            const count = Number.isFinite(mergedOptions.count)
                ? Math.max(0, Math.floor(mergedOptions.count))
                : 1;
            if (count <= 0) {
                return false;
            }

            const launchOptions = { ...mergedOptions };
            delete launchOptions.count;
            delete launchOptions.trackBurstSequence;
            if (options.trackBurstSequence === true) {
                launchOptions[BURST_SEQUENCE] = createBurstSequence(this);
            }

            applyTimeScaleFromLaunchOptions(this, launchOptions);

            let launched = false;
            for (let index = 0; index < count; index += 1) {
                const nextLaunched = typeof launchPreset.run === 'function'
                    ? launchPreset.run(this, targetX, targetY, launchOptions)
                    : false;
                launched = launched || nextLaunched;
                if (this.runGeneration !== generation || !nextLaunched) {
                    break;
                }
            }

            if (!launched) discardBurstSequence(this, launchOptions[BURST_SEQUENCE]);
            return launched;
        }

        const presetOptions = resolveFireworksEnginePreset(name);
        const mergedOptions = mergePresetLaunchOptions(presetOptions, options);
        const count = Number.isFinite(mergedOptions.count)
            ? Math.max(0, Math.floor(mergedOptions.count))
            : 1;
        if (count <= 0) {
            return false;
        }

        const launchOptions = { ...mergedOptions };
        delete launchOptions.count;
        const shouldUseRocketFlight = presetOptions.mode === 'rocket'
            && launchOptions.rocket?.enabled !== false;
        if (!shouldUseRocketFlight) {
            launchOptions.rocket = {
                ...(isPlainRecord(launchOptions.rocket) ? launchOptions.rocket : {}),
                enabled: false,
            };
        }

        applyTimeScaleFromLaunchOptions(this, launchOptions);
        let launched = false;
        for (let index = 0; index < count; index += 1) {
            const nextLaunched = launchRocketAt(this, targetX, targetY, launchOptions);
            launched = launched || nextLaunched;
            if (this.runGeneration !== generation || !nextLaunched) {
                break;
            }
        }

        return launched;
    }

    launchRocketFromTo(startX, startY, targetX, targetY, options = {}) {
        if (shouldSkipHiddenLaunch(this)) {
            return false;
        }
        applyTimeScaleFromLaunchOptions(this, options);
        return launchRocketFromTo(this, startX, startY, targetX, targetY, options);
    }

    updateOptions(options = {}) {
        if (!isPlainRecord(options)) {
            return;
        }
        this.explicitLaunchOptions = mergeExplicitLaunchOptions(this.explicitLaunchOptions, options);

        const normalizedOptions = normalizeGroupedPublicOptions(options);
        const nextOptions = {
            timeScale: this.timeScale,
            sizeScale: this.sizeScale,
            performance: {
                enableBurstQueueThrottling: this.enableBurstQueueThrottling,
                maxBurstParticlesPerFrame: this.maxBurstParticlesPerFrame,
                particlePressureThreshold: this.particlePressureThreshold,
                fastRectRadiusThreshold: this.fastRectRadiusThreshold,
            },
            rocket: this.rocket,
            rocketTailEmbers: this.rocketTailEmbers,
            burstForms: this.burstForms,
            burstSparks: this.burstSparks,
            burstCenterFlash: this.burstCenterFlash,
            burstTwinkleCloud: this.burstTwinkleCloud,
        };

        let hasConfigPatch = false;

        if (hasOwnOption(options, 'timeScale')) {
            nextOptions.timeScale = normalizedOptions.timeScale;
            hasConfigPatch = true;
        }

        if (hasOwnOption(options, 'sizeScale')) {
            nextOptions.sizeScale = normalizedOptions.sizeScale;
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.performance)) {
            nextOptions.performance = mergeDefined(
                nextOptions.performance,
                normalizedOptions.performance,
            );
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.rocket)) {
            nextOptions.rocket = mergeDefined(nextOptions.rocket, normalizedOptions.rocket);
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.rocketTailEmbers)) {
            nextOptions.rocketTailEmbers = mergeDefined(
                nextOptions.rocketTailEmbers,
                normalizedOptions.rocketTailEmbers,
            );
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.burstForms)) {
            nextOptions.burstForms = mergeDefined(
                nextOptions.burstForms,
                normalizedOptions.burstForms,
            );
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.burstSparks)) {
            nextOptions.burstSparks = mergeDefined(
                nextOptions.burstSparks,
                normalizedOptions.burstSparks,
            );
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.burstCenterFlash)) {
            nextOptions.burstCenterFlash = mergeDefined(
                nextOptions.burstCenterFlash,
                normalizedOptions.burstCenterFlash,
            );
            hasConfigPatch = true;
        }

        if (isPlainRecord(options.burstTwinkleCloud)) {
            nextOptions.burstTwinkleCloud = mergeDefined(
                nextOptions.burstTwinkleCloud,
                normalizedOptions.burstTwinkleCloud,
            );
            hasConfigPatch = true;
        }

        if (hasConfigPatch) {
            const nextConfig = buildEngineConfig(nextOptions);

            this.timeScale = nextConfig.timeScale;
            this.sizeScale = nextConfig.sizeScale;
            this.enableBurstQueueThrottling = nextConfig.toggles.enableBurstQueueThrottling;

            this.rocket = nextConfig.rocket;
            this.rocketTailEmbers = nextConfig.rocketTailEmbers;
            this.burstForms = nextConfig.burstForms;
            this.burstSparks = nextConfig.burstSparks;
            this.burstCenterFlash = nextConfig.burstCenterFlash;
            this.burstTwinkleCloud = nextConfig.burstTwinkleCloud;

            this.performance = nextConfig.performance;
            this.maxBurstParticlesPerFrame = this.performance.maxBurstParticlesPerFrame;
            this.particlePressureThreshold = this.performance.particlePressureThreshold;
            this.fastRectRadiusThreshold = this.performance.fastRectRadiusThreshold;
            if (!supportsSequenceConfig(this)) invalidateBurstSequences(this);
        }

        if (
            hasOwnOption(options, 'onStart')
            || hasOwnOption(options, 'onStop')
            || hasOwnOption(options, 'onFinish')
        ) {
            this.defaultLifecycleHooks = resolveLifecycleHooks(options, this.defaultLifecycleHooks);
            this.activeLifecycleHooks = resolveLifecycleHooks(options, this.activeLifecycleHooks);
        }
    }

    // Note: Renderer logic is decoupled; use engine directly in renderer for performance.

    finishWhenDone() {
        const generation = this.runGeneration;
        const check = () => {
            if (this.runGeneration !== generation || !this.running) {
                return;
            }

            if (
                this.particles.length === 0
                && this.rockets.length === 0
                && this.flashes.length === 0
                && this.twinkleClouds.length === 0
                && this.burstQueue.length === 0
            ) {
                if (!this.finishLifecycleNotified) {
                    this.finishLifecycleNotified = true;
                    invokeLifecycleHook(this.activeLifecycleHooks.onFinish, this);
                }
                if (this.runGeneration === generation) this.stop(false);
                return;
            }

            lifecycle.scheduleTimeout(
                this,
                check,
                lifecycle.resolveScaledDelay(this, FINISH_WHEN_DONE_POLL_MS),
            );
        };

        check();
    }

    start(config = {}) {
        const normalizedConfig = normalizeGroupedPublicOptions(config);
        if (hasOwnOption(config, 'timeScale')) {
            this.timeScale = normalizedConfig.timeScale;
        }
        if (lifecycle.shouldReduceMotion(this)) {
            this.stop();
            return false;
        }

        if (!lifecycle.ensureCanvas(this)) {
            lifecycle.schedulePendingStart(this, normalizedConfig);
            return false;
        }

        lifecycle.clearPendingStart(this);
        this.stop(false);
        this.activeLifecycleHooks = resolveLifecycleHooks(normalizedConfig, this.defaultLifecycleHooks);
        this.finishLifecycleNotified = false;

        if (!lifecycle.startLoop(this)) {
            this.activeLifecycleHooks = { ...this.defaultLifecycleHooks };
            return false;
        }

        if (normalizedConfig.mode === 'rocket') {
            const rocketCount = normalizedConfig.rocketCount ?? START_MODE_DEFAULTS.rocket.rocketCount;
            const rocketDelay = normalizedConfig.rocketDelay ?? START_MODE_DEFAULTS.rocket.rocketDelayMs;

            for (let index = 0; index < rocketCount; index += 1) {
                lifecycle.scheduleTimeout(this, () => {
                    launchRocket(this, normalizedConfig);
                }, lifecycle.resolveScaledDelay(this, index * rocketDelay));
            }
            const finishDelay = normalizedConfig.totalDuration ?? START_MODE_DEFAULTS.rocket.totalDurationMs;
            lifecycle.scheduleTimeout(
                this,
                () => this.finishWhenDone(),
                lifecycle.resolveScaledDelay(this, finishDelay),
            );
        } else {
            const bursts = normalizedConfig.bursts ?? START_MODE_DEFAULTS.burst.bursts;
            const duration = normalizedConfig.duration ?? START_MODE_DEFAULTS.burst.durationMs;

            for (let index = 0; index < bursts; index += 1) {
                const delay = (duration / Math.max(bursts, 1)) * index;
                lifecycle.scheduleTimeout(this, () => {
                    const x = randomRange(
                        this.width * START_MODE_DEFAULTS.burst.xMinRatio,
                        this.width * START_MODE_DEFAULTS.burst.xMaxRatio,
                    );
                    const y = randomRange(
                        this.height * START_MODE_DEFAULTS.burst.yMinRatio,
                        this.height * START_MODE_DEFAULTS.burst.yMaxRatio,
                    );
                    launchBurst(this, x, y, normalizedConfig);
                }, lifecycle.resolveScaledDelay(this, delay));
            }
            const finishDelay = duration + START_MODE_DEFAULTS.burst.finishDelayMs;
            lifecycle.scheduleTimeout(
                this,
                () => this.finishWhenDone(),
                lifecycle.resolveScaledDelay(this, finishDelay),
            );
        }

        invokeLifecycleHook(this.activeLifecycleHooks.onStart, this);
        return true;
    }

    startPreset(name) {
        return this.start(resolveFireworksEnginePreset(name));
    }

    stop(clearCanvas = true) {
        invalidateBurstSequences(this);
        this.runGeneration += 1;
        const wasRunning = this.running;
        this.running = false;
        lifecycle.clearPendingStart(this);
        lifecycle.clearScheduledTimeouts(this);

        const cancelAnimationFrameFn = lifecycle.getCancelAnimationFrame(this);
        if (this.rafId !== null && typeof cancelAnimationFrameFn === 'function') {
            cancelAnimationFrameFn(this.rafId);
        }
        this.rafId = null;

        this.particles.length = 0;
        this.formPool.length = 0;
        this.sparkPool.length = 0;
        this.emberPool.length = 0;
        this.rockets.length = 0;
        this.burstQueue.length = 0;
        this.flashes.length = 0;
        this.twinkleClouds.length = 0;
        this.spriteCache.clear();
        this.renderCachesClearedForIdle = true;

        if (this.ctx && clearCanvas) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        if (this.canvas) {
            this.canvas.style.display = 'none';
        }

        if (wasRunning) {
            invokeLifecycleHook(this.activeLifecycleHooks.onStop, this);
        }

        this.activeLifecycleHooks = { ...this.defaultLifecycleHooks };
        this.finishLifecycleNotified = false;
    }

    destroy() {
        this.stop();
        lifecycle.removeResizeObserver(this);
        lifecycle.removeResizeListener(this);

        if (this.canvas) {
            const parentNode = this.canvas.parentNode;
            if (parentNode) {
                parentNode.removeChild(this.canvas);
            } else {
                this.canvas.remove?.();
            }
            this.canvas = null;
        }

        this.spriteCache.clear();
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
    }
}

export function createFireworksEngine(options) {
    return new FireworksEngine(options);
}

export default FireworksEngine;
