const MIN_SCALE_EPSILON = 0.0001;
const SIZE_SCALE_MIN = MIN_SCALE_EPSILON;
const TIME_SCALE_MIN = 0.05;

export function resolveFinite(value, fallback) {
    if (Number.isFinite(value)) {
        return value;
    }

    if (Number.isFinite(fallback)) {
        return fallback;
    }

    return 0;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function resolveScaledOverride(value, fallback, scale = 1) {
    const base = resolveFinite(value, fallback);
    const safeScale = Number.isFinite(scale) ? scale : 1;
    const scaled = base * safeScale;
    return Number.isFinite(scaled) ? scaled : resolveFinite(fallback, base);
}

export function resolveScaledInverseOverride(value, fallback, scale = 1) {
    const numericScale = Number.isFinite(scale) ? scale : 1;
    const safeScaleMagnitude = Math.max(Math.abs(numericScale), MIN_SCALE_EPSILON);
    const safeScale = numericScale < 0 ? -safeScaleMagnitude : safeScaleMagnitude;
    const base = resolveFinite(value, fallback);
    const scaled = base / safeScale;
    return Number.isFinite(scaled) ? scaled : resolveFinite(fallback, base);
}

export function resolveScaledInteger(value, fallback, min = 1, scale = 1) {
    const safeMin = Number.isFinite(min) ? min : 1;
    const base = resolveFinite(value, fallback);
    const safeScale = Number.isFinite(scale) ? scale : 1;
    const scaled = Math.floor(base * safeScale);
    if (!Number.isFinite(scaled)) {
        return Math.max(safeMin, Math.floor(resolveFinite(fallback, safeMin)));
    }

    return Math.max(safeMin, scaled);
}


export function resolveSizeScale(value, fallback = 1) {
    return Math.max(SIZE_SCALE_MIN, resolveFinite(value, fallback));
}

export function resolveTimeScale(value, fallback = 1) {
    return Math.max(TIME_SCALE_MIN, resolveFinite(value, fallback));
}

export function resolveEnvelopeTimeScale(sizeScale) {
    return Math.sqrt(resolveSizeScale(sizeScale, 1));
}

export function resolveOptionalPositiveInteger(value, min = 1) {
    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }

    const normalized = Math.floor(value);
    if (!Number.isFinite(normalized)) {
        return null;
    }

    return Math.max(min, normalized);
}
