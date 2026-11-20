import { resolveSizeScale, resolveTimeScale } from './mathResolvers.js';

export function isPlainRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeGroupedPublicOptions(options = {}) {
    if (!isPlainRecord(options)) {
        return {};
    }

    const canvas = isPlainRecord(options.canvas) ? options.canvas : {};
    const runtime = isPlainRecord(options.runtime) ? options.runtime : {};
    const performance = isPlainRecord(options.performance) ? options.performance : {};
    const rocket = isPlainRecord(options.rocket) ? options.rocket : {};
    const rocketTailEmbers = isPlainRecord(options.rocketTailEmbers) ? options.rocketTailEmbers : {};
    const burstForms = isPlainRecord(options.burstForms) ? options.burstForms : {};
    const burstSparks = isPlainRecord(options.burstSparks) ? options.burstSparks : {};
    const burstCenterFlash = isPlainRecord(options.burstCenterFlash) ? options.burstCenterFlash : {};
    const burstTwinkleCloud = isPlainRecord(options.burstTwinkleCloud) ? options.burstTwinkleCloud : {};

    const sizeScale = resolveSizeScale(options.sizeScale, 1);
    const timeScale = resolveTimeScale(options.timeScale, 1);
    const simple = options.simple === true;

    return {
        mode: options.mode,
        bursts: options.bursts,
        duration: options.duration,
        rocketCount: options.rocketCount,
        rocketDelay: options.rocketDelay,
        totalDuration: options.totalDuration,
        timeScale,
        sizeScale,
        simple,
        onStart: options.onStart,
        onStop: options.onStop,
        onFinish: options.onFinish,
        canvas: { ...canvas },
        runtime: { ...runtime },
        performance: { ...performance },
        rocket: { ...rocket },
        rocketTailEmbers: { ...rocketTailEmbers },
        burstForms: { ...burstForms },
        burstSparks: { ...burstSparks },
        burstCenterFlash: { ...burstCenterFlash },
        burstTwinkleCloud: { ...burstTwinkleCloud },
    };
}

export function resolveBurstEntityToggle(value) {
    return typeof value === 'boolean' ? value : null;
}

const BURST_FORM_SINGLE_SHAPES = ['circle', 'square', 'rectangle', 'glyph', 'image'];
const BURST_FORM_MIX_SHAPES = ['circle', 'square', 'rectangle'];

function appendUnique(list, value) {
    if (!list.includes(value)) {
        list.push(value);
    }
}

function resolveBurstFormShapeTokenSet(shape) {
    if (typeof shape !== 'string') {
        return [];
    }

    const trimmed = shape.trim();
    if (!trimmed) {
        return [];
    }

    if (trimmed === 'mix') {
        return [...BURST_FORM_MIX_SHAPES];
    }

    const resolved = [];
    const tokens = trimmed.split('|');

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index].trim();
        if (!token) {
            continue;
        }

        if (token === 'mix') {
            for (let mixIndex = 0; mixIndex < BURST_FORM_MIX_SHAPES.length; mixIndex += 1) {
                appendUnique(resolved, BURST_FORM_MIX_SHAPES[mixIndex]);
            }
            continue;
        }

        if (BURST_FORM_SINGLE_SHAPES.includes(token)) {
            appendUnique(resolved, token);
        }
    }

    return resolved;
}

export function resolveBurstFormShape(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === 'mix' || BURST_FORM_SINGLE_SHAPES.includes(trimmed)) {
            return trimmed;
        }

        const resolvedSet = resolveBurstFormShapeTokenSet(trimmed);
        if (resolvedSet.length > 0) {
            return resolvedSet.join('|');
        }
    }

    return 'circle';
}

export function resolveBurstFormShapeSet(shape) {
    const resolvedSet = resolveBurstFormShapeTokenSet(shape);
    return resolvedSet.length > 0 ? resolvedSet : ['circle'];
}

const BURST_FORM_GLYPH_LIMIT = 8;

export function normalizeBurstFormGlyph(glyph, fallback = '★') {
    if (typeof glyph !== 'string') {
        return fallback;
    }

    const trimmed = glyph.trim();
    if (!trimmed) {
        return fallback;
    }

    const normalized = Array.from(trimmed).slice(0, BURST_FORM_GLYPH_LIMIT).join('');
    return normalized || fallback;
}

function isPositiveFinite(value) {
    return Number.isFinite(value) && value > 0;
}

function isBurstFormImageFrame(frame) {
    return (
        !!frame
        && typeof frame === 'object'
        && !!frame.source
        && typeof frame.source === 'object'
        && Number.isFinite(frame.x)
        && Number.isFinite(frame.y)
        && frame.x >= 0
        && frame.y >= 0
        && isPositiveFinite(frame.width)
        && isPositiveFinite(frame.height)
    );
}

/**
 * Image frames for the `image` form shape. Invalid entries are dropped.
 * Frame objects are kept by reference: the source image is never cloned.
 * `undefined` keeps the fallback (the current config value).
 */
export function normalizeBurstFormImages(images, fallback = []) {
    if (images === undefined) {
        return fallback;
    }

    if (!Array.isArray(images)) {
        return [];
    }

    const normalized = [];
    for (let index = 0; index < images.length; index += 1) {
        if (isBurstFormImageFrame(images[index])) {
            normalized.push(images[index]);
        }
    }
    return normalized;
}

/**
 * Relative weights of form shapes, e.g. `{ image: 3, circle: 1 }`.
 * Unknown shapes and negative or non-finite weights are dropped.
 * `undefined` keeps the fallback; `null` or an empty result disables weighting.
 */
export function normalizeBurstFormShapeWeights(weights, fallback = null) {
    if (weights === undefined) {
        return fallback;
    }

    if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
        return null;
    }

    const normalized = {};
    let hasWeight = false;
    for (let index = 0; index < BURST_FORM_SINGLE_SHAPES.length; index += 1) {
        const shape = BURST_FORM_SINGLE_SHAPES[index];
        const weight = weights[shape];
        if (Number.isFinite(weight) && weight >= 0) {
            normalized[shape] = weight;
            hasWeight = true;
        }
    }
    return hasWeight ? normalized : null;
}

export function resolveBurstColorMode(value) {
    if (value === 'rgb' || value === 'single') {
        return value;
    }
    return 'palette';
}

export function resolveBurstFlashColorMode(value) {
    if (value === 'palette' || value === 'rgb' || value === 'single') {
        return value;
    }

    return 'single';
}

export function resolveBurstSparkShape(value) {
    if (value === 'spindle' || value === 'fade') {
        return value;
    }

    return 'uniform';
}
