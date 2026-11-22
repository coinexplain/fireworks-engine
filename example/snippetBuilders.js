import { buildEngineConfig } from '../src/configBuilder.js';
import {
    DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET,
    FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES,
} from './labPersistence.js';

const SNIPPET_PRUNE_OMIT = Symbol('fireworks-engine-lab-snippet-prune-omit');

const SNIPPET_DEFAULT_OPTIONS = (() => {
    const engineDefaults = buildEngineConfig({});
    return Object.freeze({
        timeScale: engineDefaults.timeScale,
        sizeScale: engineDefaults.sizeScale,
        performance: Object.freeze({
            enableBurstQueueThrottling: engineDefaults.toggles.enableBurstQueueThrottling,
        }),
        rocket: Object.freeze({
            ...engineDefaults.rocket,
            durationMin: DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET.duration,
            durationMax: DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET.duration,
        }),
        rocketTailEmbers: Object.freeze({ ...engineDefaults.rocketTailEmbers }),
        burstForms: Object.freeze({ ...engineDefaults.burstForms }),
        burstSparks: Object.freeze({ ...engineDefaults.burstSparks }),
        burstCenterFlash: Object.freeze({ ...engineDefaults.burstCenterFlash }),
        burstTwinkleCloud: Object.freeze({ ...engineDefaults.burstTwinkleCloud }),
    });
})();

const ENGINE_SNIPPET_DEFAULT_OPTIONS = (() => {
    const engineDefaults = buildEngineConfig({});
    return Object.freeze({
        timeScale: engineDefaults.timeScale,
        sizeScale: engineDefaults.sizeScale,
        performance: Object.freeze({
            ...engineDefaults.performance,
        }),
        rocket: Object.freeze({ ...engineDefaults.rocket }),
        rocketTailEmbers: Object.freeze({ ...engineDefaults.rocketTailEmbers }),
        burstForms: Object.freeze({ ...engineDefaults.burstForms }),
        burstSparks: Object.freeze({ ...engineDefaults.burstSparks }),
        burstCenterFlash: Object.freeze({ ...engineDefaults.burstCenterFlash }),
        burstTwinkleCloud: Object.freeze({ ...engineDefaults.burstTwinkleCloud }),
    });
})();

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function formatSnippetBlock(lines) {
    return `${lines.join('\n')}\n`;
}

export function buildEngineBootstrapSnippet({
    effectOptions,
    bodyLines,
    optionsVariableName = 'effectOptions',
    introLines = [],
}) {
    const lines = [
        "import { createFireworksEngine } from 'fireworks-engine';",
        '',
    ];

    if (introLines.length > 0) {
        lines.push(...introLines, '');
    }

    const hasEffectOptions = isPlainObject(effectOptions) && Object.keys(effectOptions).length > 0;
    if (hasEffectOptions) {
        lines.push(`const ${optionsVariableName} = ${JSON.stringify(effectOptions, null, 4)};`);
        lines.push('');
    }

    lines.push(
        'const fireworks = createFireworksEngine({',
        '    canvas: {',
        '        appendTarget: document.body,',
        '    },',
    );

    if (hasEffectOptions) {
        lines.push(`    ...${optionsVariableName},`);
    }

    lines.push('});', '');
    lines.push(...bodyLines);

    return formatSnippetBlock(lines);
}

function areValuesDeepEqual(leftValue, rightValue) {
    if (Object.is(leftValue, rightValue)) {
        return true;
    }

    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
        if (leftValue.length !== rightValue.length) {
            return false;
        }
        for (let index = 0; index < leftValue.length; index += 1) {
            if (!areValuesDeepEqual(leftValue[index], rightValue[index])) {
                return false;
            }
        }
        return true;
    }

    if (isPlainObject(leftValue) && isPlainObject(rightValue)) {
        const leftKeys = Object.keys(leftValue);
        const rightKeys = Object.keys(rightValue);
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }
        for (let index = 0; index < leftKeys.length; index += 1) {
            const key = leftKeys[index];
            if (!Object.hasOwn(rightValue, key) || !areValuesDeepEqual(leftValue[key], rightValue[key])) {
                return false;
            }
        }
        return true;
    }

    return false;
}

export function resolveBurstFormShapeTokens(shapeValue) {
    if (typeof shapeValue !== 'string') {
        return [FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES[0]];
    }

    const selectedSet = new Set();
    shapeValue.split('|').forEach((token) => {
        const trimmedToken = token.trim();
        if (!trimmedToken || !FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES.includes(trimmedToken)) {
            return;
        }
        selectedSet.add(trimmedToken);
    });

    const selectedTokens = FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES.filter((token) => selectedSet.has(token));
    return selectedTokens.length > 0 ? selectedTokens : [FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES[0]];
}

const MIX_SHAPE_TOKENS = Object.freeze(['circle', 'square', 'rectangle']);

/** Concrete shapes the engine picks from: 'mix' expands to circle|square|rectangle. */
export function resolveBurstFormPickedShapes(shapeValue) {
    const picked = [];
    resolveBurstFormShapeTokens(shapeValue).forEach((token) => {
        const expanded = token === 'mix' ? MIX_SHAPE_TOKENS : [token];
        expanded.forEach((shapeToken) => {
            if (!picked.includes(shapeToken)) picked.push(shapeToken);
        });
    });
    return picked;
}

/** burstForms.shapeWeights for the selected shapes, or null when weighting is off. */
export function resolveLabShapeWeights(burstForms) {
    if (!burstForms.shapeWeightsEnabled) {
        return null;
    }

    const shapeWeights = {};
    resolveBurstFormPickedShapes(burstForms.shape).forEach((shapeToken) => {
        shapeWeights[shapeToken] = burstForms.shapeWeights?.[shapeToken] ?? 1;
    });
    return shapeWeights;
}

function pruneSnippetDefaults(value, defaultValue) {
    if (areValuesDeepEqual(value, defaultValue)) {
        return SNIPPET_PRUNE_OMIT;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (!isPlainObject(value)) {
        return value;
    }

    const prunedObject = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const prunedValue = pruneSnippetDefaults(
            value[key],
            isPlainObject(defaultValue) ? defaultValue[key] : undefined,
        );

        if (prunedValue !== SNIPPET_PRUNE_OMIT) {
            prunedObject[key] = prunedValue;
        }
    }

    return Object.keys(prunedObject).length > 0 ? prunedObject : SNIPPET_PRUNE_OMIT;
}

export function buildCompactOptions(value, defaultValue) {
    const prunedValue = pruneSnippetDefaults(value, defaultValue);
    return isPlainObject(prunedValue) ? prunedValue : {};
}

export function buildPerformanceOptions(performance) {
    return {
        enableBurstQueueThrottling: performance.burstQueueThrottling,
    };
}

export function buildRocketOptions(rocket) {
    return {
        enabled: rocket.enabled,
        colorMode: rocket.colorMode,
        singleColor: rocket.singleColor,
        streakLength: rocket.streakLength,
        finalStreakLength: rocket.finalStreakLength,
        thickness: rocket.thickness,
        speed: rocket.speed,
        durationMin: rocket.duration,
        durationMax: rocket.duration,
        cascade: { ...rocket.cascade },
    };
}

export function buildBurstFormsOptions(burstForms) {
    return {
        enabled: burstForms.enabled,
        shape: burstForms.shape,
        glyph: burstForms.glyph,
        colorMode: burstForms.colorMode,
        singleColor: burstForms.singleColor,
        count: burstForms.count,
        speedMin: burstForms.speedMin,
        speedMax: burstForms.speedMax,
        directionDeg: burstForms.directionDeg,
        coneDeg: burstForms.coneDeg,
        gravity: burstForms.gravity,
        lifeMin: burstForms.lifeMin,
        lifeMax: burstForms.lifeMax,
        sizeMin: burstForms.sizeMin,
        sizeMax: burstForms.sizeMax,
        spin: burstForms.spin,
        spinCoverage: burstForms.spinCoverage,
        spinDuration: burstForms.spinDuration,
        spinPause: burstForms.spinPause,
        highlight: burstForms.highlight,
        highlightAngleDeg: burstForms.highlightAngleDeg,
        highlightWidth: burstForms.highlightWidth,
        wobble: burstForms.wobble,
        shrinkStart: burstForms.shrinkStart,
        shrinkTo: burstForms.shrinkTo,
        shrinkEasing: burstForms.shrinkEasing,
        shapeWeights: resolveLabShapeWeights(burstForms),
    };
}

export function buildBurstSparksOptions(burstSparks) {
    return {
        enabled: burstSparks.enabled,
        shape: burstSparks.shape,
        colorMode: burstSparks.colorMode,
        singleColor: burstSparks.singleColor,
        count: burstSparks.count,
        length: burstSparks.length,
        tailScale: burstSparks.tailScale,
        thickness: burstSparks.thickness,
        speedMin: burstSparks.speedMin,
        speedMax: burstSparks.speedMax,
        directionDeg: burstSparks.directionDeg,
        coneDeg: burstSparks.coneDeg,
        gravity: burstSparks.gravity,
        lifeMin: burstSparks.lifeMin,
        lifeMax: burstSparks.lifeMax,
    };
}

export function buildRocketTailEmbersOptions(rocketTailEmbers) {
    return {
        enabled: rocketTailEmbers.enabled,
        count: rocketTailEmbers.count,
        brightness: rocketTailEmbers.brightness,
        fade: rocketTailEmbers.fade,
        spreadX: rocketTailEmbers.spreadX,
        spreadY: rocketTailEmbers.spreadY,
        speed: rocketTailEmbers.speed,
        size: rocketTailEmbers.size,
    };
}

export function buildBurstCenterFlashOptions(burstCenterFlash) {
    return {
        enabled: burstCenterFlash.enabled,
        startSize: burstCenterFlash.startSize,
        endSize: burstCenterFlash.endSize,
        peakAlpha: burstCenterFlash.peakAlpha,
        attack: burstCenterFlash.attack,
        fade: burstCenterFlash.fade,
        colorMode: burstCenterFlash.colorMode,
        color: burstCenterFlash.color,
        innerStop: burstCenterFlash.innerStop,
    };
}

export function buildBurstTwinkleCloudOptions(burstTwinkleCloud) {
    return {
        enabled: burstTwinkleCloud.enabled,
        count: burstTwinkleCloud.count,
        radius: burstTwinkleCloud.radius,
        startDelay: burstTwinkleCloud.startDelay,
        duration: burstTwinkleCloud.duration,
        twinkleLife: burstTwinkleCloud.twinkleLife,
        brightness: burstTwinkleCloud.brightness,
        size: burstTwinkleCloud.size,
        spawnSpread: burstTwinkleCloud.spawnSpread,
    };
}

function compactRocketSnippetOptions(rocketOptions) {
    if (!rocketOptions.enabled) {
        return { enabled: false };
    }

    const compactOptions = { ...rocketOptions };
    if (compactOptions.colorMode !== 'single') {
        delete compactOptions.singleColor;
    }
    if (compactOptions.speed > 0) {
        delete compactOptions.durationMin;
        delete compactOptions.durationMax;
    }

    const cascade = compactOptions.cascade && typeof compactOptions.cascade === 'object'
        ? compactOptions.cascade
        : null;
    if (cascade) {
        if (cascade.mode !== 'rocket') {
            delete cascade.mode;
            delete cascade.childBursts;
            delete cascade.childSpeedMin;
            delete cascade.childSpeedMax;
            delete cascade.childDurationMin;
            delete cascade.childDurationMax;
            delete cascade.childDirectionDeg;
            delete cascade.childConeDeg;
        }
        if (
            Number.isFinite(cascade.childBursts)
            && Number.isFinite(cascade.bursts)
            && cascade.childBursts === cascade.bursts
        ) {
            delete cascade.childBursts;
        }
        const cascadeBursts = Number.isFinite(cascade.bursts) ? cascade.bursts : 0;
        if (cascadeBursts <= 0) {
            compactOptions.cascade = cascade.mode === 'rocket'
                ? { mode: 'rocket', bursts: 0 }
                : { bursts: 0 };
        }

        const hasPositiveChildSpeedMin = Number.isFinite(cascade.childSpeedMin) && cascade.childSpeedMin > 0;
        const hasPositiveChildSpeedMax = Number.isFinite(cascade.childSpeedMax) && cascade.childSpeedMax > 0;
        if (!hasPositiveChildSpeedMin) {
            delete cascade.childSpeedMin;
        }
        if (!hasPositiveChildSpeedMax) {
            delete cascade.childSpeedMax;
        }
        if (
            Number.isFinite(cascade.childSpeedMin)
            && Number.isFinite(cascade.childSpeedMax)
            && cascade.childSpeedMin === cascade.childSpeedMax
        ) {
            delete cascade.childSpeedMax;
        }
        const hasChildSpeed = (
            Number.isFinite(cascade.childSpeedMin)
            && cascade.childSpeedMin > 0
        ) || (
                Number.isFinite(cascade.childSpeedMax)
                && cascade.childSpeedMax > 0
            );
        if (hasChildSpeed) {
            delete cascade.childDurationMin;
            delete cascade.childDurationMax;
        } else if (
            Number.isFinite(cascade.childDurationMin)
            && Number.isFinite(cascade.childDurationMax)
            && cascade.childDurationMin === cascade.childDurationMax
        ) {
            delete cascade.childDurationMax;
        }
        if (!(Number.isFinite(cascade.childDirectionDeg) && cascade.childDirectionDeg !== 0)) {
            delete cascade.childDirectionDeg;
        }
        if (!(Number.isFinite(cascade.childConeDeg) && cascade.childConeDeg !== 360)) {
            delete cascade.childConeDeg;
        }
    }

    return compactOptions;
}

function compactBurstFormsSnippetOptions(burstFormsOptions) {
    if (!burstFormsOptions.enabled) {
        return { enabled: false };
    }

    const compactOptions = { ...burstFormsOptions };
    if (compactOptions.colorMode !== 'single') {
        delete compactOptions.singleColor;
    }

    const selectedShapeTokens = resolveBurstFormShapeTokens(compactOptions.shape);
    if (!selectedShapeTokens.includes('glyph')) {
        delete compactOptions.glyph;
    }
    if (!compactOptions.shapeWeights) {
        delete compactOptions.shapeWeights;
    }

    if (!(Number.isFinite(compactOptions.spin) && compactOptions.spin > 0)) {
        delete compactOptions.spinCoverage;
        delete compactOptions.spinDuration;
        delete compactOptions.spinPause;
        delete compactOptions.highlight;
        delete compactOptions.highlightAngleDeg;
        delete compactOptions.highlightWidth;
    } else if (!(Number.isFinite(compactOptions.highlight) && compactOptions.highlight > 0)) {
        delete compactOptions.highlightAngleDeg;
        delete compactOptions.highlightWidth;
    }

    return compactOptions;
}

function compactBurstSparksSnippetOptions(burstSparksOptions) {
    if (!burstSparksOptions.enabled) {
        return { enabled: false };
    }

    const compactOptions = { ...burstSparksOptions };
    if (compactOptions.colorMode !== 'single') {
        delete compactOptions.singleColor;
    }
    return compactOptions;
}

function compactBurstCenterFlashSnippetOptions(burstCenterFlashOptions) {
    if (!burstCenterFlashOptions.enabled) {
        return { enabled: false };
    }

    const compactOptions = { ...burstCenterFlashOptions };
    if (compactOptions.colorMode !== 'single') {
        delete compactOptions.color;
    }
    return compactOptions;
}

export function buildSnippetEffectOptions(currentSettings) {
    const rocketOptions = buildRocketOptions(currentSettings.rocket);
    const rocketTailEmbersOptions = buildRocketTailEmbersOptions(currentSettings.rocketTailEmbers);
    const burstFormsOptions = buildBurstFormsOptions(currentSettings.burstForms);
    const burstSparksOptions = buildBurstSparksOptions(currentSettings.burstSparks);
    const burstCenterFlashOptions = buildBurstCenterFlashOptions(currentSettings.burstCenterFlash);
    const burstTwinkleCloudOptions = buildBurstTwinkleCloudOptions(currentSettings.burstTwinkleCloud);

    const compactOptions = {
        timeScale: currentSettings.timeScale,
        sizeScale: currentSettings.sizeScale,
        performance: buildPerformanceOptions(currentSettings.performance),
        rocket: compactRocketSnippetOptions(rocketOptions),
        rocketTailEmbers: rocketTailEmbersOptions.enabled ? rocketTailEmbersOptions : { enabled: false },
        burstForms: compactBurstFormsSnippetOptions(burstFormsOptions),
        burstSparks: compactBurstSparksSnippetOptions(burstSparksOptions),
        burstCenterFlash: compactBurstCenterFlashSnippetOptions(burstCenterFlashOptions),
        burstTwinkleCloud: burstTwinkleCloudOptions.enabled ? burstTwinkleCloudOptions : { enabled: false },
    };

    const prunedOptions = pruneSnippetDefaults(compactOptions, SNIPPET_DEFAULT_OPTIONS);
    return isPlainObject(prunedOptions) ? prunedOptions : {};
}

export function buildCompactEngineOptions(engineOptions) {
    return buildCompactOptions(engineOptions, ENGINE_SNIPPET_DEFAULT_OPTIONS);
}

/**
 * Snippet lines that build image frames from an atlas grid (frames hold image references, not JSON).
 * Grid: first cell at (offsetX, offsetY), cells repeat every cell + gap; only whole cells count.
 * With `group` only its cells are used: cell index = row * columns + column.
 */
export function buildImageFramesSnippetLines(
    cellSize,
    optionsVariableName = 'effectOptions',
    group = null,
    grid = {},
) {
    const offsetX = grid.offsetX || 0;
    const offsetY = grid.offsetY || 0;
    const gapX = grid.gapX || 0;
    const gapY = grid.gapY || 0;
    const header = [
        'const atlas = new Image();',
        "atlas.src = '/path/to/atlas.webp';",
        'await atlas.decode();',
        `const cell = ${cellSize};`,
        `const grid = { offsetX: ${offsetX}, offsetY: ${offsetY}, gapX: ${gapX}, gapY: ${gapY} };`,
        'const count = (length, offset, gap) => (length - offset >= cell ? Math.floor((length - offset - cell) / (cell + gap)) + 1 : 0);',
        'const columns = count(atlas.naturalWidth, grid.offsetX, grid.gapX);',
        'const rows = count(atlas.naturalHeight, grid.offsetY, grid.gapY);',
        'const frameOf = (index) => ({',
        '    source: atlas,',
        '    x: grid.offsetX + (index % columns) * (cell + grid.gapX),',
        '    y: grid.offsetY + Math.floor(index / columns) * (cell + grid.gapY),',
        '    width: cell,',
        '    height: cell,',
        '});',
    ];

    if (group) {
        return [
            `// The 'image' shape needs frames. Group "${group.name}": only these atlas cells are used.`,
            ...header,
            `${optionsVariableName}.burstForms.images = ${JSON.stringify(group.cells)}.map(frameOf);`,
            '',
        ];
    }

    return [
        "// The 'image' shape needs frames: an image (or atlas) and rectangles inside it.",
        ...header,
        `${optionsVariableName}.burstForms.images = Array.from({ length: columns * rows }, (_, index) => frameOf(index));`,
        '',
    ];
}

export function buildSettingsSnippet(currentSettings) {
    const effectOptions = buildSnippetEffectOptions(currentSettings);
    const usesImages = currentSettings.burstForms.enabled
        && resolveBurstFormShapeTokens(currentSettings.burstForms.shape).includes('image');
    if (usesImages && !isPlainObject(effectOptions.burstForms)) {
        effectOptions.burstForms = {};
    }
    return buildEngineBootstrapSnippet({
        effectOptions,
        bodyLines: [
            ...(usesImages
                ? buildImageFramesSnippetLines(
                    currentSettings.burstForms.imageCellSize,
                    'effectOptions',
                    currentSettings.burstForms.imageGroups?.find(
                        (group) => group.name === currentSettings.burstForms.imageGroup,
                    ) ?? null,
                    {
                        offsetX: currentSettings.burstForms.imageGridOffsetX,
                        offsetY: currentSettings.burstForms.imageGridOffsetY,
                        gapX: currentSettings.burstForms.imageGridGapX,
                        gapY: currentSettings.burstForms.imageGridGapY,
                    },
                )
                : []),
            'const targetX = window.innerWidth * 0.5;',
            'const targetY = window.innerHeight * 0.5;',
            'fireworks.launchRocketAt(targetX, targetY, effectOptions);',
        ],
    }).trimEnd();
}
