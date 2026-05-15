export const FIREWORKS_ENGINE_LAB_STORAGE_KEY = 'fireworksEngineLabSettings';
export const FIREWORKS_ENGINE_LAB_STORAGE_VERSION = 18;

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.freeze(value);
    Object.values(value).forEach((entry) => deepFreeze(entry));
    return value;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function resolveObject(value) {
    return value && typeof value === 'object' ? value : {};
}

function resolveBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}

function resolveFinite(value, fallback, min, max) {
    return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function resolveString(value, fallback, allowedValues = null) {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return fallback;
    }

    if (Array.isArray(allowedValues) && !allowedValues.includes(trimmed)) {
        return fallback;
    }

    return trimmed;
}

function resolveDelimitedTokenSet(value, fallback, allowedValues) {
    if (typeof value !== 'string') {
        return fallback;
    }

    const selectedTokens = [];
    const selectedSet = new Set();
    value.split('|').forEach((token) => {
        const trimmedToken = token.trim();
        if (!trimmedToken) {
            return;
        }
        if (!allowedValues.includes(trimmedToken) || selectedSet.has(trimmedToken)) {
            return;
        }

        selectedSet.add(trimmedToken);
        selectedTokens.push(trimmedToken);
    });

    if (selectedTokens.length === 0) {
        return fallback;
    }

    return selectedTokens.join('|');
}

function normalizeHexColor(color, fallback = '#ffd166') {
    if (typeof color !== 'string') {
        return fallback;
    }

    const match = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!match) {
        return fallback;
    }

    const normalized = match[1].length === 3
        ? match[1].split('').map((channel) => `${channel}${channel}`).join('')
        : match[1];

    return `#${normalized.toLowerCase()}`;
}

function normalizeGlyph(glyph, fallback = '★') {
    if (typeof glyph !== 'string') {
        return fallback;
    }

    const trimmed = glyph.trim();
    if (!trimmed) {
        return fallback;
    }

    return Array.from(trimmed).slice(0, 8).join('') || fallback;
}

function createStorage(storage = undefined) {
    if (storage !== undefined) {
        return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function'
            ? storage
            : null;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage || null;
    } catch {
        return null;
    }
}

export const FIREWORKS_ENGINE_LAB_BURST_SPARK_SHAPES = deepFreeze(['uniform', 'fade', 'spindle']);
export const FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES = deepFreeze(['circle', 'square', 'rectangle', 'glyph', 'mix']);
export const FIREWORKS_ENGINE_LAB_ROCKET_COLOR_MODES = deepFreeze(['palette', 'rgb', 'single']);
export const FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_MODES = deepFreeze(['burst', 'rocket']);
export const FIREWORKS_ENGINE_LAB_BURST_FORM_COLOR_MODES = deepFreeze(['palette', 'rgb', 'single']);
export const FIREWORKS_ENGINE_LAB_BURST_SPARK_COLOR_MODES = deepFreeze(['palette', 'rgb', 'single']);
export const FIREWORKS_ENGINE_LAB_FLASH_COLOR_MODES = deepFreeze(['palette', 'rgb', 'single']);

export const DEFAULT_FIREWORKS_ENGINE_LAB_PERFORMANCE = deepFreeze({
    additiveBlending: true,
    burstQueueThrottling: false,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_TIME_SCALE = 1;
export const FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS = deepFreeze({
    min: 0.25,
    max: 3,
});
export const DEFAULT_FIREWORKS_ENGINE_LAB_SIZE_SCALE = 1;
export const FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS = deepFreeze({
    min: 0.5,
    max: 2,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_SECTION_STATE = deepFreeze({
    rocket: false,
    effectSettings: false,
    burstForms: false,
    burstSparks: false,
    rocketTailEmbers: false,
    burstCenterFlash: false,
    burstTwinkleCloud: false,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET = deepFreeze({
    enabled: true,
    colorMode: 'palette',
    singleColor: '#ffd166',
    streakLength: 5,
    finalStreakLength: 48,
    thickness: 1.35,
    speed: 0,
    duration: 0.85,
    cascade: deepFreeze({
        mode: 'burst',
        bursts: 0,
        childBursts: 0,
        childSpeedMin: 0,
        childSpeedMax: 0,
        childDurationMin: 0.85,
        childDurationMax: 0.85,
        childDirectionDeg: 0,
        childConeDeg: 360,
        delay: 160,
        spreadX: 152,
        spreadY: 151,
    }),
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_BURST_FORMS = deepFreeze({
    enabled: true,
    shape: 'circle',
    glyph: '★',
    colorMode: 'palette',
    singleColor: '#ffd166',
    count: 27,
    speedMin: 100,
    speedMax: 250,
    directionDeg: 0,
    coneDeg: 360,
    gravity: 180,
    lifeMin: 0.6,
    lifeMax: 1.05,
    sizeMin: 1.5,
    sizeMax: 3.2,
    spin: 0,
    spinCoverage: 1,
    spinDuration: 2,
    spinPause: 2,
    highlight: 0,
    highlightAngleDeg: 0,
    highlightWidth: 0.18,
    wobble: 0,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_BURST_SPARKS = deepFreeze({
    enabled: true,
    shape: 'fade',
    colorMode: 'palette',
    singleColor: '#ffd166',
    count: 54,
    length: 27,
    tailScale: 1,
    thickness: 1,
    speedMin: 108,
    speedMax: 284,
    directionDeg: 0,
    coneDeg: 360,
    gravity: 180,
    lifeMin: 0.8,
    lifeMax: 1.4,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS = deepFreeze({
    enabled: true,
    count: 6,
    brightness: 2,
    fade: 1,
    spreadX: 1.5,
    spreadY: 40,
    speed: 2,
    size: 0.6,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH = deepFreeze({
    enabled: true,
    colorMode: 'rgb',
    color: '#00ffee',
    startSize: 35,
    endSize: 85,
    peakAlpha: 0.3,
    attack: 0.1,
    fade: 0.1,
    innerStop: 0.3,
});

export const DEFAULT_FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD = deepFreeze({
    enabled: true,
    count: 240,
    radius: 110,
    startDelay: 0.6,
    duration: 0.5,
    twinkleLife: 0.2,
    brightness: 2,
    size: 1.3,
    spawnSpread: 1,
});

export const FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS = deepFreeze({
    streakLength: { min: 6, max: 30 },
    finalStreakLength: { min: 6, max: 48 },
    thickness: { min: 0.6, max: 4 },
    speed: { min: 0, max: 1800 },
    duration: { min: 0.15, max: 2.5 },
});

export const FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS = deepFreeze({
    bursts: { min: 0, max: 50 },
    childBursts: { min: 0, max: 50 },
    childSpeedMin: { min: 0, max: 2000 },
    childSpeedMax: { min: 0, max: 2000 },
    childDurationMin: { min: 0.15, max: 2.5 },
    childDurationMax: { min: 0.15, max: 2.5 },
    childDirectionDeg: { min: 0, max: 360 },
    childConeDeg: { min: 0, max: 360 },
    delay: { min: 0, max: 1200 },
    spreadX: { min: 0, max: 300 },
    spreadY: { min: 0, max: 300 },
});

export const FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS = deepFreeze({
    count: { min: 1, max: 120 },
    speedMin: { min: 20, max: 420 },
    speedMax: { min: 20, max: 420 },
    directionDeg: { min: 0, max: 360 },
    coneDeg: { min: 0, max: 360 },
    gravity: { min: 0, max: 320 },
    lifeMin: { min: 0.05, max: 3 },
    lifeMax: { min: 0.05, max: 3 },
    sizeMin: { min: 0.1, max: 8 },
    sizeMax: { min: 0.1, max: 8 },
    spin: { min: 0, max: 1.5 },
    spinCoverage: { min: 0, max: 1 },
    spinDuration: { min: 0.05, max: 8 },
    spinPause: { min: 0.05, max: 8 },
    highlight: { min: 0, max: 1 },
    highlightAngleDeg: { min: 0, max: 360 },
    highlightWidth: { min: 0.01, max: 1 },
    wobble: { min: 0, max: 1.5 },
});

export const FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS = deepFreeze({
    count: { min: 1, max: 120 },
    length: { min: 3, max: 34 },
    tailScale: { min: 0, max: 3 },
    thickness: { min: 0.6, max: 4 },
    speedMin: { min: 0, max: 420 },
    speedMax: { min: 0, max: 420 },
    directionDeg: { min: 0, max: 360 },
    coneDeg: { min: 0, max: 360 },
    gravity: { min: 0, max: 320 },
    lifeMin: { min: 0.05, max: 3 },
    lifeMax: { min: 0.05, max: 3 },
});

export const FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS = deepFreeze({
    count: { min: 1, max: 8 },
    brightness: { min: 0, max: 3 },
    fade: { min: 0.1, max: 2 },
    spreadX: { min: 0, max: 3 },
    spreadY: { min: 0, max: 50 },
    speed: { min: 0.1, max: 4 },
    size: { min: 0.05, max: 1 },
});

export const FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS = deepFreeze({
    startSize: { min: 1, max: 100 },
    endSize: { min: 1, max: 100 },
    peakAlpha: { min: 0, max: 3 },
    attack: { min: 0.01, max: 1 },
    fade: { min: 0.01, max: 0.3 },
    innerStop: { min: 0.05, max: 1 },
});

export const FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS = deepFreeze({
    count: { min: 1, max: 240 },
    radius: { min: 2, max: 160 },
    startDelay: { min: 0, max: 1.5 },
    duration: { min: 0.05, max: 3 },
    twinkleLife: { min: 0.01, max: 0.3 },
    brightness: { min: 0.1, max: 3 },
    size: { min: 0.1, max: 2 },
    spawnSpread: { min: 0.1, max: 3 },
});

export function createDefaultFireworksEngineLabSettings() {
    return {
        version: FIREWORKS_ENGINE_LAB_STORAGE_VERSION,
        timeScale: DEFAULT_FIREWORKS_ENGINE_LAB_TIME_SCALE,
        sizeScale: DEFAULT_FIREWORKS_ENGINE_LAB_SIZE_SCALE,
        sectionState: { ...DEFAULT_FIREWORKS_ENGINE_LAB_SECTION_STATE },
        performance: { ...DEFAULT_FIREWORKS_ENGINE_LAB_PERFORMANCE },
        rocket: {
            ...DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET,
            cascade: { ...DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET.cascade },
        },
        burstForms: { ...DEFAULT_FIREWORKS_ENGINE_LAB_BURST_FORMS },
        burstSparks: { ...DEFAULT_FIREWORKS_ENGINE_LAB_BURST_SPARKS },
        rocketTailEmbers: { ...DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS },
        burstCenterFlash: { ...DEFAULT_FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH },
        burstTwinkleCloud: { ...DEFAULT_FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD },
    };
}

export function normalizeFireworksEngineLabSettings(input = {}) {
    const normalized = createDefaultFireworksEngineLabSettings();
    const safeInput = resolveObject(input);
    const safeSectionState = resolveObject(safeInput.sectionState);
    const safePerformance = resolveObject(safeInput.performance);
    const safeRocket = resolveObject(safeInput.rocket);
    const safeRocketCascade = resolveObject(safeRocket.cascade);
    const safeBurstForms = resolveObject(safeInput.burstForms);
    const safeBurstSparks = resolveObject(safeInput.burstSparks);
    const safeRocketTailEmbers = resolveObject(safeInput.rocketTailEmbers);
    const safeBurstCenterFlash = resolveObject(safeInput.burstCenterFlash);
    const safeBurstTwinkleCloud = resolveObject(safeInput.burstTwinkleCloud);

    Object.keys(DEFAULT_FIREWORKS_ENGINE_LAB_SECTION_STATE).forEach((key) => {
        const fallbackValue = key === 'effectSettings'
            ? safeSectionState.diagnostics
            : undefined;
        normalized.sectionState[key] = resolveBoolean(
            safeSectionState[key] ?? fallbackValue,
            normalized.sectionState[key],
        );
    });

    Object.keys(DEFAULT_FIREWORKS_ENGINE_LAB_PERFORMANCE).forEach((key) => {
        normalized.performance[key] = resolveBoolean(safePerformance[key], normalized.performance[key]);
    });
    normalized.timeScale = resolveFinite(
        safeInput.timeScale,
        normalized.timeScale,
        FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS.min,
        FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS.max,
    );
    normalized.sizeScale = resolveFinite(
        safeInput.sizeScale,
        normalized.sizeScale,
        FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS.min,
        FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS.max,
    );

    normalized.rocket.streakLength = resolveFinite(safeRocket.streakLength, normalized.rocket.streakLength, 6, 30);
    normalized.rocket.finalStreakLength = resolveFinite(safeRocket.finalStreakLength, normalized.rocket.finalStreakLength, 6, 48);
    normalized.rocket.thickness = resolveFinite(safeRocket.thickness, normalized.rocket.thickness, 0.6, 4);
    normalized.rocket.speed = resolveFinite(
        safeRocket.speed,
        normalized.rocket.speed,
        FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.speed.min,
        FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.speed.max,
    );
    normalized.rocket.duration = resolveFinite(
        safeRocket.duration,
        normalized.rocket.duration,
        FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.duration.min,
        FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.duration.max,
    );
    normalized.rocket.enabled = resolveBoolean(safeRocket.enabled, normalized.rocket.enabled);
    normalized.rocket.colorMode = resolveString(
        safeRocket.colorMode,
        normalized.rocket.colorMode,
        FIREWORKS_ENGINE_LAB_ROCKET_COLOR_MODES,
    );
    normalized.rocket.singleColor = normalizeHexColor(
        safeRocket.singleColor ?? safeRocket.color,
        normalized.rocket.singleColor,
    );
    normalized.rocket.cascade.mode = resolveString(
        safeRocketCascade.mode,
        normalized.rocket.cascade.mode,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_MODES,
    );
    normalized.rocket.cascade.bursts = Math.floor(resolveFinite(
        safeRocketCascade.bursts,
        normalized.rocket.cascade.bursts,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.bursts.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.bursts.max,
    ));
    normalized.rocket.cascade.childBursts = Math.floor(resolveFinite(
        safeRocketCascade.childBursts,
        normalized.rocket.cascade.childBursts,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childBursts.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childBursts.max,
    ));
    normalized.rocket.cascade.childSpeedMin = resolveFinite(
        safeRocketCascade.childSpeedMin,
        normalized.rocket.cascade.childSpeedMin,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMin.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMin.max,
    );
    normalized.rocket.cascade.childSpeedMax = resolveFinite(
        safeRocketCascade.childSpeedMax,
        normalized.rocket.cascade.childSpeedMax,
        normalized.rocket.cascade.childSpeedMin > 0
            ? normalized.rocket.cascade.childSpeedMin
            : FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMax.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMax.max,
    );
    normalized.rocket.cascade.childDurationMin = resolveFinite(
        safeRocketCascade.childDurationMin,
        normalized.rocket.cascade.childDurationMin,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMin.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMin.max,
    );
    normalized.rocket.cascade.childDurationMax = resolveFinite(
        safeRocketCascade.childDurationMax,
        normalized.rocket.cascade.childDurationMax,
        normalized.rocket.cascade.childDurationMin,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMax.max,
    );
    normalized.rocket.cascade.childDirectionDeg = resolveFinite(
        safeRocketCascade.childDirectionDeg,
        normalized.rocket.cascade.childDirectionDeg,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDirectionDeg.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDirectionDeg.max,
    );
    normalized.rocket.cascade.childConeDeg = resolveFinite(
        safeRocketCascade.childConeDeg,
        normalized.rocket.cascade.childConeDeg,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childConeDeg.min,
        FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childConeDeg.max,
    );
    normalized.rocket.cascade.delay = resolveFinite(safeRocketCascade.delay, normalized.rocket.cascade.delay, 0, 1200);
    normalized.rocket.cascade.spreadX = resolveFinite(safeRocketCascade.spreadX, normalized.rocket.cascade.spreadX, 0, 300);
    normalized.rocket.cascade.spreadY = resolveFinite(safeRocketCascade.spreadY, normalized.rocket.cascade.spreadY, 0, 300);

    normalized.burstForms.enabled = resolveBoolean(safeBurstForms.enabled, normalized.burstForms.enabled);
    normalized.burstForms.shape = resolveDelimitedTokenSet(
        safeBurstForms.shape,
        normalized.burstForms.shape,
        FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES,
    );
    normalized.burstForms.glyph = normalizeGlyph(safeBurstForms.glyph, normalized.burstForms.glyph);
    normalized.burstForms.colorMode = resolveString(safeBurstForms.colorMode, normalized.burstForms.colorMode, FIREWORKS_ENGINE_LAB_BURST_FORM_COLOR_MODES);
    normalized.burstForms.singleColor = normalizeHexColor(safeBurstForms.singleColor, normalized.burstForms.singleColor);
    normalized.burstForms.count = Math.floor(resolveFinite(safeBurstForms.count, normalized.burstForms.count, 1, 120));
    normalized.burstForms.speedMin = resolveFinite(safeBurstForms.speedMin, normalized.burstForms.speedMin, 20, 420);
    normalized.burstForms.speedMax = resolveFinite(safeBurstForms.speedMax, normalized.burstForms.speedMax, normalized.burstForms.speedMin, 420);
    normalized.burstForms.directionDeg = resolveFinite(safeBurstForms.directionDeg, normalized.burstForms.directionDeg, 0, 360);
    normalized.burstForms.coneDeg = resolveFinite(safeBurstForms.coneDeg, normalized.burstForms.coneDeg, 0, 360);
    normalized.burstForms.gravity = resolveFinite(safeBurstForms.gravity, normalized.burstForms.gravity, 0, 320);
    normalized.burstForms.lifeMin = resolveFinite(safeBurstForms.lifeMin, normalized.burstForms.lifeMin, 0.05, 3);
    normalized.burstForms.lifeMax = resolveFinite(safeBurstForms.lifeMax, normalized.burstForms.lifeMax, normalized.burstForms.lifeMin, 3);
    normalized.burstForms.sizeMin = resolveFinite(safeBurstForms.sizeMin, normalized.burstForms.sizeMin, 0.1, 8);
    normalized.burstForms.sizeMax = resolveFinite(safeBurstForms.sizeMax, normalized.burstForms.sizeMax, normalized.burstForms.sizeMin, 8);
    normalized.burstForms.spin = resolveFinite(safeBurstForms.spin, normalized.burstForms.spin, 0, 1.5);
    normalized.burstForms.spinCoverage = resolveFinite(safeBurstForms.spinCoverage, normalized.burstForms.spinCoverage, 0, 1);
    normalized.burstForms.spinDuration = resolveFinite(safeBurstForms.spinDuration, normalized.burstForms.spinDuration, 0.05, 8);
    normalized.burstForms.spinPause = resolveFinite(safeBurstForms.spinPause, normalized.burstForms.spinPause, 0.05, 8);
    normalized.burstForms.highlight = resolveFinite(safeBurstForms.highlight, normalized.burstForms.highlight, 0, 1);
    normalized.burstForms.highlightAngleDeg = resolveFinite(safeBurstForms.highlightAngleDeg, normalized.burstForms.highlightAngleDeg, 0, 360);
    normalized.burstForms.highlightWidth = resolveFinite(safeBurstForms.highlightWidth, normalized.burstForms.highlightWidth, 0.01, 1);
    normalized.burstForms.wobble = resolveFinite(safeBurstForms.wobble, normalized.burstForms.wobble, 0, 1.5);

    normalized.burstSparks.enabled = resolveBoolean(safeBurstSparks.enabled, normalized.burstSparks.enabled);
    normalized.burstSparks.shape = resolveString(safeBurstSparks.shape, normalized.burstSparks.shape, FIREWORKS_ENGINE_LAB_BURST_SPARK_SHAPES);
    normalized.burstSparks.colorMode = resolveString(safeBurstSparks.colorMode, normalized.burstSparks.colorMode, FIREWORKS_ENGINE_LAB_BURST_SPARK_COLOR_MODES);
    normalized.burstSparks.singleColor = normalizeHexColor(safeBurstSparks.singleColor, normalized.burstSparks.singleColor);
    normalized.burstSparks.count = Math.floor(resolveFinite(safeBurstSparks.count, normalized.burstSparks.count, 1, 120));
    normalized.burstSparks.length = resolveFinite(safeBurstSparks.length, normalized.burstSparks.length, 3, 34);
    normalized.burstSparks.tailScale = resolveFinite(safeBurstSparks.tailScale, normalized.burstSparks.tailScale, 0, 3);
    normalized.burstSparks.thickness = resolveFinite(safeBurstSparks.thickness, normalized.burstSparks.thickness, 0.6, 4);
    normalized.burstSparks.speedMin = resolveFinite(safeBurstSparks.speedMin, normalized.burstSparks.speedMin, 0, 420);
    normalized.burstSparks.speedMax = resolveFinite(safeBurstSparks.speedMax, normalized.burstSparks.speedMax, normalized.burstSparks.speedMin, 420);
    normalized.burstSparks.directionDeg = resolveFinite(safeBurstSparks.directionDeg, normalized.burstSparks.directionDeg, 0, 360);
    normalized.burstSparks.coneDeg = resolveFinite(safeBurstSparks.coneDeg, normalized.burstSparks.coneDeg, 0, 360);
    normalized.burstSparks.gravity = resolveFinite(safeBurstSparks.gravity, normalized.burstSparks.gravity, 0, 320);
    normalized.burstSparks.lifeMin = resolveFinite(safeBurstSparks.lifeMin, normalized.burstSparks.lifeMin, 0.05, 3);
    normalized.burstSparks.lifeMax = resolveFinite(safeBurstSparks.lifeMax, normalized.burstSparks.lifeMax, normalized.burstSparks.lifeMin, 3);

    normalized.rocketTailEmbers.enabled = resolveBoolean(safeRocketTailEmbers.enabled, normalized.rocketTailEmbers.enabled);
    normalized.rocketTailEmbers.count = Math.floor(resolveFinite(safeRocketTailEmbers.count, normalized.rocketTailEmbers.count, 1, 8));
    normalized.rocketTailEmbers.brightness = resolveFinite(safeRocketTailEmbers.brightness, normalized.rocketTailEmbers.brightness, 0, 3);
    normalized.rocketTailEmbers.fade = resolveFinite(safeRocketTailEmbers.fade, normalized.rocketTailEmbers.fade, 0.1, 2);
    normalized.rocketTailEmbers.spreadX = resolveFinite(safeRocketTailEmbers.spreadX, normalized.rocketTailEmbers.spreadX, 0, 3);
    normalized.rocketTailEmbers.spreadY = resolveFinite(safeRocketTailEmbers.spreadY, normalized.rocketTailEmbers.spreadY, 0, 50);
    normalized.rocketTailEmbers.speed = resolveFinite(safeRocketTailEmbers.speed, normalized.rocketTailEmbers.speed, 0.1, 4);
    normalized.rocketTailEmbers.size = resolveFinite(safeRocketTailEmbers.size, normalized.rocketTailEmbers.size, 0.05, 1);

    normalized.burstCenterFlash.enabled = resolveBoolean(safeBurstCenterFlash.enabled, normalized.burstCenterFlash.enabled);
    normalized.burstCenterFlash.colorMode = resolveString(safeBurstCenterFlash.colorMode, normalized.burstCenterFlash.colorMode, FIREWORKS_ENGINE_LAB_FLASH_COLOR_MODES);
    normalized.burstCenterFlash.color = normalizeHexColor(safeBurstCenterFlash.color, normalized.burstCenterFlash.color);
    normalized.burstCenterFlash.startSize = resolveFinite(safeBurstCenterFlash.startSize, normalized.burstCenterFlash.startSize, 1, 100);
    normalized.burstCenterFlash.endSize = resolveFinite(safeBurstCenterFlash.endSize, normalized.burstCenterFlash.endSize, 1, 100);
    normalized.burstCenterFlash.peakAlpha = resolveFinite(safeBurstCenterFlash.peakAlpha, normalized.burstCenterFlash.peakAlpha, 0, 3);
    normalized.burstCenterFlash.attack = resolveFinite(safeBurstCenterFlash.attack, normalized.burstCenterFlash.attack, 0.01, 1);
    normalized.burstCenterFlash.fade = resolveFinite(safeBurstCenterFlash.fade, normalized.burstCenterFlash.fade, 0.01, 0.3);
    normalized.burstCenterFlash.innerStop = resolveFinite(safeBurstCenterFlash.innerStop, normalized.burstCenterFlash.innerStop, 0.05, 1);

    normalized.burstTwinkleCloud.enabled = resolveBoolean(safeBurstTwinkleCloud.enabled, normalized.burstTwinkleCloud.enabled);
    normalized.burstTwinkleCloud.count = Math.floor(resolveFinite(safeBurstTwinkleCloud.count, normalized.burstTwinkleCloud.count, 1, 240));
    normalized.burstTwinkleCloud.radius = resolveFinite(safeBurstTwinkleCloud.radius, normalized.burstTwinkleCloud.radius, 2, 160);
    normalized.burstTwinkleCloud.startDelay = resolveFinite(safeBurstTwinkleCloud.startDelay, normalized.burstTwinkleCloud.startDelay, 0, 1.5);
    normalized.burstTwinkleCloud.duration = resolveFinite(safeBurstTwinkleCloud.duration, normalized.burstTwinkleCloud.duration, 0.05, 3);
    normalized.burstTwinkleCloud.twinkleLife = resolveFinite(safeBurstTwinkleCloud.twinkleLife, normalized.burstTwinkleCloud.twinkleLife, 0.01, 0.3);
    normalized.burstTwinkleCloud.brightness = resolveFinite(safeBurstTwinkleCloud.brightness, normalized.burstTwinkleCloud.brightness, 0.1, 3);
    normalized.burstTwinkleCloud.size = resolveFinite(safeBurstTwinkleCloud.size, normalized.burstTwinkleCloud.size, 0.1, 2);
    normalized.burstTwinkleCloud.spawnSpread = resolveFinite(safeBurstTwinkleCloud.spawnSpread, normalized.burstTwinkleCloud.spawnSpread, 0.1, 3);

    normalized.version = FIREWORKS_ENGINE_LAB_STORAGE_VERSION;
    return normalized;
}

export function loadFireworksEngineLabSettings(storage = undefined) {
    const resolvedStorage = createStorage(storage);
    if (!resolvedStorage) {
        return createDefaultFireworksEngineLabSettings();
    }

    try {
        const rawValue = resolvedStorage.getItem(FIREWORKS_ENGINE_LAB_STORAGE_KEY);
        if (!rawValue) {
            return createDefaultFireworksEngineLabSettings();
        }

        return normalizeFireworksEngineLabSettings(JSON.parse(rawValue));
    } catch {
        return createDefaultFireworksEngineLabSettings();
    }
}

export function saveFireworksEngineLabSettings(settings, storage = undefined) {
    const normalized = normalizeFireworksEngineLabSettings(settings);
    const resolvedStorage = createStorage(storage);
    if (!resolvedStorage) {
        return normalized;
    }

    try {
        resolvedStorage.setItem(FIREWORKS_ENGINE_LAB_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
        // Ignore persistence failures in the standalone lab.
    }

    return normalized;
}
