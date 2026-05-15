import {
    DEFAULT_BURST_FORMS_COUNT,
    DEFAULT_BURST_FORMS_SPEED_MIN,
    DEFAULT_BURST_FORMS_SPEED_MAX,
    DEFAULT_BURST_FORMS_GRAVITY,
    DEFAULT_BURST_FORMS_DIRECTION_DEG,
    DEFAULT_BURST_FORMS_CONE_DEG,
    DEFAULT_BURST_SPARK_GRAVITY,
    DEFAULT_BURST_SPARK_DIRECTION_DEG,
    DEFAULT_BURST_SPARK_CONE_DEG,
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
    DEFAULT_BURST_PALETTE,
    BURST_SPARK_COUNT_BASE,
    BURST_SPARK_SPEED_MIN_BASE,
    BURST_SPARK_SPEED_MAX_BASE,
    BURST_SPARK_LIFE_MIN_BASE,
    BURST_SPARK_LIFE_MAX_BASE,
    BURST_SPARK_LENGTH_BASE,
    DEFAULT_BURST_SPARK_TAIL_SCALE,
    BURST_SPARK_THICKNESS_BASE,
} from './defaults.js';
import {
    resolveScaledOverride,
    resolveScaledInteger,
    resolveScaledInverseOverride,
    resolveSizeScale,
    resolveEnvelopeTimeScale,
} from './mathResolvers.js';
import {
    resolveBurstEntityToggle,
    resolveBurstFormShape,
    normalizeBurstFormGlyph,
    resolveBurstColorMode,
    resolveBurstFlashColorMode,
    resolveBurstSparkShape,
} from './valueNormalizers.js';
import { normalizeHexColor } from './colorUtils.js';

const MIN_COUNT = 1;
const TWINKLE_CLOUD_PARTICLE_SIZE_SCALE_FACTOR = 0.5;

export function resolveTwinkleParticleSizeScale(sizeScale) {
    return 1 + ((sizeScale - 1) * TWINKLE_CLOUD_PARTICLE_SIZE_SCALE_FACTOR);
}

function resolveBurstFormsConfig(formsInput, formsCurrent, normalizedOptions, sizeScale, envelopeTimeScale, simple) {
    return {
        enabled: resolveBurstEntityToggle(formsInput.enabled) ?? formsCurrent.enabled,
        count: resolveScaledInteger(
            formsInput.count ?? formsCurrent.count,
            DEFAULT_BURST_FORMS_COUNT,
            MIN_COUNT,
            sizeScale,
        ),
        speedMin: resolveScaledOverride(
            formsInput.speedMin ?? formsCurrent.speedMin,
            DEFAULT_BURST_FORMS_SPEED_MIN,
            envelopeTimeScale,
        ),
        speedMax: resolveScaledOverride(
            formsInput.speedMax ?? formsCurrent.speedMax,
            DEFAULT_BURST_FORMS_SPEED_MAX,
            envelopeTimeScale,
        ),
        gravity: formsInput.gravity ?? formsCurrent.gravity ?? DEFAULT_BURST_FORMS_GRAVITY,
        lifeMin: resolveScaledOverride(
            formsInput.lifeMin ?? formsCurrent.lifeMin,
            DEFAULT_BURST_FORMS_LIFE_MIN,
            envelopeTimeScale,
        ),
        lifeMax: resolveScaledOverride(
            formsInput.lifeMax ?? formsCurrent.lifeMax,
            DEFAULT_BURST_FORMS_LIFE_MAX,
            envelopeTimeScale,
        ),
        sizeMin: resolveScaledOverride(
            formsInput.sizeMin ?? formsCurrent.sizeMin,
            DEFAULT_BURST_FORMS_SIZE_MIN,
            sizeScale,
        ),
        sizeMax: resolveScaledOverride(
            formsInput.sizeMax ?? formsCurrent.sizeMax,
            DEFAULT_BURST_FORMS_SIZE_MAX,
            sizeScale,
        ),
        spin: formsInput.spin ?? formsCurrent.spin ?? DEFAULT_BURST_FORMS_SPIN,
        spinCoverage: formsInput.spinCoverage ?? formsCurrent.spinCoverage ?? DEFAULT_BURST_FORMS_SPIN_COVERAGE,
        spinDuration: resolveScaledOverride(
            formsInput.spinDuration ?? formsCurrent.spinDuration,
            DEFAULT_BURST_FORMS_SPIN_DURATION,
            envelopeTimeScale,
        ),
        spinPause: resolveScaledOverride(
            formsInput.spinPause ?? formsCurrent.spinPause,
            DEFAULT_BURST_FORMS_SPIN_PAUSE,
            envelopeTimeScale,
        ),
        highlight: formsInput.highlight ?? formsCurrent.highlight ?? DEFAULT_BURST_FORMS_HIGHLIGHT,
        highlightAngleDeg: formsInput.highlightAngleDeg
            ?? formsCurrent.highlightAngleDeg
            ?? DEFAULT_BURST_FORMS_HIGHLIGHT_ANGLE_DEG,
        highlightWidth: formsInput.highlightWidth
            ?? formsCurrent.highlightWidth
            ?? DEFAULT_BURST_FORMS_HIGHLIGHT_WIDTH,
        wobble: formsInput.wobble ?? formsCurrent.wobble ?? DEFAULT_BURST_FORMS_WOBBLE,
        directionDeg: formsInput.directionDeg ?? formsCurrent.directionDeg ?? DEFAULT_BURST_FORMS_DIRECTION_DEG,
        coneDeg: formsInput.coneDeg ?? formsCurrent.coneDeg ?? DEFAULT_BURST_FORMS_CONE_DEG,
        palette: formsInput.palette
            ?? normalizedOptions.palette
            ?? formsCurrent.palette
            ?? DEFAULT_BURST_PALETTE,
        simple,
        shape: resolveBurstFormShape(formsInput.shape ?? formsCurrent.shape),
        glyph: normalizeBurstFormGlyph(formsInput.glyph, formsCurrent.glyph),
        colorMode: resolveBurstColorMode(formsInput.colorMode ?? formsCurrent.colorMode),
        singleColor: normalizeHexColor(formsInput.singleColor, formsCurrent.singleColor),
    };
}

function resolveBurstSparksConfig(sparksInput, sparksCurrent, formsCurrent, burstForms, sizeScale, envelopeTimeScale, simple) {
    return {
        enabled: resolveBurstEntityToggle(sparksInput.enabled) ?? sparksCurrent.enabled,
        count: resolveScaledInteger(
            sparksInput.count ?? sparksCurrent.count,
            BURST_SPARK_COUNT_BASE,
            MIN_COUNT,
            sizeScale,
        ),
        speedMin: resolveScaledOverride(
            sparksInput.speedMin ?? (sparksCurrent.speedMin ?? formsCurrent.speedMin),
            BURST_SPARK_SPEED_MIN_BASE,
            envelopeTimeScale,
        ),
        speedMax: resolveScaledOverride(
            sparksInput.speedMax ?? (sparksCurrent.speedMax ?? formsCurrent.speedMax),
            BURST_SPARK_SPEED_MAX_BASE,
            envelopeTimeScale,
        ),
        gravity: sparksInput.gravity ?? sparksCurrent.gravity ?? formsCurrent.gravity ?? DEFAULT_BURST_SPARK_GRAVITY,
        lifeMin: resolveScaledOverride(
            sparksInput.lifeMin ?? (sparksCurrent.lifeMin ?? formsCurrent.lifeMin),
            BURST_SPARK_LIFE_MIN_BASE,
            envelopeTimeScale,
        ),
        lifeMax: resolveScaledOverride(
            sparksInput.lifeMax ?? (sparksCurrent.lifeMax ?? formsCurrent.lifeMax),
            BURST_SPARK_LIFE_MAX_BASE,
            envelopeTimeScale,
        ),
        directionDeg: sparksInput.directionDeg ?? sparksCurrent.directionDeg ?? DEFAULT_BURST_SPARK_DIRECTION_DEG,
        coneDeg: sparksInput.coneDeg ?? sparksCurrent.coneDeg ?? DEFAULT_BURST_SPARK_CONE_DEG,
        palette: sparksInput.palette ?? sparksCurrent.palette ?? burstForms.palette,
        simple,
        length: resolveScaledOverride(sparksInput.length ?? sparksCurrent.length, BURST_SPARK_LENGTH_BASE, sizeScale),
        tailScale: sparksInput.tailScale ?? sparksCurrent.tailScale ?? DEFAULT_BURST_SPARK_TAIL_SCALE,
        thickness: resolveScaledOverride(sparksInput.thickness ?? sparksCurrent.thickness, BURST_SPARK_THICKNESS_BASE, sizeScale),
        shape: resolveBurstSparkShape(sparksInput.shape ?? sparksCurrent.shape),
        colorMode: resolveBurstColorMode(
            sparksInput.colorMode ?? sparksCurrent.colorMode ?? formsCurrent.colorMode,
        ),
        singleColor: normalizeHexColor(
            sparksInput.singleColor ?? sparksCurrent.singleColor ?? formsCurrent.singleColor,
            formsCurrent.singleColor,
        ),
    };
}

function resolveBurstCenterFlashConfig(flashInput, flashCurrent, sizeScale) {
    return {
        enabled: resolveBurstEntityToggle(flashInput.enabled) ?? flashCurrent.enabled,
        startSize: resolveScaledOverride(flashInput.startSize, flashCurrent.startSize, sizeScale),
        endSize: resolveScaledOverride(flashInput.endSize, flashCurrent.endSize, sizeScale),
        peakAlpha: flashInput.peakAlpha ?? flashCurrent.peakAlpha,
        attack: flashInput.attack ?? flashCurrent.attack,
        fade: flashInput.fade ?? flashCurrent.fade,
        colorMode: resolveBurstFlashColorMode(flashInput.colorMode ?? flashCurrent.colorMode),
        color: normalizeHexColor(flashInput.color, flashCurrent.color),
        innerStop: flashInput.innerStop ?? flashCurrent.innerStop,
    };
}

function resolveBurstTwinkleCloudConfig(twinkleInput, twinkleCurrent, sizeScale, envelopeTimeScale) {
    const particleSizeScale = resolveTwinkleParticleSizeScale(sizeScale);
    return {
        enabled: resolveBurstEntityToggle(twinkleInput.enabled) ?? twinkleCurrent.enabled,
        count: resolveScaledInteger(twinkleInput.count, twinkleCurrent.count, MIN_COUNT, sizeScale),
        radius: resolveScaledOverride(twinkleInput.radius, twinkleCurrent.radius, sizeScale),
        startDelay: resolveScaledOverride(twinkleInput.startDelay, twinkleCurrent.startDelay, envelopeTimeScale),
        duration: resolveScaledOverride(twinkleInput.duration, twinkleCurrent.duration, envelopeTimeScale),
        twinkleLife: resolveScaledOverride(twinkleInput.twinkleLife, twinkleCurrent.twinkleLife, envelopeTimeScale),
        brightness: twinkleInput.brightness ?? twinkleCurrent.brightness,
        size: resolveScaledOverride(twinkleInput.size, twinkleCurrent.size, particleSizeScale),
        spawnSpread: resolveScaledInverseOverride(twinkleInput.spawnSpread, twinkleCurrent.spawnSpread, sizeScale),
    };
}

export function buildBurstOptions(normalizedOptions = {}, currentConfig = {}) {
    const safeOptions = normalizedOptions ?? {};
    const sizeScale = resolveSizeScale(safeOptions.sizeScale, currentConfig.sizeScale ?? 1);
    const envelopeTimeScale = resolveEnvelopeTimeScale(sizeScale);
    const simple = !!safeOptions.simple;
    const {
        burstForms: formsInput = {},
        burstSparks: sparksInput = {},
        burstCenterFlash: flashInput = {},
        burstTwinkleCloud: twinkleInput = {},
    } = safeOptions;

    const formsCurrent = currentConfig.burstForms ?? {};
    const sparksCurrent = currentConfig.burstSparks ?? {};
    const flashCurrent = currentConfig.burstCenterFlash ?? {};
    const twinkleCurrent = currentConfig.burstTwinkleCloud ?? {};

    const burstForms = resolveBurstFormsConfig(
        formsInput,
        formsCurrent,
        safeOptions,
        sizeScale,
        envelopeTimeScale,
        simple,
    );
    const burstSparks = resolveBurstSparksConfig(
        sparksInput,
        sparksCurrent,
        formsCurrent,
        burstForms,
        sizeScale,
        envelopeTimeScale,
        simple,
    );
    const burstCenterFlash = resolveBurstCenterFlashConfig(
        flashInput,
        flashCurrent,
        sizeScale,
    );
    const burstTwinkleCloud = resolveBurstTwinkleCloudConfig(
        twinkleInput,
        twinkleCurrent,
        sizeScale,
        envelopeTimeScale,
    );

    return {
        sizeScale,
        simple,
        burstForms,
        burstSparks,
        burstCenterFlash,
        burstTwinkleCloud,
    };
}
