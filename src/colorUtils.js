import { clamp } from './mathResolvers.js';

export function parseHexColor(color) {
    if (typeof color !== 'string') {
        return null;
    }

    const match = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!match) {
        return null;
    }

    const normalized = match[1].length === 3
        ? match[1].split('').map((channel) => `${channel}${channel}`).join('')
        : match[1];

    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

export function toHexChannel(value) {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}


export function normalizeHexColor(color, fallback = '#ffd166') {
    const rgb = parseHexColor(color);
    if (!rgb) {
        return fallback;
    }

    return `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}`;
}

export function mixHexColor(color, targetColor, amount) {
    const sourceRgb = parseHexColor(color);
    const targetRgb = parseHexColor(targetColor);
    if (!sourceRgb || !targetRgb) {
        return color;
    }

    const safeAmount = clamp(amount, 0, 1);
    const inverseAmount = 1 - safeAmount;
    return `#${toHexChannel((sourceRgb.r * inverseAmount) + (targetRgb.r * safeAmount))}${
        toHexChannel((sourceRgb.g * inverseAmount) + (targetRgb.g * safeAmount))
    }${toHexChannel((sourceRgb.b * inverseAmount) + (targetRgb.b * safeAmount))}`;
}

export function boostHexColor(color, brightnessBoost, saturationBoost = 0) {
    const rgb = parseHexColor(color);
    if (!rgb) {
        return color;
    }

    const safeSaturationBoost = Math.max(0, saturationBoost);
    const gray = (rgb.r * 0.299) + (rgb.g * 0.587) + (rgb.b * 0.114);
    const saturationScale = 1 + safeSaturationBoost;
    const saturated = {
        r: gray + ((rgb.r - gray) * saturationScale),
        g: gray + ((rgb.g - gray) * saturationScale),
        b: gray + ((rgb.b - gray) * saturationScale),
    };
    const brightnessScale = 1 + Math.max(0, brightnessBoost);

    return `#${toHexChannel(saturated.r * brightnessScale)}${
        toHexChannel(saturated.g * brightnessScale)
    }${toHexChannel(saturated.b * brightnessScale)}`;
}

export function toAlphaColor(color, alpha) {
    const rgb = parseHexColor(color);
    if (!rgb) {
        return color;
    }

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}
