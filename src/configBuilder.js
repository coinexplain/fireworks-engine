import {
    DEFAULT_ENABLE_BURST_QUEUE_THROTTLING,
    DEFAULT_TIME_SCALE,
    DEFAULT_ROCKET_ENABLED,
    DEFAULT_ROCKET_STREAK_LENGTH,
    DEFAULT_ROCKET_FINAL_STREAK_LENGTH,
    DEFAULT_ROCKET_THICKNESS,
    DEFAULT_ROCKET_SPEED,
    DEFAULT_ROCKET_TAIL_EMBERS_ENABLED,
    DEFAULT_ROCKET_TAIL_EMBERS_COUNT,
    DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS,
    DEFAULT_ROCKET_TAIL_EMBERS_FADE,
    DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_X,
    DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_Y,
    DEFAULT_ROCKET_TAIL_EMBERS_SPEED,
    DEFAULT_ROCKET_TAIL_EMBERS_SIZE,
    DEFAULT_BURST_COLOR_MODE,
    DEFAULT_BURST_FORMS_ENABLED,
    DEFAULT_BURST_FORMS_COUNT,
    DEFAULT_BURST_FORMS_SPEED_MIN,
    DEFAULT_BURST_FORMS_SPEED_MAX,
    DEFAULT_BURST_FORMS_GRAVITY,
    DEFAULT_BURST_FORMS_LIFE_MIN,
    DEFAULT_BURST_FORMS_LIFE_MAX,
    DEFAULT_BURST_FORMS_SIZE_MIN,
    DEFAULT_BURST_FORMS_SIZE_MAX,
    DEFAULT_BURST_FORMS_SPIN,
    DEFAULT_BURST_FORMS_SPIN_COVERAGE,
    DEFAULT_BURST_FORMS_SPIN_DURATION,
    DEFAULT_BURST_FORMS_SPIN_PAUSE,
    DEFAULT_BURST_FORMS_HIGHLIGHT,
    DEFAULT_BURST_FORMS_HIGHLIGHT_ANGLE_DEG,
    DEFAULT_BURST_FORMS_HIGHLIGHT_WIDTH,
    DEFAULT_BURST_FORMS_WOBBLE,
    DEFAULT_BURST_FORMS_DIRECTION_DEG,
    DEFAULT_BURST_FORMS_CONE_DEG,
    DEFAULT_BURST_FORMS_SHAPE,
    DEFAULT_BURST_FORMS_GLYPH,
    DEFAULT_BURST_SPARKS_ENABLED,
    BURST_SPARK_COUNT_BASE,
    DEFAULT_BURST_SPARK_LENGTH,
    DEFAULT_BURST_SPARK_DIRECTION_DEG,
    DEFAULT_BURST_SPARK_CONE_DEG,
    DEFAULT_BURST_SPARK_TAIL_SCALE,
    DEFAULT_BURST_SPARK_THICKNESS,
    DEFAULT_BURST_SPARK_SHAPE,
    BURST_SPARK_SPEED_MIN_BASE,
    BURST_SPARK_SPEED_MAX_BASE,
    DEFAULT_BURST_SPARK_GRAVITY,
    BURST_SPARK_LIFE_MIN_BASE,
    BURST_SPARK_LIFE_MAX_BASE,
    DEFAULT_BURST_CENTER_FLASH_ENABLED,
    DEFAULT_BURST_CENTER_FLASH_START_SIZE,
    DEFAULT_BURST_CENTER_FLASH_END_SIZE,
    DEFAULT_BURST_CENTER_FLASH_PEAK_ALPHA,
    DEFAULT_BURST_CENTER_FLASH_ATTACK,
    DEFAULT_BURST_CENTER_FLASH_FADE,
    DEFAULT_BURST_CENTER_FLASH_COLOR_MODE,
    DEFAULT_BURST_CENTER_FLASH_COLOR,
    DEFAULT_BURST_CENTER_FLASH_INNER_STOP,
    DEFAULT_BURST_TWINKLE_CLOUD_ENABLED,
    DEFAULT_BURST_TWINKLE_CLOUD_COUNT,
    DEFAULT_BURST_TWINKLE_CLOUD_RADIUS,
    DEFAULT_BURST_TWINKLE_CLOUD_START_DELAY,
    DEFAULT_BURST_TWINKLE_CLOUD_DURATION,
    DEFAULT_BURST_TWINKLE_CLOUD_TWINKLE_LIFE,
    DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS,
    DEFAULT_BURST_TWINKLE_CLOUD_SIZE,
    DEFAULT_BURST_TWINKLE_CLOUD_SPAWN_SPREAD,
    DEFAULT_BURST_PALETTE,
    DEFAULT_BURST_SINGLE_COLOR,
} from './defaults.js';
import {
    resolveSizeScale,
    resolveTimeScale,
    resolveOptionalPositiveInteger,
} from './mathResolvers.js';
import {
    resolveBurstFormShape,
    normalizeBurstFormGlyph,
    resolveBurstColorMode,
    resolveBurstFlashColorMode,
    resolveBurstSparkShape,
} from './valueNormalizers.js';
import { normalizeHexColor } from './colorUtils.js';

const MIN_COUNT = 1;
const MIN_MAX_BURST_PARTICLES_PER_FRAME = 1;
const MIN_PARTICLE_PRESSURE_THRESHOLD = 1;

function resolveBoolean(value, fallback) {
    if (typeof value === 'boolean') {
        return value;
    }

    return fallback;
}

function resolvePositiveIntegerOrDefault(value, minValue, fallback) {
    return resolveOptionalPositiveInteger(value, minValue) ?? fallback;
}

function resolveRocketConfig(rocket = {}) {
    return {
        enabled: resolveBoolean(rocket.enabled, DEFAULT_ROCKET_ENABLED),
        colorMode: resolveBurstColorMode(rocket.colorMode ?? DEFAULT_BURST_COLOR_MODE),
        singleColor: normalizeHexColor(
            rocket.singleColor ?? rocket.color,
            DEFAULT_BURST_SINGLE_COLOR,
        ),
        palette: Array.isArray(rocket.palette) && rocket.palette.length > 0
            ? rocket.palette
            : null,
        streakLength: rocket.streakLength ?? DEFAULT_ROCKET_STREAK_LENGTH,
        finalStreakLength: rocket.finalStreakLength ?? DEFAULT_ROCKET_FINAL_STREAK_LENGTH,
        thickness: rocket.thickness ?? DEFAULT_ROCKET_THICKNESS,
        speed: rocket.speed ?? DEFAULT_ROCKET_SPEED,
    };
}

function resolveRocketTailEmbersConfig(rocketTailEmbers = {}) {
    return {
        enabled: resolveBoolean(rocketTailEmbers.enabled, DEFAULT_ROCKET_TAIL_EMBERS_ENABLED),
        count: resolvePositiveIntegerOrDefault(rocketTailEmbers.count, MIN_COUNT, DEFAULT_ROCKET_TAIL_EMBERS_COUNT),
        brightness: rocketTailEmbers.brightness ?? DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS,
        fade: rocketTailEmbers.fade ?? DEFAULT_ROCKET_TAIL_EMBERS_FADE,
        spreadX: rocketTailEmbers.spreadX ?? DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_X,
        spreadY: rocketTailEmbers.spreadY ?? DEFAULT_ROCKET_TAIL_EMBERS_SPREAD_Y,
        speed: rocketTailEmbers.speed ?? DEFAULT_ROCKET_TAIL_EMBERS_SPEED,
        size: rocketTailEmbers.size ?? DEFAULT_ROCKET_TAIL_EMBERS_SIZE,
    };
}

function resolveBurstFormsConfig(burstForms = {}) {
    return {
        enabled: resolveBoolean(burstForms.enabled, DEFAULT_BURST_FORMS_ENABLED),
        count: resolvePositiveIntegerOrDefault(burstForms.count, MIN_COUNT, DEFAULT_BURST_FORMS_COUNT),
        speedMin: burstForms.speedMin ?? DEFAULT_BURST_FORMS_SPEED_MIN,
        speedMax: burstForms.speedMax ?? DEFAULT_BURST_FORMS_SPEED_MAX,
        gravity: burstForms.gravity ?? DEFAULT_BURST_FORMS_GRAVITY,
        lifeMin: burstForms.lifeMin ?? DEFAULT_BURST_FORMS_LIFE_MIN,
        lifeMax: burstForms.lifeMax ?? DEFAULT_BURST_FORMS_LIFE_MAX,
        sizeMin: burstForms.sizeMin ?? DEFAULT_BURST_FORMS_SIZE_MIN,
        sizeMax: burstForms.sizeMax ?? DEFAULT_BURST_FORMS_SIZE_MAX,
        spin: burstForms.spin ?? DEFAULT_BURST_FORMS_SPIN,
        spinCoverage: burstForms.spinCoverage ?? DEFAULT_BURST_FORMS_SPIN_COVERAGE,
        spinDuration: burstForms.spinDuration ?? DEFAULT_BURST_FORMS_SPIN_DURATION,
        spinPause: burstForms.spinPause ?? DEFAULT_BURST_FORMS_SPIN_PAUSE,
        highlight: burstForms.highlight ?? DEFAULT_BURST_FORMS_HIGHLIGHT,
        highlightAngleDeg: burstForms.highlightAngleDeg ?? DEFAULT_BURST_FORMS_HIGHLIGHT_ANGLE_DEG,
        highlightWidth: burstForms.highlightWidth ?? DEFAULT_BURST_FORMS_HIGHLIGHT_WIDTH,
        wobble: burstForms.wobble ?? DEFAULT_BURST_FORMS_WOBBLE,
        directionDeg: burstForms.directionDeg ?? DEFAULT_BURST_FORMS_DIRECTION_DEG,
        coneDeg: burstForms.coneDeg ?? DEFAULT_BURST_FORMS_CONE_DEG,
        colorMode: resolveBurstColorMode(burstForms.colorMode ?? DEFAULT_BURST_COLOR_MODE),
        singleColor: normalizeHexColor(burstForms.singleColor, DEFAULT_BURST_SINGLE_COLOR),
        shape: resolveBurstFormShape(burstForms.shape ?? DEFAULT_BURST_FORMS_SHAPE),
        glyph: normalizeBurstFormGlyph(burstForms.glyph, DEFAULT_BURST_FORMS_GLYPH),
        palette: Array.isArray(burstForms.palette) && burstForms.palette.length > 0
            ? burstForms.palette
            : DEFAULT_BURST_PALETTE,
    };
}

function resolveBurstSparksConfig(burstSparks = {}) {
    const burstSparksConfig = {
        enabled: resolveBoolean(burstSparks.enabled, DEFAULT_BURST_SPARKS_ENABLED),
        count: resolvePositiveIntegerOrDefault(burstSparks.count, MIN_COUNT, BURST_SPARK_COUNT_BASE),
        length: burstSparks.length ?? DEFAULT_BURST_SPARK_LENGTH,
        tailScale: burstSparks.tailScale ?? DEFAULT_BURST_SPARK_TAIL_SCALE,
        thickness: burstSparks.thickness ?? DEFAULT_BURST_SPARK_THICKNESS,
        speedMin: burstSparks.speedMin ?? BURST_SPARK_SPEED_MIN_BASE,
        speedMax: burstSparks.speedMax ?? BURST_SPARK_SPEED_MAX_BASE,
        gravity: burstSparks.gravity ?? DEFAULT_BURST_SPARK_GRAVITY,
        lifeMin: burstSparks.lifeMin ?? BURST_SPARK_LIFE_MIN_BASE,
        lifeMax: burstSparks.lifeMax ?? BURST_SPARK_LIFE_MAX_BASE,
        directionDeg: burstSparks.directionDeg ?? DEFAULT_BURST_SPARK_DIRECTION_DEG,
        coneDeg: burstSparks.coneDeg ?? DEFAULT_BURST_SPARK_CONE_DEG,
        shape: resolveBurstSparkShape(burstSparks.shape ?? DEFAULT_BURST_SPARK_SHAPE),
        colorMode: resolveBurstColorMode(burstSparks.colorMode ?? DEFAULT_BURST_COLOR_MODE),
        singleColor: normalizeHexColor(burstSparks.singleColor, DEFAULT_BURST_SINGLE_COLOR),
        palette: Array.isArray(burstSparks.palette) && burstSparks.palette.length > 0
            ? burstSparks.palette
            : null,
    };
    burstSparksConfig.speedMax = Math.max(burstSparksConfig.speedMin, burstSparksConfig.speedMax);
    burstSparksConfig.lifeMax = Math.max(burstSparksConfig.lifeMin, burstSparksConfig.lifeMax);
    return burstSparksConfig;
}

function resolveBurstCenterFlashConfig(burstCenterFlash = {}) {
    return {
        enabled: resolveBoolean(burstCenterFlash.enabled, DEFAULT_BURST_CENTER_FLASH_ENABLED),
        startSize: burstCenterFlash.startSize ?? DEFAULT_BURST_CENTER_FLASH_START_SIZE,
        endSize: burstCenterFlash.endSize ?? DEFAULT_BURST_CENTER_FLASH_END_SIZE,
        peakAlpha: burstCenterFlash.peakAlpha ?? DEFAULT_BURST_CENTER_FLASH_PEAK_ALPHA,
        attack: burstCenterFlash.attack ?? DEFAULT_BURST_CENTER_FLASH_ATTACK,
        fade: burstCenterFlash.fade ?? DEFAULT_BURST_CENTER_FLASH_FADE,
        colorMode: resolveBurstFlashColorMode(
            burstCenterFlash.colorMode ?? DEFAULT_BURST_CENTER_FLASH_COLOR_MODE,
        ),
        color: normalizeHexColor(burstCenterFlash.color, DEFAULT_BURST_CENTER_FLASH_COLOR),
        innerStop: burstCenterFlash.innerStop ?? DEFAULT_BURST_CENTER_FLASH_INNER_STOP,
    };
}

function resolveBurstTwinkleCloudConfig(burstTwinkleCloud = {}) {
    return {
        enabled: resolveBoolean(burstTwinkleCloud.enabled, DEFAULT_BURST_TWINKLE_CLOUD_ENABLED),
        count: resolvePositiveIntegerOrDefault(burstTwinkleCloud.count, MIN_COUNT, DEFAULT_BURST_TWINKLE_CLOUD_COUNT),
        radius: burstTwinkleCloud.radius ?? DEFAULT_BURST_TWINKLE_CLOUD_RADIUS,
        startDelay: burstTwinkleCloud.startDelay ?? DEFAULT_BURST_TWINKLE_CLOUD_START_DELAY,
        duration: burstTwinkleCloud.duration ?? DEFAULT_BURST_TWINKLE_CLOUD_DURATION,
        twinkleLife: burstTwinkleCloud.twinkleLife ?? DEFAULT_BURST_TWINKLE_CLOUD_TWINKLE_LIFE,
        brightness: burstTwinkleCloud.brightness ?? DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS,
        size: burstTwinkleCloud.size ?? DEFAULT_BURST_TWINKLE_CLOUD_SIZE,
        spawnSpread: burstTwinkleCloud.spawnSpread ?? DEFAULT_BURST_TWINKLE_CLOUD_SPAWN_SPREAD,
    };
}

function resolvePerformanceConfig(
    performance = {},
    enableBurstQueueThrottling,
) {
    return {
        enableBurstQueueThrottling,
        maxBurstParticlesPerFrame: resolvePositiveIntegerOrDefault(performance.maxBurstParticlesPerFrame, MIN_MAX_BURST_PARTICLES_PER_FRAME, 12),
        particlePressureThreshold: resolvePositiveIntegerOrDefault(performance.particlePressureThreshold, MIN_PARTICLE_PRESSURE_THRESHOLD, 18),
        fastRectRadiusThreshold: performance.fastRectRadiusThreshold ?? 1.45,
    };
}

function resolveRefs(runtime = {}, canvas = {}) {
    return {
        documentRef: runtime.document,
        windowRef: runtime.window,
        rootRef: canvas.appendTarget ?? runtime.root,
        prefersReducedMotionRef: runtime.prefersReducedMotion,
        requestAnimationFrameRef: runtime.requestAnimationFrame,
        cancelAnimationFrameRef: runtime.cancelAnimationFrame,
        setTimeoutRef: runtime.setTimeout,
        clearTimeoutRef: runtime.clearTimeout,
        nowRef: runtime.now,
        maxDevicePixelRatio: canvas.maxDevicePixelRatio ?? 2,
        canvasZIndex: canvas.zIndex ?? 9999,
    };
}

export function buildEngineConfig(normalizedOptions = {}) {
    const safeOptions = normalizedOptions ?? {};
    const {
        canvas = {},
        runtime = {},
        performance = {},
        rocket = {},
        rocketTailEmbers = {},
        burstForms = {},
        burstSparks = {},
        burstCenterFlash = {},
        burstTwinkleCloud = {},
    } = safeOptions;

    const enableBurstQueueThrottling = resolveBoolean(
        performance.enableBurstQueueThrottling,
        DEFAULT_ENABLE_BURST_QUEUE_THROTTLING,
    );

    const sizeScale = resolveSizeScale(safeOptions.sizeScale, 1);
    const timeScale = resolveTimeScale(safeOptions.timeScale, DEFAULT_TIME_SCALE);

    const rocketConfig = resolveRocketConfig(rocket);
    const rocketTailEmbersConfig = resolveRocketTailEmbersConfig(rocketTailEmbers);
    const burstFormsConfig = resolveBurstFormsConfig(burstForms);
    const burstSparksConfig = resolveBurstSparksConfig(burstSparks);
    const burstCenterFlashConfig = resolveBurstCenterFlashConfig(burstCenterFlash);
    const burstTwinkleCloudConfig = resolveBurstTwinkleCloudConfig(burstTwinkleCloud);
    const performanceConfig = resolvePerformanceConfig(
        performance,
        enableBurstQueueThrottling,
    );

    const refs = resolveRefs(runtime, canvas);
    const toggles = {
        enableBurstQueueThrottling,
    };

    return {
        refs,
        toggles,
        timeScale,
        sizeScale,
        rocket: rocketConfig,
        rocketTailEmbers: rocketTailEmbersConfig,
        burstForms: burstFormsConfig,
        burstSparks: burstSparksConfig,
        burstCenterFlash: burstCenterFlashConfig,
        burstTwinkleCloud: burstTwinkleCloudConfig,
        performance: performanceConfig,
    };
}
