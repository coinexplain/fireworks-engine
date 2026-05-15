import {
    scheduleCascadeBursts,
    spawnRocketTailEmbers,
} from './rocketLaunch.js';
import { launchBurst } from './burstSpawn.js';

const MIN_DISTANCE_SQUARED_EPSILON = 0.0001;

const TAIL_EMBER_ACCUMULATION = {
    timeDensityFactor: 8,
    travelDensityFactor: 0.04,
    maxSpawnBudget: 6,
};

const FORM_SPIN_UPDATE_TUNING = {
    velocitySpinScale: 0.004,
    maxVelocityFactor: 1.6,
    rateWaveFactorMin: 0.2,
    rateWaveFactorMax: 1.8,
    activeHoldMinFallback: 0.75,
    activeHoldMaxFallback: 3.4,
    inactiveHoldMinFallback: 0.55,
    inactiveHoldMaxFallback: 3.8,
    blendResponse: 5.5,
};

const FORM_WOBBLE_UPDATE_TUNING = {
    velocityWobbleScale: 0.0035,
    maxVelocityFactor: 1.8,
    targetHoldMin: 0.14,
    targetHoldMax: 0.48,
    targetResponse: 3.2,
    calmChance: 0.35,
    sameDirectionBias: 0.48,
    targetContinuity: 0.4,
    maxVelocityDeltaPerSecond: 88,
};

const FORM_VERTICAL_MOTION_TUNING = {
    // Keep prior confetti look while making vertical damping consistent
    // across all form particles (instead of random per-particle drag).
    perFrameDrag: 0.9735,
};

const PARTICLE_PHYSICS_TUNING = {
    dragReferenceDtSeconds: 1 / 60,
    offscreenBottomMargin: 120,
};

function hasRocketReachedTarget(rocket) {
    const totalDx = rocket.totalDx ?? (rocket.targetX - rocket.startX);
    const totalDy = rocket.totalDy ?? (rocket.targetY - rocket.startY);
    const totalDistanceSq = rocket.totalDistanceSq ?? ((totalDx * totalDx) + (totalDy * totalDy));

    if (totalDistanceSq <= MIN_DISTANCE_SQUARED_EPSILON) {
        return true;
    }

    const travelDx = rocket.x - rocket.startX;
    const travelDy = rocket.y - rocket.startY;
    const traveledProjection = (travelDx * totalDx) + (travelDy * totalDy);

    return traveledProjection >= totalDistanceSq;
}

function releaseParticle(engine, particle) {
    if (particle.type === 'form') {
        engine.formPool.push(particle);
    } else if (particle.type === 'burstSpark') {
        engine.sparkPool.push(particle);
    } else {
        engine.emberPool.push(particle);
    }
}

function isParticleBelowCanvas(engine, particle) {
    const radius = Number.isFinite(particle.radius) ? particle.radius : 0;
    const sparkLength = Number.isFinite(particle.sparkLength) ? particle.sparkLength : 0;
    const margin = Math.max(
        PARTICLE_PHYSICS_TUNING.offscreenBottomMargin,
        radius * 8,
        sparkLength * 2,
    );

    return particle.vy >= 0 && particle.y - margin > engine.height;
}

function randomBetween(min, max) {
    return min + (Math.random() * (max - min));
}

export function updateRockets(engine, dt) {
    const rockets = engine.rockets;
    let writeIndex = 0;

    for (let index = 0; index < rockets.length; index += 1) {
        const rocket = rockets[index];
        const previousX = rocket.x;
        const previousY = rocket.y;

        rocket.life -= dt;
        rocket.x += rocket.vx * dt;
        rocket.y += rocket.vy * dt;
        rocket.trailTimer += dt;
        rocket.prevX = previousX;
        rocket.prevY = previousY;

        if (rocket.tailEmbers?.enabled) {
            const travelDistance = rocket.travelSpeed * dt;
            const tailEmberDensity = Math.max(1, rocket.tailEmbers.count ?? engine.rocketTailEmbers.count);
            rocket.tailEmberAccumulator += (dt * tailEmberDensity * TAIL_EMBER_ACCUMULATION.timeDensityFactor)
                + (travelDistance * tailEmberDensity * TAIL_EMBER_ACCUMULATION.travelDensityFactor);
            const emberBudget = Math.min(TAIL_EMBER_ACCUMULATION.maxSpawnBudget, Math.floor(rocket.tailEmberAccumulator));

            if (emberBudget > 0) {
                rocket.tailEmberAccumulator -= emberBudget;
                spawnRocketTailEmbers(engine, rocket, emberBudget);
            }
        }

        if (rocket.life <= 0 || hasRocketReachedTarget(rocket)) {
            const burstX = rocket.hasExplicitTarget ? rocket.targetX : rocket.x;
            const burstY = rocket.hasExplicitTarget ? rocket.targetY : rocket.y;
            rocket.x = burstX;
            rocket.y = burstY;
            launchBurst(engine, burstX, burstY, rocket.burst);
            scheduleCascadeBursts(engine, rocket);
            continue;
        }

        if (writeIndex !== index) {
            rockets[writeIndex] = rocket;
        }
        writeIndex += 1;
    }

    rockets.length = writeIndex;
}

export function updateParticles(engine, dt) {
    const particles = engine.particles;
    let writeIndex = 0;
    const dragExponent = dt / PARTICLE_PHYSICS_TUNING.dragReferenceDtSeconds;
    const formVerticalDragFactor = Math.pow(FORM_VERTICAL_MOTION_TUNING.perFrameDrag, dragExponent);

    for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        particle.life -= dt;
        if (particle.life <= 0) {
            releaseParticle(engine, particle);
            continue;
        }

        const dragFactor = Math.pow(particle.drag, dragExponent);
        particle.vx *= dragFactor;
        if (particle.type === 'form') {
            particle.vy *= formVerticalDragFactor;
        } else {
            particle.vy *= dragFactor;
        }
        particle.vy += particle.gravity * dt;
        let wobbleVelocity = 0;
        if (particle.type === 'form' && particle.formWobble > 0) {
            const wobbleVelocityFactor = Math.min(
                FORM_WOBBLE_UPDATE_TUNING.maxVelocityFactor,
                1 + (Math.abs(particle.vy) * FORM_WOBBLE_UPDATE_TUNING.velocityWobbleScale),
            );
            const timerRate = 0.6 + (0.4 * wobbleVelocityFactor);
            particle.formWobbleTargetTimer -= dt * timerRate;
            if (particle.formWobbleTargetTimer <= 0) {
                particle.formWobbleTargetTimer = FORM_WOBBLE_UPDATE_TUNING.targetHoldMin
                    + (Math.random()
                        * (FORM_WOBBLE_UPDATE_TUNING.targetHoldMax - FORM_WOBBLE_UPDATE_TUNING.targetHoldMin));
                const maxLateralSpeed = particle.formWobbleLateralSpeed;
                const hasCalmWindow = Math.random() < FORM_WOBBLE_UPDATE_TUNING.calmChance;
                let nextTarget = hasCalmWindow
                    ? 0
                    : ((Math.random() * 2) - 1) * maxLateralSpeed;
                if (Math.random() < FORM_WOBBLE_UPDATE_TUNING.sameDirectionBias && particle.formWobbleTarget !== 0) {
                    nextTarget = Math.sign(particle.formWobbleTarget) * Math.abs(nextTarget);
                }
                nextTarget = (particle.formWobbleTarget * FORM_WOBBLE_UPDATE_TUNING.targetContinuity)
                    + (nextTarget * (1 - FORM_WOBBLE_UPDATE_TUNING.targetContinuity));
                particle.formWobbleTarget = nextTarget;
            }
            const response = Math.min(1, FORM_WOBBLE_UPDATE_TUNING.targetResponse * dt * wobbleVelocityFactor);
            const targetVelocity = particle.formWobbleVelocity
                + ((particle.formWobbleTarget - particle.formWobbleVelocity) * response);
            const maxDelta = FORM_WOBBLE_UPDATE_TUNING.maxVelocityDeltaPerSecond * dt;
            const velocityDelta = targetVelocity - particle.formWobbleVelocity;
            if (velocityDelta > maxDelta) {
                particle.formWobbleVelocity += maxDelta;
            } else if (velocityDelta < -maxDelta) {
                particle.formWobbleVelocity -= maxDelta;
            } else {
                particle.formWobbleVelocity = targetVelocity;
            }
            wobbleVelocity = particle.formWobbleVelocity * wobbleVelocityFactor;
        }
        particle.x += (particle.vx + wobbleVelocity) * dt;
        particle.y += particle.vy * dt;
        if (particle.type === 'form' && particle.formSpin > 0) {
            if (particle.formSpinBudget <= 0) {
                particle.formSpinActive = false;
            } else {
                particle.formSpinToggleTimer -= dt;
                if (particle.formSpinToggleTimer <= 0) {
                    particle.formSpinActive = !particle.formSpinActive;
                    particle.formSpinToggleTimer = particle.formSpinActive
                        ? randomBetween(
                            particle.formSpinActiveHoldMin ?? FORM_SPIN_UPDATE_TUNING.activeHoldMinFallback,
                            particle.formSpinActiveHoldMax ?? FORM_SPIN_UPDATE_TUNING.activeHoldMaxFallback,
                        )
                        : randomBetween(
                            particle.formSpinInactiveHoldMin ?? FORM_SPIN_UPDATE_TUNING.inactiveHoldMinFallback,
                            particle.formSpinInactiveHoldMax ?? FORM_SPIN_UPDATE_TUNING.inactiveHoldMaxFallback,
                        );
                }
            }

            const spinIsActive = particle.formSpinActive && particle.formSpinBudget > 0;
            const blendTarget = spinIsActive ? 1 : 0;
            const blendResponse = Math.min(1, FORM_SPIN_UPDATE_TUNING.blendResponse * dt);
            particle.formSpinBlend += (blendTarget - particle.formSpinBlend) * blendResponse;

            if (spinIsActive) {
                particle.formSpinBudget = Math.max(0, particle.formSpinBudget - dt);
                const velocityFactor = Math.min(
                    FORM_SPIN_UPDATE_TUNING.maxVelocityFactor,
                    1 + (Math.abs(particle.vy) * FORM_SPIN_UPDATE_TUNING.velocitySpinScale),
                );
                particle.formSpinRateWavePhase += particle.formSpinRateWaveSpeed * dt;
                const rawRateWaveFactor = 1
                    + (Math.sin(particle.formSpinRateWavePhase) * particle.formSpinRateWaveAmplitude);
                const rateWaveFactor = Math.min(
                    FORM_SPIN_UPDATE_TUNING.rateWaveFactorMax,
                    Math.max(FORM_SPIN_UPDATE_TUNING.rateWaveFactorMin, rawRateWaveFactor),
                );
                const spinStep = velocityFactor * rateWaveFactor * dt;
                particle.formSpinPhase += particle.formSpinPhaseSpeed * spinStep;
                particle.formSpinAngle += particle.formSpinAngleSpeed * spinStep;
                const flipWave = Math.abs(Math.sin(particle.formSpinPhase));
                const shapedFlipWave = Math.pow(flipWave, particle.formSpinFlipExponent ?? 1);
                particle.formWidthScale = particle.formSpinMinWidthScale
                    + ((1 - particle.formSpinMinWidthScale) * shapedFlipWave);
            } else if (particle.formSpinBlend <= 0.001) {
                particle.formSpinBlend = 0;
                particle.formWidthScale = 1;
            }
        }

        if (isParticleBelowCanvas(engine, particle)) {
            releaseParticle(engine, particle);
            continue;
        }

        if (writeIndex !== index) {
            particles[writeIndex] = particle;
        }
        writeIndex += 1;
    }

    particles.length = writeIndex;
}

export function updateFlashes(engine, dt) {
    const flashes = engine.flashes;
    let writeIndex = 0;

    for (let index = 0; index < flashes.length; index += 1) {
        const flash = flashes[index];

        flash.age += dt;
        if (flash.age >= flash.maxLife) {
            continue;
        }

        if (writeIndex !== index) {
            flashes[writeIndex] = flash;
        }
        writeIndex += 1;
    }

    flashes.length = writeIndex;
}

export function updateTwinkleClouds(engine, dt) {
    const twinkleClouds = engine.twinkleClouds;
    let writeIndex = 0;

    for (let index = 0; index < twinkleClouds.length; index += 1) {
        const cloud = twinkleClouds[index];

        cloud.age += dt;
        if (cloud.age >= cloud.maxLife) {
            continue;
        }

        if (writeIndex !== index) {
            twinkleClouds[writeIndex] = cloud;
        }
        writeIndex += 1;
    }

    twinkleClouds.length = writeIndex;
}
