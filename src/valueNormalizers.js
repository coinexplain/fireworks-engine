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

const BURST_FORM_SINGLE_SHAPES = ['circle', 'square', 'rectangle', 'glyph'];
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
