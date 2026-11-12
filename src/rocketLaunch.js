import {
    clamp,
    randomRange,
    resolveEnvelopeTimeScale,
    resolveScaledInteger,
    resolveScaledInverseOverride,
    resolveScaledOverride,
    resolveSizeScale,
} from './mathResolvers.js';
import {
    WHITE_BRIGHTNESS_REFERENCE,
} from './defaults.js';
import {
    isPlainRecord,
    normalizeGroupedPublicOptions,
    resolveBurstColorMode,
    resolveBurstEntityToggle,
} from './valueNormalizers.js';
import {
    normalizeHexColor,
} from './colorUtils.js';
import { buildBurstOptions } from './burstConfigBuilder.js';
import { BURST_SEQUENCE, BURST_WORK, reserveBurstWork } from './burstSequence.js';
import {
    launchBurst,
    resolveBurstBaseColor,
} from './burstSpawn.js';
import {
    ensureCanvas,
    resolveScaledDelay,
    scheduleTimeout,
    shouldReduceMotion,
    startLoop,
} from './runtimeLifecycle.js';


const ROCKET_TARGET_TUNING = {
    targetXMinRatio: 0.25,
    targetXMaxRatio: 0.75,
    targetXJitter: 80,
    targetYMinRatio: 0.14,
    targetYMaxRatio: 0.38,
    explicitStartJitterX: 72,
    explicitStartOffsetY: 48,
    fallbackStartOffsetYMin: 20,
    fallbackStartOffsetYMax: 80,
};

const ROCKET_FLIGHT_GUARDS = {
    minDistanceEpsilon: 0.0001,
};

const ROCKET_DURATION_LIMITS = {
    defaultMin: 0.7,
    defaultMax: 1.0,
};

function resolveRocketDuration(distance, duration, speed) {
    if (speed > 0 && distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon) {
        return distance / speed;
    }

    return duration;
}

const ROCKET_CASCADE_LIMITS = {
    burstCountMax: 50,
    defaultDelayMs: 48,
    defaultSpread: 18,
};

const ROCKET_CASCADE_MODES = {
    burst: 'burst',
    rocket: 'rocket',
};

const ROCKET_CASCADE_DIRECTION_TUNING = {
    minConeDeg: 0,
    maxConeDeg: 360,
    defaultDirectionDeg: 0,
    defaultConeDeg: 360,
};

const ROCKET_CASCADE_DIRECTION_CONSTANTS = {
    fullCircleRad: Math.PI * 2,
    degToRad: Math.PI / 180,
};

const ROCKET_TAIL_EMBER_TUNING = {
    speedMin: 0.1,
    fadeMin: 0.1,
    countMin: 1,
    spreadMin: 0,
    sizeMin: 0.05,
    lifeBaseDivisor: 0.09,
    trailBlendDistance: 18,
    trailBlendMin: 0.18,
    requestedCountMin: 1,
    requestedCountFactorBase: 0.12,
    requestedCountFactorPerEmber: 0.05,
    cloudLengthMin: 6,
    cloudLengthSpreadYFactor: 1.15,
    cloudLengthSpreadXFactor: 0.25,
    cloudLengthSpeedFactor: 2.6,
    cloudLengthSizeFactor: 3.4,
    cloudWidthMin: 1.25,
    cloudWidthSpreadXFactor: 0.78,
    cloudWidthSizeFactor: 1.35,
    progressMin: 0.08,
    progressMax: 0.98,
    depthPowMin: 0.05,
    depthPowMax: 1,
    depthPowExponent: 1.45,
    cloudJitterFactor: 0.16,
    cloudOffsetFactor: 0.18,
    cloudOffsetBase: 0.55,
    cloudOffsetTrailBlendFactor: 0.25,
    trailPushMin: 0.5,
    positionJitterFactor: 0.18,
    lifeRandomMin: 0.72,
    lifeRandomMax: 1.15,
    lifeMin: 0.02,
    lifeMax: 0.42,
    speedRandomMin: 0.12,
    speedRandomMax: 0.52,
    distanceScaleBase: 0.38,
    distanceScaleTrailBlendFactor: 0.52,
    lateralVelocityFactor: 0.24,
    gravityBase: 24,
    gravitySpeedFactor: 3.1,
    radiusRandomMin: 0.85,
    radiusRandomMax: 1.2,
    drag: 0.82,
};

function resolveRocketCascadeMode(value) {
    return value === ROCKET_CASCADE_MODES.rocket
        ? ROCKET_CASCADE_MODES.rocket
        : ROCKET_CASCADE_MODES.burst;
}

function resolveOptionalPositiveRange(minValue, maxValue) {
    const hasMin = Number.isFinite(minValue) && minValue > 0;
    const hasMax = Number.isFinite(maxValue) && maxValue > 0;

    if (!hasMin && !hasMax) {
        return null;
    }

    const resolvedMin = hasMin ? minValue : maxValue;
    const resolvedMax = hasMax ? maxValue : minValue;

    if (resolvedMin <= resolvedMax) {
        return {
            min: resolvedMin,
            max: resolvedMax,
        };
    }

    return {
        min: resolvedMax,
        max: resolvedMin,
    };
}

function resolveCascadeChildLaunchOptions(baseChildOptions, cascade, distance) {
    const childRocketOptions = isPlainRecord(baseChildOptions?.rocket)
        ? baseChildOptions.rocket
        : {};
    const speedRange = resolveOptionalPositiveRange(
        cascade?.childSpeedMin,
        cascade?.childSpeedMax,
    );

    let childDuration = null;
    if (speedRange && distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon) {
        const speed = randomRange(speedRange.min, speedRange.max);
        childDuration = speed > 0 ? distance / speed : null;
    }

    if (!(Number.isFinite(childDuration) && childDuration > 0)) {
        if (Number.isFinite(childRocketOptions.speed) && childRocketOptions.speed > 0) {
            return baseChildOptions;
        }

        const durationRange = resolveOptionalPositiveRange(
            childRocketOptions.durationMin,
            childRocketOptions.durationMax,
        );
        if (!durationRange) {
            return baseChildOptions;
        }

        childDuration = randomRange(durationRange.min, durationRange.max);
    }

    return {
        ...baseChildOptions,
        rocket: {
            ...childRocketOptions,
            speed: 0,
            durationMin: childDuration,
            durationMax: childDuration,
        },
    };
}

function resolveCascadeDirectedAngle(directionDeg, coneDeg) {
    const safeDirectionDeg = Number.isFinite(directionDeg)
        ? directionDeg
        : ROCKET_CASCADE_DIRECTION_TUNING.defaultDirectionDeg;
    const safeConeDeg = Number.isFinite(coneDeg)
        ? coneDeg
        : ROCKET_CASCADE_DIRECTION_TUNING.defaultConeDeg;
    const boundedConeDeg = clamp(
        safeConeDeg,
        ROCKET_CASCADE_DIRECTION_TUNING.minConeDeg,
        ROCKET_CASCADE_DIRECTION_TUNING.maxConeDeg,
    );
    const coneRad = boundedConeDeg * ROCKET_CASCADE_DIRECTION_CONSTANTS.degToRad;

    if (coneRad >= ROCKET_CASCADE_DIRECTION_CONSTANTS.fullCircleRad) {
        return randomRange(0, ROCKET_CASCADE_DIRECTION_CONSTANTS.fullCircleRad);
    }

    const directionRad = -safeDirectionDeg * ROCKET_CASCADE_DIRECTION_CONSTANTS.degToRad;
    const halfCone = coneRad / 2;
    const startAngle = directionRad - halfCone;
    return randomRange(startAngle, startAngle + coneRad);
}

function resolveCascadeTargetPoint(engine, originX, originY, spreadX, spreadY, cascade) {
    const angle = resolveCascadeDirectedAngle(
        cascade?.childDirectionDeg,
        cascade?.childConeDeg,
    );
    const distanceRatio = Math.sqrt(randomRange(0, 1));

    return {
        x: clamp(originX + (Math.cos(angle) * spreadX * distanceRatio), 0, engine.width),
        y: clamp(originY + (Math.sin(angle) * spreadY * distanceRatio), 0, engine.height),
    };
}

function resolveCascadeRandomTargetPoint(engine, originX, originY, spreadX, spreadY) {
    const angle = randomRange(0, ROCKET_CASCADE_DIRECTION_CONSTANTS.fullCircleRad);
    const distanceRatio = Math.sqrt(randomRange(0, 1));

    return {
        x: clamp(originX + (Math.cos(angle) * spreadX * distanceRatio), 0, engine.width),
        y: clamp(originY + (Math.sin(angle) * spreadY * distanceRatio), 0, engine.height),
    };
}

function resolveDefaultCascadeChildLaunchOptions(rocket, cascade) {
    const burstOptions = rocket.burst ?? {};
    const tailEmbers = rocket.tailEmbers ?? {};
    const cascadeBursts = clamp(
        Math.floor(cascade?.childBursts ?? cascade?.bursts ?? 0),
        0,
        ROCKET_CASCADE_LIMITS.burstCountMax,
    );
    const cascadeDelay = cascade?.delay ?? ROCKET_CASCADE_LIMITS.defaultDelayMs;
    const cascadeSpreadX = cascade?.spreadX ?? ROCKET_CASCADE_LIMITS.defaultSpread;
    const cascadeSpreadY = cascade?.spreadY ?? ROCKET_CASCADE_LIMITS.defaultSpread;
    const childDuration = Math.max(
        ROCKET_DURATION_LIMITS.defaultMin,
        Number(rocket.maxLife) || ROCKET_DURATION_LIMITS.defaultMin,
    );
    const childDurationMin = cascade?.childDurationMin ?? childDuration;
    const childDurationMax = cascade?.childDurationMax ?? childDurationMin;

    return {
        simple: !!rocket.simple,
        rocket: {
            enabled: true,
            colorMode: 'single',
            singleColor: rocket.color,
            streakLength: rocket.sparkLength,
            finalStreakLength: rocket.sparkFinalLength,
            thickness: rocket.thickness,
            speed: 0,
            durationMin: childDurationMin,
            durationMax: childDurationMax,
            cascade: {
                mode: ROCKET_CASCADE_MODES.burst,
                bursts: cascadeBursts,
                delay: cascadeDelay,
                spreadX: cascadeSpreadX,
                spreadY: cascadeSpreadY,
            },
        },
        rocketTailEmbers: {
            enabled: !!tailEmbers.enabled,
            count: tailEmbers.count,
            brightness: tailEmbers.brightness,
            fade: tailEmbers.fade,
            spreadX: tailEmbers.spreadX,
            spreadY: tailEmbers.spreadY,
            speed: tailEmbers.speed,
            size: tailEmbers.size,
        },
        burstForms: { ...burstOptions.burstForms },
        burstSparks: { ...burstOptions.burstSparks },
        burstCenterFlash: { ...burstOptions.burstCenterFlash },
        burstTwinkleCloud: { ...burstOptions.burstTwinkleCloud },
    };
}


function launchRocketWithExplicitTarget(engine, options, explicitTarget) {
    if (shouldReduceMotion(engine)) {
        engine.stop();
        return false;
    }

    if (!ensureCanvas(engine)) {
        return false;
    }

    const generation = engine.runGeneration;
    const wasRunning = engine.running;
    if (!startLoop(engine)) {
        return false;
    }

    createRocket(engine, options, explicitTarget);

    if (engine.runGeneration === generation && !wasRunning) {
        engine.finishWhenDone();
    }

    return true;
}


function resolveCascadeCount(count, sizeScale) {
    return clamp(Math.floor((count ?? 0) * sizeScale), 0, ROCKET_CASCADE_LIMITS.burstCountMax);
}

// Only the validated victory recipe reaches this boundary: rocket children,
// followed by their finite direct-burst cascades. Reserve before any callback.
function reserveVictoryWork(sequence, rocket) {
    const childOptions = resolveDefaultCascadeChildLaunchOptions(rocket, rocket.cascade);
    const normalizedChild = normalizeGroupedPublicOptions(childOptions);
    const leafCount = resolveCascadeCount(normalizedChild.rocket.cascade.bursts, normalizedChild.sizeScale);
    const children = Array.from({ length: rocket.cascade.bursts }, () => {
        const leaves = Array.from({ length: leafCount }, () => reserveBurstWork(sequence));
        return reserveBurstWork(sequence, leaves);
    });
    return reserveBurstWork(sequence, children);
}

function createRocket(engine, options = {}, explicitTarget = null) {
    const normalizedOptions = normalizeGroupedPublicOptions(options);
    const {
        rocket: rocketInput = {},
        rocketTailEmbers: rocketTailEmbersInput = {},
    } = normalizedOptions;
    const rocketEnabled = resolveBurstEntityToggle(rocketInput.enabled) ?? engine.rocket.enabled;
    const rocketCascadeInput = isPlainRecord(rocketInput.cascade) ? rocketInput.cascade : {};
    const rocketCascadeMode = resolveRocketCascadeMode(rocketCascadeInput.mode);
    const rocketCascadeChild = isPlainRecord(rocketCascadeInput.child)
        ? rocketCascadeInput.child
        : null;
    const sizeScale = resolveSizeScale(normalizedOptions.sizeScale, engine.sizeScale);
    const envelopeTimeScale = resolveEnvelopeTimeScale(sizeScale);
    const rocketCascadeChildSpeedRange = resolveOptionalPositiveRange(
        rocketCascadeInput.childSpeedMin,
        rocketCascadeInput.childSpeedMax,
    );
    const rocketCascadeChildDirectionDeg = Number.isFinite(rocketCascadeInput.childDirectionDeg)
        ? rocketCascadeInput.childDirectionDeg
        : ROCKET_CASCADE_DIRECTION_TUNING.defaultDirectionDeg;
    const rocketCascadeChildConeDeg = Number.isFinite(rocketCascadeInput.childConeDeg)
        ? clamp(
            rocketCascadeInput.childConeDeg,
            ROCKET_CASCADE_DIRECTION_TUNING.minConeDeg,
            ROCKET_CASCADE_DIRECTION_TUNING.maxConeDeg,
        )
        : ROCKET_CASCADE_DIRECTION_TUNING.defaultConeDeg;
    const cascadeBurstOverrides = isPlainRecord(rocketCascadeInput.burst) ? rocketCascadeInput.burst : null;
    const cascadeBurstFormsInput = cascadeBurstOverrides?.burstForms;
    const burstFormsInput = isPlainRecord(cascadeBurstFormsInput) ? cascadeBurstFormsInput : {};
    const hasRocketColorAlias = typeof rocketInput.color === 'string';
    const rocketColorMode = hasRocketColorAlias
        ? 'single'
        : resolveBurstColorMode(rocketInput.colorMode ?? engine.rocket.colorMode);
    const rocketSingleColor = normalizeHexColor(
        hasRocketColorAlias ? rocketInput.color : rocketInput.singleColor,
        engine.rocket.singleColor,
    );
    const rocketPalette = Array.isArray(rocketInput.palette) && rocketInput.palette.length > 0
        ? rocketInput.palette
        : engine.rocket.palette;
    const tailEmbersEnabled = resolveBurstEntityToggle(rocketTailEmbersInput.enabled)
        ?? engine.rocketTailEmbers.enabled;
    const tailEmberCount = resolveScaledInteger(
        rocketTailEmbersInput.count,
        engine.rocketTailEmbers.count,
        1,
        sizeScale,
    );
    const tailEmberBrightness = rocketTailEmbersInput.brightness ?? engine.rocketTailEmbers.brightness;
    const tailEmberFade = resolveScaledInverseOverride(
        rocketTailEmbersInput.fade,
        engine.rocketTailEmbers.fade,
        envelopeTimeScale,
    );
    const tailEmberSpreadX = resolveScaledOverride(
        rocketTailEmbersInput.spreadX,
        engine.rocketTailEmbers.spreadX,
        sizeScale,
    );
    const tailEmberSpreadY = resolveScaledOverride(
        rocketTailEmbersInput.spreadY,
        engine.rocketTailEmbers.spreadY,
        sizeScale,
    );
    const tailEmberSpeed = resolveScaledOverride(
        rocketTailEmbersInput.speed,
        engine.rocketTailEmbers.speed,
        envelopeTimeScale,
    );
    const tailEmberSize = resolveScaledOverride(
        rocketTailEmbersInput.size,
        engine.rocketTailEmbers.size,
        sizeScale,
    );
    const hasExplicitTarget = Number.isFinite(explicitTarget?.x) && Number.isFinite(explicitTarget?.y);
    const hasExplicitStart = Number.isFinite(explicitTarget?.startX) && Number.isFinite(explicitTarget?.startY);
    const targetX = hasExplicitTarget
        ? (hasExplicitStart ? explicitTarget.x : clamp(explicitTarget.x, 0, engine.width))
        : randomRange(engine.width * ROCKET_TARGET_TUNING.targetXMinRatio, engine.width * ROCKET_TARGET_TUNING.targetXMaxRatio) + randomRange(-ROCKET_TARGET_TUNING.targetXJitter, ROCKET_TARGET_TUNING.targetXJitter);
    const targetY = hasExplicitTarget
        ? (hasExplicitStart ? explicitTarget.y : clamp(explicitTarget.y, 0, engine.height))
        : randomRange(engine.height * ROCKET_TARGET_TUNING.targetYMinRatio, engine.height * ROCKET_TARGET_TUNING.targetYMaxRatio);
    const startX = hasExplicitStart
        ? explicitTarget.startX
        : hasExplicitTarget
            ? clamp(targetX + randomRange(-ROCKET_TARGET_TUNING.explicitStartJitterX, ROCKET_TARGET_TUNING.explicitStartJitterX), 0, engine.width)
            : randomRange(engine.width * 0.25, engine.width * 0.75);
    const startY = hasExplicitStart
        ? explicitTarget.startY
        : hasExplicitTarget
            ? engine.height + ROCKET_TARGET_TUNING.explicitStartOffsetY
            : engine.height + randomRange(ROCKET_TARGET_TUNING.fallbackStartOffsetYMin, ROCKET_TARGET_TUNING.fallbackStartOffsetYMax);
    const dx = targetX - startX;
    const dy = targetY - startY;
    const durationMin = resolveScaledOverride(
        rocketInput.durationMin,
        ROCKET_DURATION_LIMITS.defaultMin,
        envelopeTimeScale,
    );
    const durationMax = resolveScaledOverride(
        rocketInput.durationMax,
        ROCKET_DURATION_LIMITS.defaultMax,
        envelopeTimeScale,
    );
    const fallbackDuration = hasExplicitTarget
        ? ((durationMin + durationMax) / 2)
        : randomRange(durationMin, durationMax);
    const distance = Math.hypot(dx, dy);
    const rocketSpeed = rocketInput.speed ?? engine.rocket.speed;
    const duration = resolveRocketDuration(distance, fallbackDuration, rocketSpeed);
    const totalDx = dx;
    const totalDy = dy;
    const totalDistanceSq = (totalDx * totalDx) + (totalDy * totalDy);
    const normalizedDistance = distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon ? distance : 1;
    const directionX = distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon ? dx / normalizedDistance : 0;
    const directionY = distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon ? dy / normalizedDistance : -1;
    const launchColor = resolveBurstBaseColor(
        engine,
        rocketPalette ?? burstFormsInput.palette ?? engine.burstForms.palette,
        rocketColorMode,
        rocketSingleColor,
    );
    const travelSpeed = distance > ROCKET_FLIGHT_GUARDS.minDistanceEpsilon
        ? distance / duration
        : 0;
    const rotationAngle = Math.atan2(directionY, directionX);
    const sparkLength = resolveScaledOverride(
        rocketInput.streakLength,
        engine.rocket.streakLength,
        sizeScale,
    );
    const sparkFinalLength = resolveScaledOverride(
        rocketInput.finalStreakLength,
        engine.rocket.finalStreakLength,
        sizeScale,
    );
    const rocketThickness = resolveScaledOverride(
        rocketInput.thickness,
        engine.rocket.thickness,
        sizeScale,
    );
    const burstCurrentConfig = {
        sizeScale: engine.sizeScale,
        burstForms: engine.burstForms,
        burstSparks: engine.burstSparks,
        burstCenterFlash: engine.burstCenterFlash,
        burstTwinkleCloud: engine.burstTwinkleCloud,
    };
    const baseBurstBuildInput = {
        burstForms: normalizedOptions.burstForms,
        burstSparks: normalizedOptions.burstSparks,
        burstCenterFlash: normalizedOptions.burstCenterFlash,
        burstTwinkleCloud: normalizedOptions.burstTwinkleCloud,
        sizeScale,
    };
    const burstOptions = buildBurstOptions(baseBurstBuildInput, burstCurrentConfig);
    if (!rocketEnabled) {
        launchBurst(engine, targetX, targetY, burstOptions);
        return null;
    }

    const cascadeBurst = cascadeBurstOverrides
        ? buildBurstOptions(
            {
                ...baseBurstBuildInput,
                burstForms: {
                    ...baseBurstBuildInput.burstForms,
                    ...cascadeBurstOverrides.burstForms,
                },
                burstSparks: {
                    ...baseBurstBuildInput.burstSparks,
                    ...cascadeBurstOverrides.burstSparks,
                },
                burstCenterFlash: {
                    ...baseBurstBuildInput.burstCenterFlash,
                    ...cascadeBurstOverrides.burstCenterFlash,
                },
                burstTwinkleCloud: {
                    ...baseBurstBuildInput.burstTwinkleCloud,
                    ...cascadeBurstOverrides.burstTwinkleCloud,
                },
            },
            burstCurrentConfig,
        )
        : null;
    const cascadeBurstCount = resolveCascadeCount(rocketCascadeInput.bursts, sizeScale);
    const cascadeChildBurstCount = resolveCascadeCount(rocketCascadeInput.childBursts ?? rocketCascadeInput.bursts, sizeScale);
    const burstCascadeDelayMs = resolveScaledOverride(
        rocketCascadeInput.delay,
        ROCKET_CASCADE_LIMITS.defaultDelayMs,
        envelopeTimeScale,
    );
    const cascadeChildDurationMin = resolveScaledOverride(
        rocketCascadeInput.childDurationMin,
        0,
        envelopeTimeScale,
    );
    const cascadeChildDurationMax = resolveScaledOverride(
        rocketCascadeInput.childDurationMax,
        cascadeChildDurationMin,
        envelopeTimeScale,
    );
    const boundedCascadeChildDurationMax = Math.max(
        cascadeChildDurationMin,
        cascadeChildDurationMax,
    );
    const burstCascadeSpreadX = resolveScaledOverride(
        rocketCascadeInput.spreadX,
        ROCKET_CASCADE_LIMITS.defaultSpread,
        sizeScale,
    );
    const burstCascadeSpreadY = resolveScaledOverride(
        rocketCascadeInput.spreadY,
        ROCKET_CASCADE_LIMITS.defaultSpread,
        sizeScale,
    );
    const cascade = {
        mode: rocketCascadeMode,
        bursts: cascadeBurstCount,
        childBursts: cascadeChildBurstCount,
        childSpeedMin: rocketCascadeChildSpeedRange?.min ?? null,
        childSpeedMax: rocketCascadeChildSpeedRange?.max ?? null,
        childDurationMin: cascadeChildDurationMin > 0 ? cascadeChildDurationMin : null,
        childDurationMax: boundedCascadeChildDurationMax > 0 ? boundedCascadeChildDurationMax : null,
        childDirectionDeg: rocketCascadeChildDirectionDeg,
        childConeDeg: rocketCascadeChildConeDeg,
        delay: burstCascadeDelayMs,
        spreadX: burstCascadeSpreadX,
        spreadY: burstCascadeSpreadY,
        burst: cascadeBurst ?? burstOptions,
        child: rocketCascadeChild,
    };
    const rocket = {
        x: startX,
        y: startY,
        prevX: startX,
        prevY: startY,
        startX,
        startY,
        targetX,
        targetY,
        totalDx,
        totalDy,
        totalDistanceSq,
        hasExplicitTarget,
        hasExplicitStart,
        vx: dx / duration,
        vy: dy / duration,
        travelSpeed,
        life: duration,
        maxLife: duration,
        color: launchColor,
        directionX,
        directionY,
        rotationAngle,
        sparkLength,
        sparkFinalLength,
        thickness: rocketThickness,
        trailTimer: 0,
        tailEmberAccumulator: 0,
        tailEmbers: {
            enabled: !!tailEmbersEnabled,
            count: tailEmberCount,
            brightness: tailEmberBrightness,
            fade: tailEmberFade,
            spreadX: tailEmberSpreadX,
            spreadY: tailEmberSpreadY,
            speed: tailEmberSpeed,
            size: tailEmberSize,
        },
        burst: burstOptions,
        cascade,
        simple: !!normalizedOptions.simple,
    };

    const work = options[BURST_WORK]
        ?? (options[BURST_SEQUENCE] ? reserveVictoryWork(options[BURST_SEQUENCE], rocket) : null);
    if (work) {
        rocket.sequenceWork = work;
        rocket.burst = { ...rocket.burst, [BURST_WORK]: work };
    }
    engine.rockets.push(rocket);
    return rocket;
}

export function launchRocket(engine, options = {}) {
    const generation = engine.runGeneration;
    const count = options.count ?? 1;

    for (let index = 0; index < count; index += 1) {
        createRocket(engine, options);
        if (engine.runGeneration !== generation) return;
    }
}

export function launchRocketAt(engine, targetX, targetY, options = {}) {
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        return false;
    }

    return launchRocketWithExplicitTarget(engine, options, {
        x: targetX,
        y: targetY,
    });
}

export function launchRocketFromTo(engine, startX, startY, targetX, targetY, options = {}) {
    if (
        !Number.isFinite(startX)
        || !Number.isFinite(startY)
        || !Number.isFinite(targetX)
        || !Number.isFinite(targetY)
    ) {
        return false;
    }

    return launchRocketWithExplicitTarget(engine, options, {
        startX,
        startY,
        x: targetX,
        y: targetY,
    });
}

export function scheduleCascadeBursts(engine, rocket) {
    const generation = engine.runGeneration;
    const cascade = rocket.cascade ?? {};
    const cascadeMode = resolveRocketCascadeMode(cascade.mode);
    const cascadeBurstCount = cascade.bursts ?? 0;
    if (cascadeBurstCount <= 0) {
        return;
    }

    const burstOptions = cascade.burst ?? rocket.burst;
    const spreadX = cascade.spreadX ?? ROCKET_CASCADE_LIMITS.defaultSpread;
    const spreadY = cascade.spreadY ?? ROCKET_CASCADE_LIMITS.defaultSpread;
    const delay = cascade.delay ?? ROCKET_CASCADE_LIMITS.defaultDelayMs;
    const originX = rocket.x;
    const originY = rocket.y;
    const cascadeChildOptions = isPlainRecord(cascade.child)
        ? cascade.child
        : resolveDefaultCascadeChildLaunchOptions(rocket, cascade);

    if (cascadeMode === ROCKET_CASCADE_MODES.rocket) {
        for (let index = 0; index < cascadeBurstCount; index += 1) {
            const { x, y } = resolveCascadeTargetPoint(
                engine,
                originX,
                originY,
                spreadX,
                spreadY,
                cascade,
            );
            const distance = Math.hypot(x - originX, y - originY);
            const childLaunchOptions = resolveCascadeChildLaunchOptions(
                cascadeChildOptions,
                cascade,
                distance,
            );
            launchRocketFromTo(engine, originX, originY, x, y, {
                ...childLaunchOptions,
                ...(rocket.sequenceWork ? { [BURST_WORK]: rocket.sequenceWork.children[index] } : {}),
            });
            if (engine.runGeneration !== generation) return;
        }
        return;
    }

    for (let index = 0; index < cascadeBurstCount; index += 1) {
        scheduleTimeout(engine, () => {
            if (!engine.running) {
                return;
            }

            const { x, y } = resolveCascadeRandomTargetPoint(
                engine,
                originX,
                originY,
                spreadX,
                spreadY,
            );

            launchBurst(engine, x, y, rocket.sequenceWork
                ? { ...burstOptions, [BURST_WORK]: rocket.sequenceWork.children[index] }
                : burstOptions);
        }, resolveScaledDelay(engine, delay * (index + 1)));
    }
}

export function spawnRocketTailEmbers(engine, rocket, spawnCount = null) {
    const tailEmbers = rocket.tailEmbers;
    if (!tailEmbers?.enabled) {
        return;
    }

    const directionX = rocket.directionX;
    const directionY = rocket.directionY;
    const lateralX = -directionY;
    const lateralY = directionX;
    const baseSpeed = Math.max(ROCKET_TAIL_EMBER_TUNING.speedMin, tailEmbers.speed ?? engine.rocketTailEmbers.speed);
    const tailEmberBrightness = tailEmbers.brightness ?? engine.rocketTailEmbers.brightness;
    const tailEmberBrightnessScale = clamp(tailEmberBrightness / WHITE_BRIGHTNESS_REFERENCE, 0, 1);
    const emberFade = Math.max(ROCKET_TAIL_EMBER_TUNING.fadeMin, tailEmbers.fade ?? engine.rocketTailEmbers.fade);
    const emberCount = Math.max(ROCKET_TAIL_EMBER_TUNING.countMin, Math.floor(tailEmbers.count ?? engine.rocketTailEmbers.count));
    const emberSpreadX = Math.max(ROCKET_TAIL_EMBER_TUNING.spreadMin, tailEmbers.spreadX ?? engine.rocketTailEmbers.spreadX);
    const emberSpreadY = Math.max(ROCKET_TAIL_EMBER_TUNING.spreadMin, tailEmbers.spreadY ?? engine.rocketTailEmbers.spreadY);
    const emberSize = Math.max(ROCKET_TAIL_EMBER_TUNING.sizeMin, tailEmbers.size ?? engine.rocketTailEmbers.size);
    const emberLifeBase = ROCKET_TAIL_EMBER_TUNING.lifeBaseDivisor / emberFade;
    const previousX = rocket.prevX;
    const previousY = rocket.prevY;
    const travelX = rocket.x - previousX;
    const travelY = rocket.y - previousY;
    const travelDistance = Math.hypot(travelX, travelY);
    const trailBlend = clamp(travelDistance / ROCKET_TAIL_EMBER_TUNING.trailBlendDistance, ROCKET_TAIL_EMBER_TUNING.trailBlendMin, 1);
    const requestedCount = spawnCount == null
        ? Math.max(ROCKET_TAIL_EMBER_TUNING.requestedCountMin, Math.min(emberCount, Math.ceil(travelDistance * (ROCKET_TAIL_EMBER_TUNING.requestedCountFactorBase + (emberCount * ROCKET_TAIL_EMBER_TUNING.requestedCountFactorPerEmber)))))
        : Math.floor(spawnCount);
    const emberSpawnCount = Math.max(ROCKET_TAIL_EMBER_TUNING.requestedCountMin, requestedCount);
    const emberCloudLength = Math.max(
        ROCKET_TAIL_EMBER_TUNING.cloudLengthMin,
        (emberSpreadY * ROCKET_TAIL_EMBER_TUNING.cloudLengthSpreadYFactor) + (emberSpreadX * ROCKET_TAIL_EMBER_TUNING.cloudLengthSpreadXFactor) + (baseSpeed * ROCKET_TAIL_EMBER_TUNING.cloudLengthSpeedFactor) + (emberSize * ROCKET_TAIL_EMBER_TUNING.cloudLengthSizeFactor),
    );
    const emberCloudWidth = Math.max(
        ROCKET_TAIL_EMBER_TUNING.cloudWidthMin,
        (emberSpreadX * ROCKET_TAIL_EMBER_TUNING.cloudWidthSpreadXFactor) + (emberSize * ROCKET_TAIL_EMBER_TUNING.cloudWidthSizeFactor),
    );

    for (let index = 0; index < emberSpawnCount; index += 1) {
        const progress = randomRange(ROCKET_TAIL_EMBER_TUNING.progressMin, ROCKET_TAIL_EMBER_TUNING.progressMax);
        const pathX = previousX + (travelX * progress);
        const pathY = previousY + (travelY * progress);
        const cloudDepth = Math.pow(randomRange(ROCKET_TAIL_EMBER_TUNING.depthPowMin, ROCKET_TAIL_EMBER_TUNING.depthPowMax), ROCKET_TAIL_EMBER_TUNING.depthPowExponent) * emberCloudLength;
        const cloudLateral = randomRange(-emberCloudWidth, emberCloudWidth);
        const cloudJitter = randomRange(-emberCloudWidth * ROCKET_TAIL_EMBER_TUNING.cloudJitterFactor, emberCloudWidth * ROCKET_TAIL_EMBER_TUNING.cloudJitterFactor);
        const cloudOffset = randomRange(-emberCloudWidth * ROCKET_TAIL_EMBER_TUNING.cloudOffsetFactor, emberCloudWidth * ROCKET_TAIL_EMBER_TUNING.cloudOffsetFactor) * (ROCKET_TAIL_EMBER_TUNING.cloudOffsetBase + (ROCKET_TAIL_EMBER_TUNING.cloudOffsetTrailBlendFactor * trailBlend));
        const trailPush = Math.max(ROCKET_TAIL_EMBER_TUNING.trailPushMin, cloudDepth + cloudJitter);
        const lateralOffset = cloudLateral + cloudOffset;
        const jitterX = randomRange(-ROCKET_TAIL_EMBER_TUNING.positionJitterFactor, ROCKET_TAIL_EMBER_TUNING.positionJitterFactor) * emberSize;
        const jitterY = randomRange(-ROCKET_TAIL_EMBER_TUNING.positionJitterFactor, ROCKET_TAIL_EMBER_TUNING.positionJitterFactor) * emberSize;
        const life = clamp(emberLifeBase * randomRange(ROCKET_TAIL_EMBER_TUNING.lifeRandomMin, ROCKET_TAIL_EMBER_TUNING.lifeRandomMax), ROCKET_TAIL_EMBER_TUNING.lifeMin, ROCKET_TAIL_EMBER_TUNING.lifeMax);
        const spawnSpeed = randomRange(ROCKET_TAIL_EMBER_TUNING.speedRandomMin, ROCKET_TAIL_EMBER_TUNING.speedRandomMax) * baseSpeed;
        const distanceScale = ROCKET_TAIL_EMBER_TUNING.distanceScaleBase + (trailBlend * ROCKET_TAIL_EMBER_TUNING.distanceScaleTrailBlendFactor);

        const particle = engine.emberPool.length > 0 ? engine.emberPool.pop() : {};

        particle.type = 'rocketEmber';
        particle.x = pathX - (directionX * trailPush) + (lateralX * lateralOffset) + jitterX;
        particle.y = pathY - (directionY * trailPush) + (lateralY * lateralOffset) + jitterY;
        particle.vx = (-directionX * spawnSpeed * distanceScale) + (lateralX * lateralOffset * ROCKET_TAIL_EMBER_TUNING.lateralVelocityFactor);
        particle.vy = (-directionY * spawnSpeed * distanceScale) + (lateralY * lateralOffset * ROCKET_TAIL_EMBER_TUNING.lateralVelocityFactor);
        particle.gravity = ROCKET_TAIL_EMBER_TUNING.gravityBase + (baseSpeed * ROCKET_TAIL_EMBER_TUNING.gravitySpeedFactor);
        particle.life = life;
        particle.maxLife = life;
        particle.radius = emberSize * randomRange(ROCKET_TAIL_EMBER_TUNING.radiusRandomMin, ROCKET_TAIL_EMBER_TUNING.radiusRandomMax);
        particle.brightness = tailEmberBrightness;
        particle.brightnessScale = tailEmberBrightnessScale;
        particle.drag = ROCKET_TAIL_EMBER_TUNING.drag;
        particle.simple = rocket.simple;

        engine.particles.push(particle);
    }
}
