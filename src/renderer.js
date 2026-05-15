import { clamp } from './mathResolvers.js';
import {
    GLYPH_SPRITE_SIZE_MIN,
    GLYPH_SPRITE_RADIUS_SCALE,
    DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS,
    DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS,
    WHITE_BRIGHTNESS_REFERENCE,
} from './defaults.js';
import {
    boostHexColor,
    mixHexColor,
    toAlphaColor,
} from './colorUtils.js';
import {
    updateRockets,
    updateParticles,
    updateFlashes,
    updateTwinkleClouds,
} from './update.js';
import {
    drainBurstQueue,
    resolveBurstFlashAttackDuration,
} from './burstSpawn.js';
import {
    getNow,
    getDocument,
    getRequestAnimationFrame,
} from './runtimeLifecycle.js';

const ROCKET_RENDER_TUNING = {
    minSparkLength: 8,
    minLineWidth: 0.6,
};

const BURST_SPARK_RENDER_TUNING = {
    headLengthRatio: 0.18,
    spindleFirstSegmentRatio: 0.32,
    spindleSecondSegmentRatio: 0.68,
    spindleEdgeWidthMin: 0.55,
    spindleEdgeWidthScale: 0.72,
    spindleMiddleWidthMin: 0.8,
    spindleMiddleWidthScale: 1.18,
    spindleEdgeAlpha: 0.82,
    spindleTipAlpha: 0.9,
    fadeWidthScale: 0.82,
    fadeFallbackAlpha: 0.92,
    minDirectionVelocityEpsilon: 0.0001,
    speedFactorMax: 1.1,
    minLength: 2.5,
    minWidth: 0.6,
    spawnTailRevealDuration: 0.09,
};

const PARTICLE_RENDER_LIMITS = {
    fastRectMinSize: 1,
    emberMinRadius: 0.05,
    emberMinSize: 0.25,
    flashMinFade: 0.001,
    flashMinConfigSize: 0.1,
    flashMinRenderSize: 0.35,
    flashPeakAlphaMin: 0,
    flashPeakAlphaMax: 3,
    flashInnerStopMin: 0.05,
    flashInnerStopMax: 1,
    twinkleMinLife: 0.001,
    twinkleMinSize: 0.1,
    maxFrameDtSeconds: 0.033,
    maxScaledFrameDtMultiplier: 6,
};

const WHITE_COLOR = '#ffffff';
// White sparkles saturate quickly, so brightness is used as a soft alpha boost.
const FORM_SPIN_RENDER_TUNING = {
    minWidthScale: 0.02,
    highlightMinWidth: 0.01,
    highlightMaxWidth: 1,
    highlightWidthToRadians: Math.PI,
    degToRad: Math.PI / 180,
    brightnessBoostScale: 2.8,
    saturationBoostScale: 1.7,
    whiteMixScale: 0.12,
};

const FORM_SHAPE_RENDER_TUNING = {
    rectangleAspectRatio: 6,
    rectangleScale: 0.45,
};

const SPRITE_CACHE_TUNING = {
    fadeWidth: 64,
    fadeHeight: 16,
    flashSize: 128,
    glyphPadding: 4,
};

function resolveFirstGlyph(glyph, fallback = '★') {
    if (typeof glyph !== 'string') {
        return fallback;
    }

    const trimmed = glyph.trim();
    if (!trimmed) {
        return fallback;
    }

    return Array.from(trimmed)[0] ?? fallback;
}

let cachedFillStyle = null;
let cachedStrokeStyle = null;
let cachedGlobalAlpha = null;

function resetContextStateCache() {
    cachedFillStyle = null;
    cachedStrokeStyle = null;
    cachedGlobalAlpha = null;
}

function invalidateContextStateCache() {
    resetContextStateCache();
}

function setContextFillStyle(ctx, fillStyle) {
    if (cachedFillStyle === fillStyle) {
        return;
    }

    ctx.fillStyle = fillStyle;
    cachedFillStyle = fillStyle;
}

function setContextStrokeStyle(ctx, strokeStyle) {
    if (cachedStrokeStyle === strokeStyle) {
        return;
    }

    ctx.strokeStyle = strokeStyle;
    cachedStrokeStyle = strokeStyle;
}

function setContextGlobalAlpha(ctx, alpha) {
    if (cachedGlobalAlpha === alpha) {
        return;
    }

    ctx.globalAlpha = alpha;
    cachedGlobalAlpha = alpha;
}

function setBaseCanvasTransform(ctx, engine) {
    if (typeof ctx.setTransform !== 'function') {
        return false;
    }

    const dpr = Number.isFinite(engine.dpr) && engine.dpr > 0 ? engine.dpr : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

function isEngineVisuallyIdle(engine) {
    return (
        engine.particles.length === 0
        && engine.rockets.length === 0
        && engine.flashes.length === 0
        && engine.twinkleClouds.length === 0
        && engine.burstQueue.length === 0
    );
}

function clearRenderCachesWhenIdle(engine) {
    if (!(engine.spriteCache instanceof Map)) {
        return;
    }

    if (!isEngineVisuallyIdle(engine)) {
        engine.renderCachesClearedForIdle = false;
        return;
    }

    if (engine.renderCachesClearedForIdle) {
        return;
    }

    engine.spriteCache.clear();
    engine.renderCachesClearedForIdle = true;
}

function getFadeSprite(engine, color) {
    const cachedSprite = engine.spriteCache.get(color);
    if (cachedSprite) {
        return cachedSprite;
    }

    const documentRef = getDocument(engine);
    const canvas = documentRef?.createElement?.('canvas');
    if (!canvas) {
        return null;
    }

    canvas.width = SPRITE_CACHE_TUNING.fadeWidth;
    canvas.height = SPRITE_CACHE_TUNING.fadeHeight;

    const ctx = canvas.getContext?.('2d', { alpha: true });
    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
        return null;
    }

    const centerY = canvas.height / 2;
    const gradient = ctx.createLinearGradient(0, centerY, canvas.width, centerY);
    gradient.addColorStop(0, toAlphaColor(color, 0));
    gradient.addColorStop(1, color);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    engine.spriteCache.set(color, canvas);
    return canvas;
}


function getBurstCenterFlashSprite(engine, color, innerStop) {
    const key = `flash:${color}:${innerStop}`;
    const cachedSprite = engine.spriteCache.get(key);
    if (cachedSprite) {
        return cachedSprite;
    }

    const documentRef = getDocument(engine);
    const canvas = documentRef?.createElement?.('canvas');
    if (!canvas) {
        return null;
    }

    canvas.width = SPRITE_CACHE_TUNING.flashSize;
    canvas.height = SPRITE_CACHE_TUNING.flashSize;

    const ctx = canvas.getContext?.('2d', { alpha: true });
    if (!ctx || typeof ctx.createRadialGradient !== 'function') {
        return null;
    }

    const center = canvas.width / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, toAlphaColor(color, 1));
    gradient.addColorStop(innerStop, toAlphaColor(color, 1));
    gradient.addColorStop(1, toAlphaColor(color, 0));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    engine.spriteCache.set(key, canvas);
    return canvas;
}

function getGlyphSprite(engine, key, glyph, color, roundedSize) {
    const cachedSprite = engine.spriteCache.get(key);
    if (cachedSprite) {
        return cachedSprite;
    }

    const documentRef = getDocument(engine);
    const canvas = documentRef?.createElement?.('canvas');
    if (!canvas) {
        return null;
    }

    const padding = SPRITE_CACHE_TUNING.glyphPadding;
    const spriteSize = Math.max(1, roundedSize + (padding * 2));
    canvas.width = spriteSize;
    canvas.height = spriteSize;

    const ctx = canvas.getContext?.('2d', { alpha: true });
    if (!ctx || typeof ctx.fillText !== 'function') {
        return null;
    }

    ctx.font = `700 ${roundedSize}px "Segoe UI Symbol", "Arial Unicode MS", "Noto Sans Symbols 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(glyph, spriteSize / 2, spriteSize / 2);

    engine.spriteCache.set(key, canvas);
    return canvas;
}

function prepareParticleRenderState(engine) {
    const hasQueuedBurstPressure = engine.burstQueue.length > 0;
    const hasParticlePressure = engine.particles.length >= engine.particlePressureThreshold;

    engine.renderPressureMode = hasQueuedBurstPressure || hasParticlePressure;
}

function drawSparkFadeRocket(engine, rocket) {
    const ctx = engine.ctx;
    const directionX = rocket.directionX;
    const directionY = rocket.directionY;
    const initialSparkLength = Math.max(ROCKET_RENDER_TUNING.minSparkLength, rocket.sparkLength);
    const finalSparkLength = Math.max(ROCKET_RENDER_TUNING.minSparkLength, rocket.sparkFinalLength);
    const maxLife = rocket.maxLife > 0 ? rocket.maxLife : 0;
    const progress = maxLife > 0 ? clamp(1 - (rocket.life / maxLife), 0, 1) : 0;
    const sparkLength = initialSparkLength + ((finalSparkLength - initialSparkLength) * progress);
    const rocketThickness = rocket.thickness;
    const tailX = rocket.x - (directionX * sparkLength);
    const tailY = rocket.y - (directionY * sparkLength);
    const baseColor = rocket.color;
    const lineWidth = Math.max(ROCKET_RENDER_TUNING.minLineWidth, rocketThickness);
    const sprite = getFadeSprite(engine, baseColor);

    if (sprite) {
        if (setBaseCanvasTransform(ctx, engine)) {
            ctx.translate(rocket.x, rocket.y);
            ctx.rotate(rocket.rotationAngle);
            setContextGlobalAlpha(ctx, 1);
            ctx.drawImage(sprite, -sparkLength, -(lineWidth / 2), sparkLength, lineWidth);

            setContextFillStyle(ctx, baseColor);
            ctx.beginPath();
            ctx.arc(0, 0, lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();

            setBaseCanvasTransform(ctx, engine);
            return;
        }

        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        ctx.rotate(rocket.rotationAngle);
        ctx.globalAlpha = 1;
        ctx.drawImage(sprite, -sparkLength, -(lineWidth / 2), sparkLength, lineWidth);

        setContextFillStyle(ctx, baseColor);
        ctx.beginPath();
        ctx.arc(0, 0, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        invalidateContextStateCache();
        return;
    }

    const gradient = ctx.createLinearGradient?.(tailX, tailY, rocket.x, rocket.y);

    ctx.lineCap = 'round';
    setContextGlobalAlpha(ctx, 1);
    ctx.lineWidth = lineWidth;

    if (gradient && typeof gradient.addColorStop === 'function') {
        gradient.addColorStop(0, toAlphaColor(baseColor, 0));
        gradient.addColorStop(1, toAlphaColor(baseColor, 1));
        setContextStrokeStyle(ctx, gradient);
    } else {
        setContextStrokeStyle(ctx, baseColor);
        setContextGlobalAlpha(ctx, 0.9);
    }

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(rocket.x, rocket.y);
    ctx.stroke();
}

function fillParticleShape(engine, particle, radiusScale = 1, x = particle.x, y = particle.y) {
    const ctx = engine.ctx;
    const radius = particle.radius * radiusScale;
    if (radius <= 0) {
        return;
    }

    if (engine.renderPressureMode && radius <= engine.fastRectRadiusThreshold) {
        const size = Math.max(PARTICLE_RENDER_LIMITS.fastRectMinSize, radius * 2);
        ctx.fillRect(x - (size / 2), y - (size / 2), size, size);
        return;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawSquareFormParticle(ctx, particle, x = particle.x, y = particle.y) {
    const radius = particle.radius;
    if (radius <= 0) {
        return;
    }

    const side = radius * 2;
    const halfSide = side / 2;
    ctx.fillRect(x - halfSide, y - halfSide, side, side);
}

function drawRectangleFormParticle(ctx, particle, x = particle.x, y = particle.y) {
    const radius = particle.radius;
    if (radius <= 0) {
        return;
    }

    const height = radius * 2 * FORM_SHAPE_RENDER_TUNING.rectangleScale;
    const width = height * FORM_SHAPE_RENDER_TUNING.rectangleAspectRatio;
    ctx.fillRect(x - (width / 2), y - (height / 2), width, height);
}

function drawBurstSparkUniformParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY) {
    const ctx = engine.ctx;
    const headLength = sparkLength * BURST_SPARK_RENDER_TUNING.headLengthRatio;
    const tailX = particle.x - (directionX * sparkLength);
    const tailY = particle.y - (directionY * sparkLength);
    const headX = particle.x + (directionX * headLength);
    const headY = particle.y + (directionY * headLength);

    setContextGlobalAlpha(ctx, alpha);
    setContextStrokeStyle(ctx, particle.color);
    ctx.lineWidth = Math.max(ROCKET_RENDER_TUNING.minLineWidth, sparkWidth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
}

function drawBurstSparkSpindleParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY) {
    const ctx = engine.ctx;
    const headLength = sparkLength * BURST_SPARK_RENDER_TUNING.headLengthRatio;
    const totalLength = sparkLength + headLength;
    const tailX = particle.x - (directionX * sparkLength);
    const tailY = particle.y - (directionY * sparkLength);
    const tipX = particle.x + (directionX * headLength);
    const tipY = particle.y + (directionY * headLength);
    const mid1X = tailX + (directionX * totalLength * BURST_SPARK_RENDER_TUNING.spindleFirstSegmentRatio);
    const mid1Y = tailY + (directionY * totalLength * BURST_SPARK_RENDER_TUNING.spindleFirstSegmentRatio);
    const mid2X = tailX + (directionX * totalLength * BURST_SPARK_RENDER_TUNING.spindleSecondSegmentRatio);
    const mid2Y = tailY + (directionY * totalLength * BURST_SPARK_RENDER_TUNING.spindleSecondSegmentRatio);
    const edgeWidth = Math.max(BURST_SPARK_RENDER_TUNING.spindleEdgeWidthMin, sparkWidth * BURST_SPARK_RENDER_TUNING.spindleEdgeWidthScale);
    const middleWidth = Math.max(BURST_SPARK_RENDER_TUNING.spindleMiddleWidthMin, sparkWidth * BURST_SPARK_RENDER_TUNING.spindleMiddleWidthScale);

    ctx.lineCap = 'round';
    setContextStrokeStyle(ctx, particle.color);

    setContextGlobalAlpha(ctx, alpha * BURST_SPARK_RENDER_TUNING.spindleEdgeAlpha);
    ctx.lineWidth = edgeWidth;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(mid1X, mid1Y);
    ctx.stroke();

    setContextGlobalAlpha(ctx, alpha);
    ctx.lineWidth = middleWidth;
    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.lineTo(mid2X, mid2Y);
    ctx.stroke();

    setContextGlobalAlpha(ctx, alpha * BURST_SPARK_RENDER_TUNING.spindleTipAlpha);
    ctx.lineWidth = edgeWidth;
    ctx.beginPath();
    ctx.moveTo(mid2X, mid2Y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
}

function drawBurstSparkFadeParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY) {
    const ctx = engine.ctx;
    const headLength = sparkLength * BURST_SPARK_RENDER_TUNING.headLengthRatio;
    const totalLength = sparkLength + headLength;
    const sprite = getFadeSprite(engine, particle.color);

    if (!sprite) {
        const tailX = particle.x - (directionX * sparkLength);
        const tailY = particle.y - (directionY * sparkLength);
        const headX = particle.x + (directionX * headLength);
        const headY = particle.y + (directionY * headLength);
        const gradient = ctx.createLinearGradient?.(tailX, tailY, headX, headY);

        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(ROCKET_RENDER_TUNING.minLineWidth, sparkWidth * BURST_SPARK_RENDER_TUNING.fadeWidthScale);

        if (gradient && typeof gradient.addColorStop === 'function') {
            gradient.addColorStop(0, toAlphaColor(particle.color, 0));
            gradient.addColorStop(1, toAlphaColor(particle.color, alpha));
            setContextStrokeStyle(ctx, gradient);
            setContextGlobalAlpha(ctx, 1);
        } else {
            setContextStrokeStyle(ctx, particle.color);
            setContextGlobalAlpha(ctx, alpha * BURST_SPARK_RENDER_TUNING.fadeFallbackAlpha);
        }

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
        return;
    }

    const renderWidth = Math.max(ROCKET_RENDER_TUNING.minLineWidth, sparkWidth * BURST_SPARK_RENDER_TUNING.fadeWidthScale);
    if (setBaseCanvasTransform(ctx, engine)) {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(Math.atan2(directionY, directionX));
        setContextGlobalAlpha(ctx, alpha * BURST_SPARK_RENDER_TUNING.fadeFallbackAlpha);
        ctx.drawImage(sprite, -sparkLength, -(renderWidth / 2), totalLength, renderWidth);
        setBaseCanvasTransform(ctx, engine);
        return;
    }

    ctx.save?.();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(Math.atan2(directionY, directionX));
    ctx.globalAlpha = alpha * BURST_SPARK_RENDER_TUNING.fadeFallbackAlpha;
    ctx.drawImage(sprite, -sparkLength, -(renderWidth / 2), totalLength, renderWidth);
    ctx.restore?.();
    invalidateContextStateCache();
}

function drawRocketEmberParticle(engine, particle) {
    const ctx = engine.ctx;
    const alpha = particle.life / particle.maxLife;
    const radius = Math.max(PARTICLE_RENDER_LIMITS.emberMinRadius, particle.radius ?? 1);
    const size = Math.max(PARTICLE_RENDER_LIMITS.emberMinSize, radius * 2);
    const brightnessScale = Number.isFinite(particle.brightnessScale)
        ? particle.brightnessScale
        : clamp(
            (Number.isFinite(particle.brightness)
                ? particle.brightness
                : DEFAULT_ROCKET_TAIL_EMBERS_BRIGHTNESS) / WHITE_BRIGHTNESS_REFERENCE,
            0,
            1,
        );

    setContextGlobalAlpha(ctx, alpha * brightnessScale);
    setContextFillStyle(ctx, WHITE_COLOR);
    ctx.fillRect(particle.x - (size / 2), particle.y - (size / 2), size, size);
}

function drawBurstSparkParticle(engine, particle) {
    const alpha = particle.life / particle.maxLife;
    const velocity = Math.hypot(particle.vx, particle.vy);
    const hasDirectionalVelocity = velocity > BURST_SPARK_RENDER_TUNING.minDirectionVelocityEpsilon;
    const safeVelocity = hasDirectionalVelocity ? velocity : 1;
    const directionX = hasDirectionalVelocity ? particle.vx / safeVelocity : 0;
    const directionY = hasDirectionalVelocity ? particle.vy / safeVelocity : -1;
    const initialSpeed = particle.initialSpeed;
    const speedRatio = clamp(safeVelocity / initialSpeed, 0, BURST_SPARK_RENDER_TUNING.speedFactorMax);
    const speedFactor = speedRatio;
    const sparkDepthFactor = clamp(particle.sparkDepthFactor ?? 1, 0, 1);
    const sparkTailScale = Math.max(0, particle.sparkTailScale ?? 1);
    const sparkAge = Math.max(0, particle.maxLife - particle.life);
    const spawnTailRevealFactor = clamp(
        sparkAge / BURST_SPARK_RENDER_TUNING.spawnTailRevealDuration,
        0,
        1,
    );
    const projectedSparkLength = particle.sparkLength * sparkTailScale * speedFactor * sparkDepthFactor;
    const minProjectedLength = BURST_SPARK_RENDER_TUNING.minLength * sparkTailScale * sparkDepthFactor * speedFactor;
    const sparkLength = Math.max(minProjectedLength, projectedSparkLength) * spawnTailRevealFactor;
    const sparkWidth = Math.max(BURST_SPARK_RENDER_TUNING.minWidth, particle.sparkThickness);

    if (sparkLength <= 0) {
        return;
    }

    if (particle.sparkShape === 'fade') {
        drawBurstSparkFadeParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY);
        return;
    }

    if (particle.sparkShape === 'spindle') {
        drawBurstSparkSpindleParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY);
        return;
    }

    drawBurstSparkUniformParticle(engine, particle, alpha, sparkLength, sparkWidth, directionX, directionY);
}

function drawBurstCenterFlash(engine, flash) {
    const ctx = engine.ctx;
    const maxLife = flash.maxLife;
    const age = clamp(flash.age, 0, maxLife);
    const attack = resolveBurstFlashAttackDuration(flash.attack);
    const fade = Math.max(PARTICLE_RENDER_LIMITS.flashMinFade, flash.fade);
    const startSize = Math.max(PARTICLE_RENDER_LIMITS.flashMinConfigSize, flash.startSize);
    const endSize = Math.max(PARTICLE_RENDER_LIMITS.flashMinConfigSize, flash.endSize);
    const peakAlpha = clamp(flash.peakAlpha, PARTICLE_RENDER_LIMITS.flashPeakAlphaMin, PARTICLE_RENDER_LIMITS.flashPeakAlphaMax);
    const innerStop = clamp(flash.innerStop, PARTICLE_RENDER_LIMITS.flashInnerStopMin, PARTICLE_RENDER_LIMITS.flashInnerStopMax);
    const progress = clamp(age / maxLife, 0, 1);
    const size = Math.max(PARTICLE_RENDER_LIMITS.flashMinRenderSize, startSize + ((endSize - startSize) * progress));
    const envelope = age <= attack
        ? (age / attack)
        : (1 - ((age - attack) / fade));
    const alpha = clamp(envelope, 0, 1) * peakAlpha;
    const sprite = getBurstCenterFlashSprite(engine, flash.color, innerStop);

    if (sprite) {
        const diameter = size * 2;
        setContextGlobalAlpha(ctx, alpha);
        ctx.drawImage(sprite, flash.x - size, flash.y - size, diameter, diameter);
        return;
    }

    const gradient = ctx.createRadialGradient?.(flash.x, flash.y, 0, flash.x, flash.y, size);

    ctx.beginPath();
    ctx.arc(flash.x, flash.y, size, 0, Math.PI * 2);

    if (gradient && typeof gradient.addColorStop === 'function') {
        gradient.addColorStop(0, toAlphaColor(flash.color, alpha));
        gradient.addColorStop(innerStop, toAlphaColor(flash.color, alpha));
        gradient.addColorStop(1, toAlphaColor(flash.color, 0));
        setContextFillStyle(ctx, gradient);
        setContextGlobalAlpha(ctx, 1);
    } else {
        setContextFillStyle(ctx, flash.color);
        setContextGlobalAlpha(ctx, alpha);
    }

    ctx.fill();
}

function drawBurstTwinkleCloud(engine, cloud) {
    const ctx = engine.ctx;
    const cloudAge = cloud.age;
    if (cloudAge < cloud.startDelay) {
        return;
    }

    const brightness = Number.isFinite(cloud.brightness)
        ? cloud.brightness
        : DEFAULT_BURST_TWINKLE_CLOUD_BRIGHTNESS;
    const brightnessScale = Number.isFinite(cloud.brightnessScale)
        ? cloud.brightnessScale
        : clamp(brightness / WHITE_BRIGHTNESS_REFERENCE, 0, 1);
    setContextFillStyle(ctx, WHITE_COLOR);

    for (let index = 0; index < cloud.twinkles.length; index += 1) {
        const twinkle = cloud.twinkles[index];
        const twinkleStart = twinkle.appearAt;
        const twinkleEnd = twinkleStart + twinkle.life;

        if (cloudAge < twinkleStart || cloudAge > twinkleEnd) {
            continue;
        }

        const life = Math.max(PARTICLE_RENDER_LIMITS.twinkleMinLife, twinkle.life);
        const progress = clamp((cloudAge - twinkleStart) / life, 0, 1);
        const alpha = clamp(Math.sin(Math.PI * progress) * twinkle.alphaScale, 0, 1);
        const size = Math.max(PARTICLE_RENDER_LIMITS.twinkleMinSize, twinkle.size);

        setContextGlobalAlpha(ctx, alpha * brightnessScale);
        ctx.fillRect(twinkle.x - (size / 2), twinkle.y - (size / 2), size, size);
    }
}

function drawFormGlyphParticle(engine, particle, drawX = particle.x, drawY = particle.y, renderColor = particle.color) {
    const ctx = engine.ctx;
    const radius = particle.radius ?? 2;
    const glyph = typeof particle.formGlyph === 'string'
        ? particle.formGlyph
        : resolveFirstGlyph(engine.burstForms.glyph);
    const glyphSize = particle.glyphSpriteSize
        ?? Math.max(GLYPH_SPRITE_SIZE_MIN, radius * GLYPH_SPRITE_RADIUS_SCALE);
    const roundedSize = Math.round(glyphSize);
    const spriteKey = `${glyph}|${renderColor}|${roundedSize}`;

    if (!particle.glyphSpriteSize) {
        particle.glyphSpriteSize = glyphSize;
    }

    const sprite = getGlyphSprite(engine, spriteKey, glyph, renderColor, roundedSize);

    if (!sprite) {
        ctx.save?.();
        ctx.font = `700 ${glyphSize}px "Segoe UI Symbol", "Arial Unicode MS", "Noto Sans Symbols 2", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = renderColor;
        ctx.fillText(glyph, drawX, drawY);
        ctx.restore?.();
        invalidateContextStateCache();
        return;
    }

    ctx.drawImage(sprite, drawX - (sprite.width / 2), drawY - (sprite.height / 2));
}

function resolveRenderableFormShape(shape) {
    if (
        shape === 'glyph'
        || shape === 'square'
        || shape === 'rectangle'
    ) {
        return shape;
    }

    return 'circle';
}

function resolveFormParticleRenderColor(particle) {
    const highlight = particle.formHighlight ?? 0;
    const width = particle.formHighlightWidth ?? 0;
    const spinBlend = particle.formSpinBlend ?? 0;
    if (highlight <= 0 || width <= 0 || spinBlend <= 0) {
        return particle.color;
    }

    const phase = particle.formSpinPhase ?? 0;
    const highlightAngle = (particle.formHighlightAngleDeg ?? 0) * FORM_SPIN_RENDER_TUNING.degToRad;
    const phaseDelta = Math.abs(Math.atan2(
        Math.sin(phase - highlightAngle),
        Math.cos(phase - highlightAngle),
    ));
    const highlightWidth = clamp(
        width,
        FORM_SPIN_RENDER_TUNING.highlightMinWidth,
        FORM_SPIN_RENDER_TUNING.highlightMaxWidth,
    ) * FORM_SPIN_RENDER_TUNING.highlightWidthToRadians;
    const highlightWave = clamp(1 - (phaseDelta / highlightWidth), 0, 1);
    const secondaryPhaseDelta = Math.abs(Math.atan2(
        Math.sin(phase - highlightAngle - Math.PI),
        Math.cos(phase - highlightAngle - Math.PI),
    ));
    const secondaryWave = clamp(1 - (secondaryPhaseDelta / highlightWidth), 0, 1) * 0.35;
    const amount = clamp(Math.max(highlightWave, secondaryWave) * highlight * spinBlend, 0, 1);

    if (amount <= 0) {
        return particle.color;
    }

    const boostedColor = boostHexColor(
        particle.color,
        amount * FORM_SPIN_RENDER_TUNING.brightnessBoostScale,
        amount * FORM_SPIN_RENDER_TUNING.saturationBoostScale,
    );
    return mixHexColor(boostedColor, WHITE_COLOR, amount * FORM_SPIN_RENDER_TUNING.whiteMixScale);
}

function drawFormShapeParticle(engine, particle, shape, drawX = particle.x, drawY = particle.y) {
    const ctx = engine.ctx;
    if (shape === 'square') {
        drawSquareFormParticle(ctx, particle, drawX, drawY);
        return;
    }

    if (shape === 'rectangle') {
        drawRectangleFormParticle(ctx, particle, drawX, drawY);
        return;
    }

    fillParticleShape(engine, particle, 1, drawX, drawY);
}

function drawFormParticle(engine, particle) {
    const ctx = engine.ctx;
    const alpha = particle.life / particle.maxLife;
    const shape = resolveRenderableFormShape(particle.formShape ?? engine.burstForms.shape);
    const spinStrength = particle.formSpin ?? 0;
    const spinBlend = particle.formSpinBlend ?? (spinStrength > 0 ? 1 : 0);
    const hasSpinTransform = spinStrength > 0;
    const renderColor = resolveFormParticleRenderColor(particle);
    setContextGlobalAlpha(ctx, alpha);
    if (hasSpinTransform) {
        const rawWidthScale = particle.formWidthScale ?? 1;
        const widthScale = Math.max(
            FORM_SPIN_RENDER_TUNING.minWidthScale,
            1 + ((rawWidthScale - 1) * spinBlend),
        );
        if (setBaseCanvasTransform(ctx, engine)) {
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.formSpinAngle ?? 0);
            ctx.scale(widthScale, 1);
            if (shape === 'glyph') {
                drawFormGlyphParticle(engine, particle, 0, 0, renderColor);
            } else {
                setContextFillStyle(ctx, renderColor);
                drawFormShapeParticle(engine, particle, shape, 0, 0);
            }
            setBaseCanvasTransform(ctx, engine);
            return;
        }

        ctx.save?.();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.formSpinAngle ?? 0);
        ctx.scale(widthScale, 1);
        if (shape === 'glyph') {
            drawFormGlyphParticle(engine, particle, 0, 0, renderColor);
        } else {
            setContextFillStyle(ctx, renderColor);
            drawFormShapeParticle(engine, particle, shape, 0, 0);
        }
        ctx.restore?.();
        invalidateContextStateCache();
        return;
    }

    if (shape === 'glyph') {
        drawFormGlyphParticle(engine, particle, particle.x, particle.y, renderColor);
        return;
    }

    setContextFillStyle(ctx, renderColor);
    drawFormShapeParticle(engine, particle, shape);
}

export function loop(engine, now) {
    if (!engine.running || !engine.ctx) {
        return;
    }

    const safeNow = Number.isFinite(now) ? now : getNow(engine);
    const rawDt = Math.min((safeNow - engine.lastTime) / 1000, PARTICLE_RENDER_LIMITS.maxFrameDtSeconds);
    const timeScale = Number.isFinite(engine.timeScale) && engine.timeScale > 0 ? engine.timeScale : 1;
    const dt = Math.min(
        rawDt * timeScale,
        PARTICLE_RENDER_LIMITS.maxFrameDtSeconds * PARTICLE_RENDER_LIMITS.maxScaledFrameDtMultiplier,
    );
    engine.lastTime = safeNow;
    const ctx = engine.ctx;
    resetContextStateCache();

    ctx.clearRect(0, 0, engine.width, engine.height);
    updateRockets(engine, dt);
    updateParticles(engine, dt);
    updateFlashes(engine, dt);
    updateTwinkleClouds(engine, dt);
    prepareParticleRenderState(engine);

    ctx.globalCompositeOperation = 'lighter';

    for (let index = 0; index < engine.flashes.length; index += 1) {
        drawBurstCenterFlash(engine, engine.flashes[index]);
    }
    for (let index = 0; index < engine.particles.length; index += 1) {
        const particle = engine.particles[index];
        if (particle.type === 'rocketEmber') {
            drawRocketEmberParticle(engine, particle);
            continue;
        }

        if (particle.type === 'burstSpark') {
            drawBurstSparkParticle(engine, particle);
            continue;
        }

        drawFormParticle(engine, particle);
    }

    for (let index = 0; index < engine.twinkleClouds.length; index += 1) {
        drawBurstTwinkleCloud(engine, engine.twinkleClouds[index]);
    }

    ctx.globalCompositeOperation = 'source-over';
    setContextGlobalAlpha(ctx, 1);

    for (let index = 0; index < engine.rockets.length; index += 1) {
        drawSparkFadeRocket(engine, engine.rockets[index]);
    }

    drainBurstQueue(engine);
    clearRenderCachesWhenIdle(engine);

    const requestAnimationFrameFn = getRequestAnimationFrame(engine);
    if (engine.running && typeof requestAnimationFrameFn === 'function') {
        engine.rafId = requestAnimationFrameFn(engine.loopFrame);
    }
}
