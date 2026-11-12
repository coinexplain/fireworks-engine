import { createBurstEvent, isCurrentRun, notifyBurst } from './burstEvents.js';
import { BURST_WORK } from './burstSequence.js';
import {
    BURST_FLASH_ATTACK_UNIT,
    DEFAULT_BURST_SINGLE_COLOR,
    DEFAULT_BURST_PALETTE,
    GLYPH_SPRITE_SIZE_MIN,
    GLYPH_SPRITE_RADIUS_SCALE,
    WHITE_BRIGHTNESS_REFERENCE,
} from './defaults.js';
import {
    clamp,
    randomRange,
    resolveEnvelopeTimeScale,
    resolveFinite,
    resolveScaledInteger,
    resolveScaledInverseOverride,
    resolveScaledOverride,
    resolveSizeScale,
} from './mathResolvers.js';
import {
    normalizeGroupedPublicOptions,
    resolveBurstFormShapeSet,
    resolveBurstFlashColorMode,
} from './valueNormalizers.js';
import {
    buildBurstOptions,
    resolveTwinkleParticleSizeScale,
} from './burstConfigBuilder.js';
import {
    normalizeHexColor,
    toHexChannel,
} from './colorUtils.js';

const FORM_PARTICLE_TUNING = {
    angleJitter: 0.12,
    dragMin: 0.965,
    dragMax: 0.982,
};

const FORM_SPIN_TUNING = {
    phaseCycleRad: Math.PI * 2,
    phaseSpeedMin: 4.8,
    phaseSpeedMax: 7.6,
    angleSpeedMin: -1.6,
    angleSpeedMax: 1.6,
    minWidthScaleMin: 0.02,
    minWidthScaleMax: 0.12,
};

const FORM_SPIN_VARIANCE_TUNING = {
    strengthMin: 0.4,
    strengthMax: 1.2,
    phaseSpeedJitterMin: 0.65,
    phaseSpeedJitterMax: 1.35,
    angleSpeedJitterMin: 0.65,
    angleSpeedJitterMax: 1.35,
    flipExponentMin: 0.7,
    flipExponentMax: 1.45,
    rateWaveSpeedMin: 0.9,
    rateWaveSpeedMax: 2.2,
    rateWaveAmplitudeMin: 0.08,
    rateWaveAmplitudeMax: 0.34,
};

const FORM_SPIN_ACTIVITY_TUNING = {
    budgetJitterMin: 0.85,
    budgetJitterMax: 1.25,
    initialActiveChanceBase: 0.28,
    initialActiveChanceScale: 0.55,
    initialActiveChanceMax: 0.9,
    durationMinFactor: 0.45,
    durationMaxFactor: 1.7,
    pauseMinFactor: 0.28,
    pauseMaxFactor: 1.9,
    minWindow: 0.05,
};

const FORM_WOBBLE_TUNING = {
    lateralSpeedMin: 20,
    lateralSpeedMax: 44,
    targetHoldMin: 0.05,
    targetHoldMax: 0.22,
};

const BURST_SPARK_TUNING = {
    angleJitter: 0.18,
    simpleFactor: 0.82,
    gravityFactor: 0.74,
    dragMin: 0.958,
    dragMax: 0.978,
    minInitialSpeed: 1,
    depthMinProjection: 0.12,
    depthGamma: 1.1,
    depthSpeedRangeEpsilon: 0.0001,
};

const BURST_FLASH_RUNTIME_LIMITS = {
    minLife: 0.02,
};

const BURST_FLASH_DURATION_LIMITS = {
    minAttackDuration: 0.0001,
};

const TWINKLE_CLOUD_RUNTIME_LIMITS = {
    countMin: 1,
    spawnSpreadPowerGuard: 0.001,
    lifeJitterMin: 0.7,
    lifeJitterMax: 1.2,
    lifeClampMin: 0.01,
    sizeScaleMin: 0.7,
    sizeScaleMax: 1.25,
    alphaScaleMin: 0.8,
    alphaScaleMax: 1.15,
    minRenderedSize: 0.12,
    minCloudLife: 0.02,
};

const BURST_DIRECTION_TUNING = {
    minConeDeg: 0,
    maxConeDeg: 360,
    fullConeEpsilonRad: 0.0001,
    defaultDirectionDeg: 0,
    defaultConeDeg: 360,
};

const BURST_DIRECTION_CONSTANTS = {
    fullCircleRad: Math.PI * 2,
    degToRad: Math.PI / 180,
};

const RGB_COLOR_TUNING = {
    channelStep: 32,
    channelMax: 255,
};

function randomQuantizedColorChannel() {
    const step = RGB_COLOR_TUNING.channelStep;
    const maxStepIndex = Math.ceil(RGB_COLOR_TUNING.channelMax / step);
    const stepIndex = Math.floor(randomRange(0, maxStepIndex + 1));
    return stepIndex >= maxStepIndex
        ? RGB_COLOR_TUNING.channelMax
        : stepIndex * step;
}

function resolveBurstFormGlyphSet(glyph) {
    const symbols = Array.from(glyph);
    return symbols.length > 0 ? symbols : ['★'];
}

function resolveDirectedBurstAngle(index, totalCount, directionDeg, coneDeg, jitter) {
    const safeDirectionDeg = Number.isFinite(directionDeg)
        ? directionDeg
        : BURST_DIRECTION_TUNING.defaultDirectionDeg;
    const safeConeDeg = Number.isFinite(coneDeg)
        ? coneDeg
        : BURST_DIRECTION_TUNING.defaultConeDeg;
    const boundedConeDeg = clamp(
        safeConeDeg,
        BURST_DIRECTION_TUNING.minConeDeg,
        BURST_DIRECTION_TUNING.maxConeDeg,
    );
    const coneRad = boundedConeDeg * BURST_DIRECTION_CONSTANTS.degToRad;

    if (coneRad >= BURST_DIRECTION_CONSTANTS.fullCircleRad - BURST_DIRECTION_TUNING.fullConeEpsilonRad) {
        return ((BURST_DIRECTION_CONSTANTS.fullCircleRad * index) / totalCount)
            + randomRange(-jitter, jitter);
    }

    const directionRad = -safeDirectionDeg * BURST_DIRECTION_CONSTANTS.degToRad;
    const halfCone = coneRad / 2;
    const startAngle = directionRad - halfCone;
    const endAngle = directionRad + halfCone;
    const baseAngle = totalCount <= 1
        ? directionRad
        : startAngle + (coneRad * (index / (totalCount - 1)));

    return clamp(baseAngle + randomRange(-jitter, jitter), startAngle, endAngle);
}

export function resolveBurstBaseColor(engine, palette, colorMode = engine.burstForms.colorMode, singleColor = engine.burstForms.singleColor) {
    if (colorMode === 'single') {
        return singleColor;
    }

    if (colorMode === 'rgb') {
        const r = randomQuantizedColorChannel();
        const g = randomQuantizedColorChannel();
        const b = randomQuantizedColorChannel();
        return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
    }

    const safePalette = Array.isArray(palette) && palette.length > 0
        ? palette
        : [DEFAULT_BURST_SINGLE_COLOR];
    const paletteIndex = Math.floor(randomRange(0, safePalette.length));
    return safePalette[clamp(paletteIndex, 0, safePalette.length - 1)] ?? safePalette[0];
}

export function resolveBurstFlashAttackDuration(attackScale) {
    return Math.max(BURST_FLASH_DURATION_LIMITS.minAttackDuration, attackScale * BURST_FLASH_ATTACK_UNIT);
}

function resolveBurstCurrentConfig(engine) {
    return {
        sizeScale: engine.sizeScale,
        burstForms: engine.burstForms,
        burstSparks: engine.burstSparks,
        burstCenterFlash: engine.burstCenterFlash,
        burstTwinkleCloud: engine.burstTwinkleCloud,
    };
}

function createBurstRequests(x, y, options, flashOptions = options) {
    const requests = [];
    const burstForms = options.burstForms ?? options;
    const burstSparks = options.burstSparks ?? options;
    const formCount = burstForms.count ?? 0;

    if (burstForms.enabled && formCount > 0) {
        requests.push({
            x,
            y,
            options,
            flashOptions,
            layer: 'burstForm',
            totalCount: formCount,
            nextIndex: 0,
            spawnBurstCenterFlash: true,
            spawnBurstTwinkleCloud: true,
            flashSpawned: false,
            twinkleCloudSpawned: false,
        });
    }

    const sparkCount = burstSparks.count ?? 0;
    if (burstSparks.enabled && sparkCount > 0) {
        requests.push({
            x,
            y,
            options,
            flashOptions,
            layer: 'burstSpark',
            totalCount: sparkCount,
            nextIndex: 0,
            spawnBurstCenterFlash: requests.length === 0,
            spawnBurstTwinkleCloud: requests.length === 0,
            flashSpawned: false,
            twinkleCloudSpawned: false,
        });
    }

    return requests;
}

function spawnBurstExtras(engine, burst, flashOptions, cloudOptions) {
    if (spawnBurstCenterFlash(engine, burst.x, burst.y, flashOptions)) {
        notifyBurst(engine, burst);
    }
    if (!isCurrentRun(engine, burst.generation)) return false;
    if (spawnBurstTwinkleCloud(engine, burst.x, burst.y, cloudOptions)) {
        notifyBurst(engine, burst);
    }
    return isCurrentRun(engine, burst.generation);
}

function enqueueBurst(engine, x, y, options = {}, work) {
    if (!engine.running) {
        return false;
    }

    const burstOptions = buildBurstOptions(
        options,
        resolveBurstCurrentConfig(engine),
    );
    const requests = createBurstRequests(x, y, burstOptions, options);
    const burst = createBurstEvent(engine, x, y, work);
    requests.forEach((request) => { request.burstEvent = burst; });

    if (requests.length === 0) {
        spawnBurstExtras(engine, burst, options, burstOptions);
        return true;
    }

    engine.burstQueue.push(...requests);
    return true;
}

function spawnFormParticles(engine, request, startIndex, count) {
    const { x, y, options } = request;
    const burstForms = options.burstForms ?? options;
    const {
        speedMin,
        speedMax,
        gravity,
        lifeMin,
        lifeMax,
        sizeMin,
        sizeMax,
        spin,
        spinCoverage,
        spinDuration,
        spinPause,
        highlight,
        highlightAngleDeg,
        highlightWidth,
        wobble,
        directionDeg,
        coneDeg,
        palette,
        simple,
        colorMode,
        singleColor,
        shape,
        glyph,
    } = burstForms;
    const totalCount = request.totalCount;
    const formShapeSet = resolveBurstFormShapeSet(shape);
    const formShapeCount = formShapeSet.length;
    const hasGlyphShape = formShapeSet.includes('glyph');
    const glyphSet = hasGlyphShape ? resolveBurstFormGlyphSet(glyph) : null;
    const glyphCount = glyphSet?.length ?? 0;

    for (let index = startIndex; index < startIndex + count; index += 1) {
        const angle = resolveDirectedBurstAngle(
            index,
            totalCount,
            directionDeg,
            coneDeg,
            FORM_PARTICLE_TUNING.angleJitter,
        );
        const speed = randomRange(speedMin, speedMax);
        const radius = randomRange(sizeMin, sizeMax);
        const life = randomRange(lifeMin, lifeMax);
        const baseColor = resolveBurstBaseColor(engine, palette, colorMode, singleColor);
        const rawSpinStrength = Math.max(0, spin ?? 0);
        const spinCoverageFactor = clamp(spinCoverage ?? 1, 0, 1);
        const hasSpinActivity = rawSpinStrength > 0 && spinCoverageFactor > 0;
        const spinStrength = hasSpinActivity
            ? rawSpinStrength * randomRange(
                FORM_SPIN_VARIANCE_TUNING.strengthMin,
                FORM_SPIN_VARIANCE_TUNING.strengthMax,
            )
            : 0;
        const spinInitialActiveChance = clamp(
            FORM_SPIN_ACTIVITY_TUNING.initialActiveChanceBase
                + (spinCoverageFactor * FORM_SPIN_ACTIVITY_TUNING.initialActiveChanceScale),
            0,
            FORM_SPIN_ACTIVITY_TUNING.initialActiveChanceMax,
        );
        const safeSpinDuration = Math.max(FORM_SPIN_ACTIVITY_TUNING.minWindow, spinDuration ?? 0);
        const safeSpinPause = Math.max(FORM_SPIN_ACTIVITY_TUNING.minWindow, spinPause ?? 0);
        const spinActiveHoldMin = Math.max(
            FORM_SPIN_ACTIVITY_TUNING.minWindow,
            safeSpinDuration * FORM_SPIN_ACTIVITY_TUNING.durationMinFactor,
        );
        const spinActiveHoldMax = Math.max(
            spinActiveHoldMin,
            safeSpinDuration * FORM_SPIN_ACTIVITY_TUNING.durationMaxFactor,
        );
        const spinInactiveHoldMin = Math.max(
            FORM_SPIN_ACTIVITY_TUNING.minWindow,
            safeSpinPause * FORM_SPIN_ACTIVITY_TUNING.pauseMinFactor,
        );
        const spinInactiveHoldMax = Math.max(
            spinInactiveHoldMin,
            safeSpinPause * FORM_SPIN_ACTIVITY_TUNING.pauseMaxFactor,
        );
        const spinInitiallyActive = hasSpinActivity && Math.random() < spinInitialActiveChance;
        const spinHoldMin = spinInitiallyActive
            ? spinActiveHoldMin
            : spinInactiveHoldMin;
        const spinHoldMax = spinInitiallyActive
            ? spinActiveHoldMax
            : spinInactiveHoldMax;
        const spinBudget = hasSpinActivity
            ? life
            * spinCoverageFactor
            * randomRange(
                FORM_SPIN_ACTIVITY_TUNING.budgetJitterMin,
                FORM_SPIN_ACTIVITY_TUNING.budgetJitterMax,
            )
            : 0;
        const wobbleStrength = Math.max(0, wobble ?? 0);

        const particle = engine.formPool.length > 0 ? engine.formPool.pop() : {};
        const formShape = formShapeCount === 1
            ? formShapeSet[0]
            : formShapeSet[clamp(Math.floor(randomRange(0, formShapeCount)), 0, formShapeCount - 1)];
        const formGlyph = formShape === 'glyph' && glyphSet
            ? glyphSet[clamp(Math.floor(randomRange(0, glyphCount)), 0, glyphCount - 1)]
            : null;

        particle.type = 'form';
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.gravity = gravity;
        particle.life = life;
        particle.maxLife = life;
        particle.radius = radius;
        particle.color = baseColor;
        particle.drag = randomRange(FORM_PARTICLE_TUNING.dragMin, FORM_PARTICLE_TUNING.dragMax);
        particle.simple = simple;
        particle.formShape = formShape;
        particle.formGlyph = formGlyph;
        particle.formSpin = spinStrength;
        particle.formSpinActive = spinInitiallyActive;
        particle.formSpinBudget = spinBudget;
        particle.formSpinToggleTimer = hasSpinActivity
            ? randomRange(spinHoldMin, spinHoldMax)
            : 0;
        particle.formSpinBlend = spinInitiallyActive ? randomRange(0.1, 1) : 0;
        particle.formSpinActiveHoldMin = spinActiveHoldMin;
        particle.formSpinActiveHoldMax = spinActiveHoldMax;
        particle.formSpinInactiveHoldMin = spinInactiveHoldMin;
        particle.formSpinInactiveHoldMax = spinInactiveHoldMax;
        particle.formHighlight = Math.max(0, highlight ?? 0);
        particle.formHighlightAngleDeg = Number.isFinite(highlightAngleDeg) ? highlightAngleDeg : 0;
        particle.formHighlightWidth = Math.max(0, highlightWidth ?? 0);
        particle.formSpinPhase = randomRange(0, FORM_SPIN_TUNING.phaseCycleRad);
        particle.formSpinPhaseSpeed = spinStrength > 0
            ? spinStrength
            * randomRange(FORM_SPIN_TUNING.phaseSpeedMin, FORM_SPIN_TUNING.phaseSpeedMax)
            * randomRange(
                FORM_SPIN_VARIANCE_TUNING.phaseSpeedJitterMin,
                FORM_SPIN_VARIANCE_TUNING.phaseSpeedJitterMax,
            )
            : 0;
        particle.formSpinAngle = randomRange(0, FORM_SPIN_TUNING.phaseCycleRad);
        particle.formSpinAngleSpeed = spinStrength > 0
            ? spinStrength
            * randomRange(FORM_SPIN_TUNING.angleSpeedMin, FORM_SPIN_TUNING.angleSpeedMax)
            * randomRange(
                FORM_SPIN_VARIANCE_TUNING.angleSpeedJitterMin,
                FORM_SPIN_VARIANCE_TUNING.angleSpeedJitterMax,
            )
            : 0;
        particle.formSpinMinWidthScale = spinStrength > 0
            ? randomRange(FORM_SPIN_TUNING.minWidthScaleMin, FORM_SPIN_TUNING.minWidthScaleMax)
            : 1;
        particle.formSpinFlipExponent = spinStrength > 0
            ? randomRange(
                FORM_SPIN_VARIANCE_TUNING.flipExponentMin,
                FORM_SPIN_VARIANCE_TUNING.flipExponentMax,
            )
            : 1;
        particle.formSpinRateWavePhase = randomRange(0, FORM_SPIN_TUNING.phaseCycleRad);
        particle.formSpinRateWaveSpeed = spinStrength > 0
            ? randomRange(
                FORM_SPIN_VARIANCE_TUNING.rateWaveSpeedMin,
                FORM_SPIN_VARIANCE_TUNING.rateWaveSpeedMax,
            )
            : 0;
        particle.formSpinRateWaveAmplitude = spinStrength > 0
            ? randomRange(
                FORM_SPIN_VARIANCE_TUNING.rateWaveAmplitudeMin,
                FORM_SPIN_VARIANCE_TUNING.rateWaveAmplitudeMax,
            )
            : 0;
        particle.formWidthScale = 1;
        particle.formWobble = wobbleStrength;
        particle.formWobbleLateralSpeed = wobbleStrength > 0
            ? randomRange(FORM_WOBBLE_TUNING.lateralSpeedMin, FORM_WOBBLE_TUNING.lateralSpeedMax) * wobbleStrength
            : 0;
        particle.formWobbleVelocity = 0;
        particle.formWobbleTarget = particle.formWobbleLateralSpeed > 0
            ? randomRange(-particle.formWobbleLateralSpeed, particle.formWobbleLateralSpeed)
            : 0;
        particle.formWobbleTargetTimer = randomRange(
            FORM_WOBBLE_TUNING.targetHoldMin,
            FORM_WOBBLE_TUNING.targetHoldMax,
        );
        if (formShape === 'glyph') {
            const glyphSpriteSize = Math.max(GLYPH_SPRITE_SIZE_MIN, radius * GLYPH_SPRITE_RADIUS_SCALE);
            particle.glyphSpriteSize = glyphSpriteSize;
            particle.spriteKey = `${formGlyph}|${particle.color}|${Math.round(glyphSpriteSize)}`;
        } else {
            particle.glyphSpriteSize = null;
            particle.spriteKey = null;
        }

        engine.particles.push(particle);
    }
}

function spawnBurstSparkParticles(engine, request, startIndex, count) {
    const { x, y, options } = request;
    const burstSparks = options.burstSparks ?? options;
    const {
        speedMin,
        speedMax,
        gravity,
        lifeMin,
        lifeMax,
        directionDeg,
        coneDeg,
        palette,
        simple,
        length,
        tailScale,
        thickness,
        shape,
        colorMode,
        singleColor,
    } = burstSparks;
    const totalCount = request.totalCount;
    const simpleFactor = simple ? BURST_SPARK_TUNING.simpleFactor : 1;
    const speedRange = speedMax - speedMin;
    const hasSpeedRange = speedRange > BURST_SPARK_TUNING.depthSpeedRangeEpsilon;
    const minProjection = BURST_SPARK_TUNING.depthMinProjection;
    const projectionRange = 1 - minProjection;

    for (let index = startIndex; index < startIndex + count; index += 1) {
        const angle = resolveDirectedBurstAngle(
            index,
            totalCount,
            directionDeg,
            coneDeg,
            BURST_SPARK_TUNING.angleJitter,
        );
        const baseSpeed = randomRange(speedMin, speedMax);
        const speed = baseSpeed * simpleFactor;
        const life = randomRange(lifeMin, lifeMax) * simpleFactor;
        const baseColor = resolveBurstBaseColor(engine, palette, colorMode, singleColor);
        const sparkLength = length * simpleFactor;
        const sparkThickness = thickness;
        const speedT = hasSpeedRange
            ? clamp((baseSpeed - speedMin) / speedRange, 0, 1)
            : 1;
        const sparkDepthFactor = hasSpeedRange
            ? minProjection + (Math.pow(speedT, BURST_SPARK_TUNING.depthGamma) * projectionRange)
            : 1;

        const particle = engine.sparkPool.length > 0 ? engine.sparkPool.pop() : {};

        particle.type = 'burstSpark';
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.gravity = gravity * BURST_SPARK_TUNING.gravityFactor;
        particle.life = life;
        particle.maxLife = life;
        particle.color = baseColor;
        particle.drag = randomRange(BURST_SPARK_TUNING.dragMin, BURST_SPARK_TUNING.dragMax);
        particle.simple = simple;
        particle.sparkLength = sparkLength;
        particle.sparkTailScale = tailScale;
        particle.sparkThickness = sparkThickness;
        particle.initialSpeed = Math.max(speed, BURST_SPARK_TUNING.minInitialSpeed);
        particle.sparkDepthFactor = sparkDepthFactor;
        particle.sparkShape = shape;

        engine.particles.push(particle);
    }
}

function spawnBurstParticles(engine, request, startIndex, count) {
    if (request.layer === 'burstSpark') {
        spawnBurstSparkParticles(engine, request, startIndex, count);
        return;
    }

    spawnFormParticles(engine, request, startIndex, count);
}

export function drainBurstQueue(engine) {
    const generation = engine.runGeneration;
    let remainingBudget = engine.maxBurstParticlesPerFrame;

    while (remainingBudget > 0 && engine.burstQueue.length > 0) {
        const request = engine.burstQueue[0];
        const remainingParticles = request.totalCount - request.nextIndex;

        if (remainingParticles <= 0) {
            engine.burstQueue.shift();
            continue;
        }

        const spawnCount = Math.min(remainingBudget, remainingParticles);
        if (request.spawnBurstCenterFlash && !request.flashSpawned) {
            request.flashSpawned = true;
            if (spawnBurstCenterFlash(engine, request.x, request.y, request.flashOptions ?? request.options)) {
                notifyBurst(engine, request.burstEvent);
            }
            if (!isCurrentRun(engine, generation)) return;
        }
        if (request.spawnBurstTwinkleCloud && !request.twinkleCloudSpawned) {
            request.twinkleCloudSpawned = true;
            if (spawnBurstTwinkleCloud(engine, request.x, request.y, request.options)) {
                notifyBurst(engine, request.burstEvent);
            }
            if (!isCurrentRun(engine, generation)) return;
        }
        spawnBurstParticles(engine, request, request.nextIndex, spawnCount);
        notifyBurst(engine, request.burstEvent);
        if (!isCurrentRun(engine, generation)) return;
        request.nextIndex += spawnCount;
        remainingBudget -= spawnCount;

        if (request.nextIndex >= request.totalCount) {
            engine.burstQueue.shift();
        } else {
            break;
        }
    }
}

export function launchBurst(engine, x, y, options = {}) {
    const normalizedOptions = normalizeGroupedPublicOptions(options);
    if (engine.enableBurstQueueThrottling) {
        return enqueueBurst(engine, x, y, normalizedOptions, options[BURST_WORK]);
    }

    if (!engine.running) {
        return false;
    }

    const burstOptions = buildBurstOptions(
        normalizedOptions,
        resolveBurstCurrentConfig(engine),
    );
    const burst = createBurstEvent(engine, x, y, options[BURST_WORK]);
    if (!spawnBurstExtras(engine, burst, normalizedOptions, normalizedOptions)) return true;
    const requests = createBurstRequests(x, y, burstOptions);
    for (const request of requests) {
        spawnBurstParticles(engine, request, 0, request.totalCount);
        notifyBurst(engine, burst);
        if (!isCurrentRun(engine, burst.generation)) return true;
    }
    return true;
}


function spawnBurstCenterFlash(engine, x, y, options = {}) {
    const burstCenterFlash = options?.burstCenterFlash ?? {};
    const sizeScale = resolveSizeScale(options?.sizeScale, engine.sizeScale);
    const enabled = burstCenterFlash.enabled ?? engine.burstCenterFlash.enabled;
    if (!enabled) {
        return;
    }

    const startSize = resolveScaledOverride(
        burstCenterFlash.startSize,
        engine.burstCenterFlash.startSize,
        sizeScale,
    );
    const endSize = resolveScaledOverride(
        burstCenterFlash.endSize,
        engine.burstCenterFlash.endSize,
        sizeScale,
    );
    const peakAlpha = burstCenterFlash.peakAlpha ?? engine.burstCenterFlash.peakAlpha;
    const attackScale = resolveFinite(
        burstCenterFlash.attack,
        engine.burstCenterFlash.attack,
    );
    const fade = resolveFinite(
        burstCenterFlash.fade,
        engine.burstCenterFlash.fade,
    );
    const colorMode = resolveBurstFlashColorMode(
        burstCenterFlash.colorMode ?? engine.burstCenterFlash.colorMode,
    );
    const singleColor = normalizeHexColor(
        burstCenterFlash.color,
        engine.burstCenterFlash.color,
    );
    const palette = burstCenterFlash.palette ?? options?.burstForms?.palette ?? engine.burstForms.palette;
    const color = resolveBurstBaseColor(
        engine,
        palette,
        colorMode,
        singleColor,
    );
    const innerStop = burstCenterFlash.innerStop ?? engine.burstCenterFlash.innerStop;
    const life = Math.max(resolveBurstFlashAttackDuration(attackScale) + fade, BURST_FLASH_RUNTIME_LIMITS.minLife);

    engine.flashes.push({
        type: 'burstFlash',
        x,
        y,
        age: 0,
        life,
        maxLife: life,
        startSize,
        endSize,
        peakAlpha,
        attack: attackScale,
        fade,
        color,
        innerStop,
    });
    return true;
}

function spawnBurstTwinkleCloud(engine, x, y, options = {}) {
    const burstTwinkleCloud = options?.burstTwinkleCloud ?? {};
    const sizeScale = resolveSizeScale(options?.sizeScale, engine.sizeScale);
    const envelopeTimeScale = resolveEnvelopeTimeScale(sizeScale);
    const enabled = burstTwinkleCloud.enabled ?? engine.burstTwinkleCloud.enabled;
    if (!enabled) {
        return;
    }

    const count = resolveScaledInteger(
        burstTwinkleCloud.count,
        engine.burstTwinkleCloud.count,
        TWINKLE_CLOUD_RUNTIME_LIMITS.countMin,
        sizeScale,
    );
    const radius = resolveScaledOverride(
        burstTwinkleCloud.radius,
        engine.burstTwinkleCloud.radius,
        sizeScale,
    );
    const startDelay = resolveScaledOverride(
        burstTwinkleCloud.startDelay,
        engine.burstTwinkleCloud.startDelay,
        envelopeTimeScale,
    );
    const duration = resolveScaledOverride(
        burstTwinkleCloud.duration,
        engine.burstTwinkleCloud.duration,
        envelopeTimeScale,
    );
    const twinkleLife = resolveScaledOverride(
        burstTwinkleCloud.twinkleLife,
        engine.burstTwinkleCloud.twinkleLife,
        envelopeTimeScale,
    );
    const brightness = burstTwinkleCloud.brightness ?? engine.burstTwinkleCloud.brightness;
    const particleSizeScale = resolveTwinkleParticleSizeScale(sizeScale);
    const size = resolveScaledOverride(
        burstTwinkleCloud.size,
        engine.burstTwinkleCloud.size,
        particleSizeScale,
    );
    const spawnSpread = resolveScaledInverseOverride(
        burstTwinkleCloud.spawnSpread,
        engine.burstTwinkleCloud.spawnSpread,
        sizeScale,
    );
    const brightnessScale = clamp(brightness / WHITE_BRIGHTNESS_REFERENCE, 0, 1);
    const twinkles = [];
    let maxLife = startDelay;

    for (let index = 0; index < count; index += 1) {
        const angle = randomRange(0, Math.PI * 2);
        const radialSample = Math.sqrt(randomRange(0, 1));
        const distance = radius * Math.pow(radialSample, 1 / Math.max(spawnSpread, TWINKLE_CLOUD_RUNTIME_LIMITS.spawnSpreadPowerGuard));
        const appearAt = startDelay + randomRange(0, duration);
        const life = Math.max(
            TWINKLE_CLOUD_RUNTIME_LIMITS.lifeClampMin,
            twinkleLife * randomRange(TWINKLE_CLOUD_RUNTIME_LIMITS.lifeJitterMin, TWINKLE_CLOUD_RUNTIME_LIMITS.lifeJitterMax),
        );
        const sizeScale = randomRange(TWINKLE_CLOUD_RUNTIME_LIMITS.sizeScaleMin, TWINKLE_CLOUD_RUNTIME_LIMITS.sizeScaleMax);
        const alphaScale = randomRange(TWINKLE_CLOUD_RUNTIME_LIMITS.alphaScaleMin, TWINKLE_CLOUD_RUNTIME_LIMITS.alphaScaleMax);

        twinkles.push({
            x: x + (Math.cos(angle) * distance),
            y: y + (Math.sin(angle) * distance),
            appearAt,
            life,
            size: Math.max(TWINKLE_CLOUD_RUNTIME_LIMITS.minRenderedSize, size * sizeScale),
            alphaScale,
        });
        maxLife = Math.max(maxLife, appearAt + life);
    }

    engine.twinkleClouds.push({
        type: 'burstTwinkleCloud',
        x,
        y,
        age: 0,
        maxLife: Math.max(TWINKLE_CLOUD_RUNTIME_LIMITS.minCloudLife, maxLife),
        startDelay,
        duration,
        twinkleLife,
        radius,
        brightness,
        brightnessScale,
        size,
        spawnSpread,
        twinkles,
    });
    return true;
}
