import {
    DEFAULT_BURST_CENTER_FLASH_ATTACK,
    DEFAULT_BURST_CENTER_FLASH_COLOR,
    DEFAULT_BURST_CENTER_FLASH_COLOR_MODE,
    DEFAULT_BURST_CENTER_FLASH_ENABLED,
    DEFAULT_BURST_CENTER_FLASH_END_SIZE,
    DEFAULT_BURST_CENTER_FLASH_INNER_STOP,
    DEFAULT_BURST_CENTER_FLASH_PEAK_ALPHA,
    DEFAULT_BURST_CENTER_FLASH_FADE,
    DEFAULT_BURST_CENTER_FLASH_START_SIZE,
    DEFAULT_BURST_COLOR_MODE,
    DEFAULT_BURST_FORMS_COUNT,
    DEFAULT_BURST_FORMS_ENABLED,
    DEFAULT_BURST_FORMS_GLYPH,
    DEFAULT_BURST_FORMS_GRAVITY,
    DEFAULT_BURST_FORMS_LIFE_MAX,
    DEFAULT_BURST_FORMS_LIFE_MIN,
    DEFAULT_BURST_FORMS_SPIN,
    DEFAULT_BURST_FORMS_SPIN_DURATION,
    DEFAULT_BURST_FORMS_SPIN_PAUSE,
    DEFAULT_BURST_FORMS_HIGHLIGHT,
    DEFAULT_BURST_FORMS_HIGHLIGHT_ANGLE_DEG,
    DEFAULT_BURST_FORMS_HIGHLIGHT_WIDTH,
    DEFAULT_BURST_FORMS_WOBBLE,
    DEFAULT_BURST_FORMS_DIRECTION_DEG,
    DEFAULT_BURST_FORMS_CONE_DEG,
    DEFAULT_BURST_FORMS_SHAPE,
    DEFAULT_BURST_FORMS_SIZE_MAX,
    DEFAULT_BURST_FORMS_SIZE_MIN,
    DEFAULT_BURST_FORMS_SPEED_MAX,
    DEFAULT_BURST_FORMS_SPEED_MIN,
    DEFAULT_BURST_PALETTE,
    DEFAULT_BURST_SINGLE_COLOR,
    DEFAULT_BURST_SPARK_COUNT_RATIO,
    DEFAULT_BURST_SPARK_GRAVITY,
    DEFAULT_BURST_SPARK_LENGTH,
    DEFAULT_BURST_SPARK_DIRECTION_DEG,
    DEFAULT_BURST_SPARK_CONE_DEG,
    DEFAULT_BURST_SPARK_TAIL_SCALE,
    DEFAULT_BURST_SPARK_SHAPE,
    DEFAULT_BURST_SPARK_THICKNESS,
    DEFAULT_BURST_SPARKS_ENABLED,
    DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS,
    DEFAULT_BURST_TWINKLE_CLOUD_COUNT,
    DEFAULT_BURST_TWINKLE_CLOUD_DURATION,
    DEFAULT_BURST_TWINKLE_CLOUD_ENABLED,
    DEFAULT_BURST_TWINKLE_CLOUD_RADIUS,
    DEFAULT_BURST_TWINKLE_CLOUD_SIZE,
    DEFAULT_BURST_TWINKLE_CLOUD_SPAWN_SPREAD,
    DEFAULT_BURST_TWINKLE_CLOUD_START_DELAY,
    DEFAULT_BURST_TWINKLE_CLOUD_TWINKLE_LIFE,
    DEFAULT_ROCKET_ENABLED,
    DEFAULT_ROCKET_FINAL_STREAK_LENGTH,
    DEFAULT_ROCKET_PALETTE,
    DEFAULT_ROCKET_STREAK_LENGTH,
    DEFAULT_ROCKET_SPEED,
    DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS,
    DEFAULT_ROCKET_TAIL_EMBERS_COUNT,
    DEFAULT_ROCKET_TAIL_EMBERS_ENABLED,
    DEFAULT_ROCKET_TAIL_EMBERS_FADE,
    DEFAULT_ROCKET_TAIL_EMBERS_SIZE,
    DEFAULT_ROCKET_TAIL_EMBERS_SPEED,
    DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_X,
    DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_Y,
    DEFAULT_ROCKET_THICKNESS,
    BURST_SPARK_COUNT_BASE,
    BURST_SPARK_LIFE_MAX_BASE,
    BURST_SPARK_LIFE_MIN_BASE,
    BURST_SPARK_SPEED_MAX_BASE,
    BURST_SPARK_SPEED_MIN_BASE,
} from './defaults.js';
import { randomRange } from './mathResolvers.js';
import { resolveScaledDelay, scheduleTimeout } from './runtimeLifecycle.js';
import { isPlainRecord } from './valueNormalizers.js';

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.freeze(value);
    Object.values(value).forEach((entry) => {
        deepFreeze(entry);
    });
    return value;
}

function mergeLaunchRecipeOptions(baseOptions = {}, patch = {}) {
    const next = {
        ...baseOptions,
        ...patch,
    };

    const keys = [
        'rocket',
        'rocketTailEmbers',
        'burstForms',
        'burstSparks',
        'burstCenterFlash',
        'burstTwinkleCloud',
    ];

    for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const baseGroup = isPlainRecord(baseOptions[key]) ? baseOptions[key] : {};
        const patchGroup = isPlainRecord(patch[key]) ? patch[key] : null;

        if (patchGroup) {
            next[key] = {
                ...baseGroup,
                ...patchGroup,
            };
        } else if (isPlainRecord(baseOptions[key])) {
            next[key] = { ...baseGroup };
        }
    }

    return next;
}

function createRocketCascade(overrides = {}) {
    return {
        bursts: 0,
        delay: 160,
        spreadX: 152,
        spreadY: 151,
        ...overrides,
    };
}

function createRocketConfig(overrides = {}) {
    const { cascade, ...rocketOverrides } = overrides;

    return {
        enabled: DEFAULT_ROCKET_ENABLED,
        colorMode: DEFAULT_BURST_COLOR_MODE,
        singleColor: DEFAULT_BURST_SINGLE_COLOR,
        streakLength: DEFAULT_ROCKET_STREAK_LENGTH,
        finalStreakLength: DEFAULT_ROCKET_FINAL_STREAK_LENGTH,
        thickness: DEFAULT_ROCKET_THICKNESS,
        speed: DEFAULT_ROCKET_SPEED,
        ...rocketOverrides,
        cascade: createRocketCascade(cascade),
    };
}

function createRocketTailEmbersConfig(overrides = {}) {
    return {
        enabled: DEFAULT_ROCKET_TAIL_EMBERS_ENABLED,
        count: DEFAULT_ROCKET_TAIL_EMBERS_COUNT,
        brightness: DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS,
        fade: DEFAULT_ROCKET_TAIL_EMBERS_FADE,
        spreadX: DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_X,
        spreadY: DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_Y,
        speed: DEFAULT_ROCKET_TAIL_EMBERS_SPEED,
        size: DEFAULT_ROCKET_TAIL_EMBERS_SIZE,
        ...overrides,
    };
}

function createBurstFormsConfig(overrides = {}) {
    return {
        enabled: DEFAULT_BURST_FORMS_ENABLED,
        count: DEFAULT_BURST_FORMS_COUNT,
        speedMin: DEFAULT_BURST_FORMS_SPEED_MIN,
        speedMax: DEFAULT_BURST_FORMS_SPEED_MAX,
        gravity: DEFAULT_BURST_FORMS_GRAVITY,
        lifeMin: DEFAULT_BURST_FORMS_LIFE_MIN,
        lifeMax: DEFAULT_BURST_FORMS_LIFE_MAX,
        sizeMin: DEFAULT_BURST_FORMS_SIZE_MIN,
        sizeMax: DEFAULT_BURST_FORMS_SIZE_MAX,
        spin: DEFAULT_BURST_FORMS_SPIN,
        spinDuration: DEFAULT_BURST_FORMS_SPIN_DURATION,
        spinPause: DEFAULT_BURST_FORMS_SPIN_PAUSE,
        highlight: DEFAULT_BURST_FORMS_HIGHLIGHT,
        highlightAngleDeg: DEFAULT_BURST_FORMS_HIGHLIGHT_ANGLE_DEG,
        highlightWidth: DEFAULT_BURST_FORMS_HIGHLIGHT_WIDTH,
        wobble: DEFAULT_BURST_FORMS_WOBBLE,
        directionDeg: DEFAULT_BURST_FORMS_DIRECTION_DEG,
        coneDeg: DEFAULT_BURST_FORMS_CONE_DEG,
        palette: DEFAULT_BURST_PALETTE,
        shape: DEFAULT_BURST_FORMS_SHAPE,
        glyph: DEFAULT_BURST_FORMS_GLYPH,
        colorMode: DEFAULT_BURST_COLOR_MODE,
        singleColor: DEFAULT_BURST_SINGLE_COLOR,
        ...overrides,
    };
}

function createBurstSparksConfig(overrides = {}) {
    return {
        enabled: DEFAULT_BURST_SPARKS_ENABLED,
        count: BURST_SPARK_COUNT_BASE * DEFAULT_BURST_SPARK_COUNT_RATIO,
        length: DEFAULT_BURST_SPARK_LENGTH,
        tailScale: DEFAULT_BURST_SPARK_TAIL_SCALE,
        thickness: DEFAULT_BURST_SPARK_THICKNESS,
        speedMin: BURST_SPARK_SPEED_MIN_BASE,
        speedMax: BURST_SPARK_SPEED_MAX_BASE,
        gravity: DEFAULT_BURST_SPARK_GRAVITY,
        lifeMin: BURST_SPARK_LIFE_MIN_BASE,
        lifeMax: BURST_SPARK_LIFE_MAX_BASE,
        directionDeg: DEFAULT_BURST_SPARK_DIRECTION_DEG,
        coneDeg: DEFAULT_BURST_SPARK_CONE_DEG,
        palette: DEFAULT_BURST_PALETTE,
        shape: DEFAULT_BURST_SPARK_SHAPE,
        colorMode: DEFAULT_BURST_COLOR_MODE,
        singleColor: DEFAULT_BURST_SINGLE_COLOR,
        ...overrides,
    };
}

function createBurstCenterFlashConfig(overrides = {}) {
    return {
        enabled: DEFAULT_BURST_CENTER_FLASH_ENABLED,
        startSize: DEFAULT_BURST_CENTER_FLASH_START_SIZE,
        endSize: DEFAULT_BURST_CENTER_FLASH_END_SIZE,
        peakAlpha: DEFAULT_BURST_CENTER_FLASH_PEAK_ALPHA,
        attack: DEFAULT_BURST_CENTER_FLASH_ATTACK,
        fade: DEFAULT_BURST_CENTER_FLASH_FADE,
        colorMode: DEFAULT_BURST_CENTER_FLASH_COLOR_MODE,
        color: DEFAULT_BURST_CENTER_FLASH_COLOR,
        innerStop: DEFAULT_BURST_CENTER_FLASH_INNER_STOP,
        ...overrides,
    };
}

function createBurstTwinkleCloudConfig(overrides = {}) {
    return {
        enabled: DEFAULT_BURST_TWINKLE_CLOUD_ENABLED,
        palette: DEFAULT_BURST_PALETTE,
        count: DEFAULT_BURST_TWINKLE_CLOUD_COUNT,
        radius: DEFAULT_BURST_TWINKLE_CLOUD_RADIUS,
        startDelay: DEFAULT_BURST_TWINKLE_CLOUD_START_DELAY,
        duration: DEFAULT_BURST_TWINKLE_CLOUD_DURATION,
        twinkleLife: DEFAULT_BURST_TWINKLE_CLOUD_TWINKLE_LIFE,
        brightness: DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS,
        size: DEFAULT_BURST_TWINKLE_CLOUD_SIZE,
        spawnSpread: DEFAULT_BURST_TWINKLE_CLOUD_SPAWN_SPREAD,
        ...overrides,
    };
}

function createBurstBundle({
    palette = DEFAULT_BURST_PALETTE,
    burstForms = {},
    burstSparks = {},
    burstCenterFlash = {},
    burstTwinkleCloud = {},
} = {}) {
    return {
        burstForms: createBurstFormsConfig({ palette, ...burstForms }),
        burstSparks: createBurstSparksConfig({ palette, ...burstSparks }),
        burstCenterFlash: createBurstCenterFlashConfig(burstCenterFlash),
        burstTwinkleCloud: createBurstTwinkleCloudConfig(burstTwinkleCloud),
    };
}

export const FIREWORKS_ENGINE_PRESETS = deepFreeze({
    base: {
        timeScale: 1,
        bursts: 1,
        duration: 1200,
        simple: false,
        rocket: createRocketConfig(),
        rocketTailEmbers: createRocketTailEmbersConfig(),
        ...createBurstBundle(),
    },
    rocket: {
        timeScale: 1,
        mode: 'rocket',
        rocketCount: 2,
        rocketDelay: 240,
        totalDuration: 2200,
        rocket: createRocketConfig({
            durationMin: 0.72,
            durationMax: 0.95,
        }),
        rocketTailEmbers: createRocketTailEmbersConfig(),
        ...createBurstBundle({ palette: DEFAULT_ROCKET_PALETTE }),
    },
    cascade: {
        timeScale: 1,
        mode: 'rocket',
        rocketCount: 2,
        rocketDelay: 200,
        totalDuration: 2800,
        rocket: createRocketConfig({
            durationMin: 0.74,
            durationMax: 1.02,
            cascade: {
                bursts: 3,
                burst: createBurstBundle(),
            },
        }),
        rocketTailEmbers: createRocketTailEmbersConfig(),
        ...createBurstBundle(),
    },
    finale: {
        timeScale: 1,
        mode: 'rocket',
        rocketCount: 20,
        rocketDelay: 180,
        totalDuration: 2600,
        rocket: createRocketConfig({
            durationMin: 0.74,
            durationMax: 1.02,
        }),
        rocketTailEmbers: createRocketTailEmbersConfig(),
        ...createBurstBundle(),
    },
});

export function resolveFireworksEnginePreset(name) {
    if (typeof name === 'string' && FIREWORKS_ENGINE_PRESETS[name]) {
        return FIREWORKS_ENGINE_PRESETS[name];
    }
    return FIREWORKS_ENGINE_PRESETS.base;
}

function runDirectBurst(engine, targetX, targetY, options) {
    return engine.burst(targetX, targetY, options);
}

function runRocketLaunch(engine, targetX, targetY, options) {
    return engine.launchRocketAt(targetX, targetY, options);
}

function runAchievementUnlock(engine, targetX, targetY, options) {
    const directions = [135, 90, 45];

    directions.forEach((directionDeg, index) => {
        scheduleTimeout(engine, () => {
            engine.confetti(
                targetX,
                targetY,
                mergeLaunchRecipeOptions(options, {
                    burstForms: {
                        directionDeg,
                    },
                }),
            );
        }, resolveScaledDelay(engine, index * 50));
    });

    return true;
}

function runSnowfall(engine, _targetX, _targetY, options) {
    const generation = engine.runGeneration;
    const flakesPerWave = 6;
    const waveDelayMs = 1500;

    const launchWave = () => {
        const stageWidth = engine.width;
        for (let flake = 0; flake < flakesPerWave; flake += 1) {
            const x = randomRange(0, stageWidth);
            const y = -10 - randomRange(0, 40);
            engine.burst(x, y, options);
            if (engine.runGeneration !== generation) return;
        }

        scheduleTimeout(engine, () => {
            if (!engine.running) {
                return;
            }

            launchWave();
        }, resolveScaledDelay(engine, waveDelayMs));
    };

    launchWave();

    return true;
}

function runLeafFall(engine, _targetX, _targetY, options) {
    const generation = engine.runGeneration;
    const leavesPerWave = 5;
    const waveDelayMs = 1200;

    const launchWave = () => {
        const stageWidth = engine.width;
        for (let leaf = 0; leaf < leavesPerWave; leaf += 1) {
            const x = randomRange(0, stageWidth);
            const y = -16 - randomRange(0, 60);
            engine.burst(x, y, options);
            if (engine.runGeneration !== generation) return;
        }

        scheduleTimeout(engine, () => {
            if (!engine.running) {
                return;
            }

            launchWave();
        }, resolveScaledDelay(engine, waveDelayMs));
    };

    launchWave();

    return true;
}

function runAmbientSparkle(engine, targetX, targetY, options) {
    const generation = engine.runGeneration;
    const pulseDelayMs = 8000;

    const launchPulse = () => {
        const centerX = Number.isFinite(targetX) ? targetX : engine.width * 0.5;
        const centerY = Number.isFinite(targetY) ? targetY : engine.height * 0.5;

        engine.launchRocketAt(centerX, centerY, options);
        if (engine.runGeneration !== generation) return;
        engine.launchRocketAt(
            centerX,
            centerY,
            mergeLaunchRecipeOptions(options, {
                burstTwinkleCloud: {
                    size: 2,
                },
            }),
        );

        if (engine.runGeneration !== generation) return;
        scheduleTimeout(engine, () => {
            if (!engine.running) {
                return;
            }

            launchPulse();
        }, resolveScaledDelay(engine, pulseDelayMs));
    };

    launchPulse();

    return true;
}

function runConfettiPop(engine, _targetX, _targetY, options) {
    const generation = engine.runGeneration;
    const stageWidth = engine.width;
    const stageHeight = engine.height;
    const cannons = [
        { x: -0.02, y: 0.5, directionDeg: 45 },
        { x: 1.01, y: 0.5, directionDeg: 135 },
    ];

    for (const { x, y, directionDeg } of cannons) {
        engine.confetti(
            stageWidth * x,
            stageHeight * y,
            mergeLaunchRecipeOptions(options, {
                burstForms: {
                    directionDeg,
                },
            }),
        );
        if (engine.runGeneration !== generation) return true;
    }

    return true;
}

export const FIREWORKS_LAUNCH_PRESETS = deepFreeze({
    'button-click': {
        options: {
            timeScale: 1.7,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: false,
            },
            burstSparks: {
                count: 30,
                length: 34,
                tailScale: 1.3,
                thickness: 2.5,
                speedMin: 50,
                speedMax: 230,
                gravity: 100,
                lifeMin: 1,
                lifeMax: 2,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runDirectBurst,
    },
    'success-burst': {
        options: {
            timeScale: 1.7,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                shape: 'glyph',
                count: 30,
                speedMin: 50,
                speedMax: 230,
                directionDeg: 0,
                gravity: 100,
                lifeMin: 1,
                lifeMax: 2,
                sizeMax: 4,
                spin: 0.4,
                spinCoverage: 0.5,
                wobble: 0.5,
            },
            burstSparks: {
                count: 30,
                length: 34,
                tailScale: 1.3,
                thickness: 2.5,
                speedMin: 100,
                speedMax: 230,
                gravity: 100,
                lifeMin: 1,
                lifeMax: 2,
            },
            burstCenterFlash: {
                startSize: 40,
                endSize: 1,
                peakAlpha: 0.4,
                attack: 0.75,
                colorMode: 'single',
                color: '#f7ff80',
                innerStop: 0.2,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runDirectBurst,
    },
    'win-celebration': {
        options: {
            timeScale: 1,
            rocket: {
                cascade: {
                    mode: 'rocket',
                    bursts: 3,
                    childBursts: 1,
                    childSpeedMin: 400,
                    delay: 160,
                    spreadX: 232,
                    spreadY: 239,
                },
            },
            burstForms: {
                directionDeg: 0,
            },
        },
        run: runRocketLaunch,
    },
    'achievement-unlock': {
        options: {
            timeScale: 3,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                count: 90,
                speedMin: 100,
                speedMax: 700,
                gravity: 100,
                lifeMin: 4,
                lifeMax: 7.4,
                sizeMin: 3.1,
                sizeMax: 4.2,
                spin: 0.3,
                wobble: 0.42,
                coneDeg: 40,
                shape: 'circle|square',
                spinCoverage: 0.92,
                highlight: 0.8,
                highlightAngleDeg: 20,
                highlightWidth: 0.3,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runAchievementUnlock,
    },
    'confetti-pop': {
        options: {
            timeScale: 3,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                count: 110,
                speedMin: 100,
                speedMax: 700,
                gravity: 95,
                lifeMin: 4,
                lifeMax: 7.4,
                sizeMin: 3.1,
                sizeMax: 4.2,
                spin: 0.3,
                wobble: 0.42,
                coneDeg: 40,
                shape: 'circle|square',
                spinCoverage: 0.92,
                highlight: 0.8,
                highlightAngleDeg: 20,
                highlightWidth: 0.3,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runConfettiPop,
    },
    'purchase-success': {
        options: {
            timeScale: 1,
            rocket: {
                cascade: {
                    mode: 'rocket',
                    bursts: 16,
                    childBursts: 1,
                    childSpeedMin: 400,
                    delay: 160,
                    spreadX: 232,
                    spreadY: 239,
                },
            },
            burstForms: {
                enabled: false,
            },
            burstSparks: {
                count: 54,
                tailScale: 1,
                thickness: 1,
                speedMin: 108,
                speedMax: 284,
                directionDeg: 0,
                gravity: 180,
                lifeMin: 0.8,
                lifeMax: 1.4,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runRocketLaunch,
    },
    'victory-finale': {
        options: {
            timeScale: 1.3,
            rocket: {
                cascade: {
                    mode: 'rocket',
                    bursts: 6,
                    childBursts: 3,
                    delay: 200,
                    childSpeedMin: 100,
                    childSpeedMax: 150,
                    spreadX: 150,
                    spreadY: 300,
                    childDirectionDeg: 90,
                    childConeDeg: 360,
                },
            },
        },
        run: runRocketLaunch,
    },
    snowfall: {
        options: {
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                count: 1,
                speedMin: 0,
                speedMax: 0,
                gravity: 60,
                lifeMin: 12,
                lifeMax: 140,
                sizeMin: 1.6,
                sizeMax: 4,
                spin: 0.6,
                wobble: 0.9,
                coneDeg: 20,
                palette: ['#ffffff', '#ffffff', '#ffffff', '#80dfff'],
                shape: 'glyph',
                glyph: '❄•',
                spinCoverage: 0.25,
                highlight: 0.22,
                highlightWidth: 0.25,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
            timeScale: 1,
            sizeScale: 1,
        },
        run: runSnowfall,
    },
    'leaf-fall': {
        options: {
            timeScale: 1,
            sizeScale: 1,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: true,
                shape: 'glyph',
                glyph: '🍂🍁',
                colorMode: 'palette',
                palette: ['#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#ff4d4d', '#c1ff00'],
                count: 1,
                speedMin: 0,
                speedMax: 0,
                gravity: 75,
                lifeMin: 20,
                lifeMax: 150,
                sizeMin: 3,
                sizeMax: 6,
                wobble: 0.9,
                spin: 0.1,
                spinCoverage: 0.6,
                spinDuration: 6,
                spinPause: 6,
                highlight: 0,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
        run: runLeafFall,
    },
    'ambient-sparkle': {
        options: {
            timeScale: 1,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: false,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                count: 3000,
                radius: 1000,
                startDelay: 0,
                duration: 60,
                twinkleLife: 2,
                brightness: 3,
                spawnSpread: 1,
            },
        },
        run: runAmbientSparkle,
    },
});

export function resolveFireworksLaunchPreset(name) {
    if (typeof name !== 'string') {
        return null;
    }

    return FIREWORKS_LAUNCH_PRESETS[name] || null;
}
