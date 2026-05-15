import { resolveExamplesGalleryLaunchPlan } from './examplesGalleryData.js';
import {
    buildCompactOptions,
    buildEngineBootstrapSnippet,
    formatSnippetBlock,
} from './snippetBuilders.js';
import { resolveFireworksEnginePreset } from '../src/presets.js';

const SINGLE_RED_COLOR = '#ff3b30';
const DEFAULT_GLYPH = '★✦';

function isPlainRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
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

    if (isPlainRecord(leftValue) && isPlainRecord(rightValue)) {
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

function intersectPortableValues(leftValue, rightValue) {
    if (areValuesDeepEqual(leftValue, rightValue)) {
        return leftValue;
    }

    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
        return areValuesDeepEqual(leftValue, rightValue) ? leftValue : undefined;
    }

    if (isPlainRecord(leftValue) && isPlainRecord(rightValue)) {
        const shared = {};
        Object.keys(leftValue).forEach((key) => {
            if (!Object.hasOwn(rightValue, key)) {
                return;
            }

            const sharedValue = intersectPortableValues(leftValue[key], rightValue[key]);
            if (sharedValue !== undefined) {
                shared[key] = sharedValue;
            }
        });
        return Object.keys(shared).length > 0 ? shared : {};
    }

    return undefined;
}

function buildCommonPortableOptions(optionsList) {
    if (!Array.isArray(optionsList) || optionsList.length === 0) {
        return {};
    }

    const [firstValue, ...restValues] = optionsList;
    const commonValue = restValues.reduce((sharedValue, nextValue) => {
        if (sharedValue === undefined) {
            return undefined;
        }
        return intersectPortableValues(sharedValue, nextValue);
    }, firstValue);

    return isPlainRecord(commonValue) ? commonValue : {};
}

function subtractPortableValues(value, baseline) {
    if (areValuesDeepEqual(value, baseline)) {
        return undefined;
    }

    if (!isPlainRecord(value) || !isPlainRecord(baseline)) {
        return value;
    }

    const diff = {};
    Object.keys(value).forEach((key) => {
        if (!Object.hasOwn(baseline, key)) {
            diff[key] = value[key];
            return;
        }

        const nestedDiff = subtractPortableValues(value[key], baseline[key]);
        if (nestedDiff !== undefined) {
            diff[key] = nestedDiff;
        }
    });

    return Object.keys(diff).length > 0 ? diff : undefined;
}

function compactPortableLaunches(launches) {
    return launches.map((launch) => ({
        ...launch,
        options: buildCompactOptions(launch.options, resolveFireworksEnginePreset('base')),
    }));
}

function buildPortableSingleLaunchSnippet({
    effectOptions,
    launchCallLines,
}) {
    return buildEngineBootstrapSnippet({
        effectOptions,
        bodyLines: launchCallLines,
    });
}

function buildSingleRocketSnippet(recipeId, colorModeId) {
    if (recipeId === 'direct-burst') {
        const baseLines = [
            '// Minimal: engine.burst(centerX, centerY);',
            'engine.burst(centerX, centerY, {',
            '    ...fullRocketOptions,',
        ];

        if (colorModeId === 'rgb') {
            baseLines.push("    burstForms: { enabled: true, colorMode: 'rgb' },");
            baseLines.push("    burstSparks: { enabled: true, colorMode: 'rgb' },");
            baseLines.push("    burstCenterFlash: { enabled: true, colorMode: 'rgb' },");
        } else if (colorModeId === 'single-red') {
            baseLines.push(`    burstForms: { enabled: true, colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
            baseLines.push(`    burstSparks: { enabled: true, colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
            baseLines.push(`    burstCenterFlash: { enabled: true, colorMode: 'single', color: '${SINGLE_RED_COLOR}' },`);
        } else {
            baseLines.push("    burstForms: { enabled: true },");
            baseLines.push("    burstSparks: { enabled: true },");
            baseLines.push("    burstCenterFlash: { enabled: true },");
        }

        baseLines.push("    burstTwinkleCloud: { enabled: true },");
        baseLines.push('});');
        return formatSnippetBlock(baseLines);
    }

    if (recipeId === 'confetti') {
        return formatSnippetBlock([
            '// Minimal: engine.confetti(centerX, centerY);',
            '// Note: timeScale is global per engine instance.',
            '// This recipe uses a dedicated instance so timeScale: 3 does not affect other recipes (they run at timeScale: 1).',
            'engine.confetti(centerX, centerY, {',
            '    timeScale: 3,',
            '    burstForms: {',
            '        count: 120,',
            '        wobble: 0.5,',
            '        spin: 0.35,',
            '        spinCoverage: 0.92,',
            '        highlight: 0.8,',
            '        highlightAngleDeg: 20,',
            '        highlightWidth: 0.3,',
            '    },',
            '});',
        ]);
    }

    if (recipeId === 'snow-fall') {
        return formatSnippetBlock([
            '// Minimal: engine.burst(centerX, -10, { burstForms: { enabled: true, shape: \'glyph\', glyph: \'❄•\' }, rocket: { enabled: false } });',
            'const snowOptions = {',
            '    timeScale: 1,',
            '    sizeScale: 1,',
            "    rocket: { enabled: false },",
            "    rocketTailEmbers: { enabled: false },",
            '    burstForms: {',
            '        enabled: true,',
            "        shape: 'glyph',",
            "        glyph: '❄•',",
            "        colorMode: 'palette',",
            "        palette: ['#ffffff', '#ffffff', '#ffffff', '#80dfff'],",
            '        count: 1,',
            '        speedMin: 0,',
            '        speedMax: 0,',
            '        coneDeg: 20,',
            '        gravity: 60,',
            '        lifeMin: 12,',
            '        lifeMax: 140,',
            '        sizeMin: 1.6,',
            '        sizeMax: 4.0,',
            '        wobble: 0.9,',
            '        spin: 0.6,',
            '        spinCoverage: 0.25,',
            '    },',
            "    burstSparks: { enabled: false },",
            "    burstCenterFlash: { enabled: false },",
            "    burstTwinkleCloud: { enabled: false },",
            '};',
            '',
            'const waves = 100;',
            'const waveDelayMs = 1500;',
            '',
            'for (let wave = 0; wave < waves; wave += 1) {',
            '    schedule(() => {',
            '        for (let flake = 0; flake < 6; flake += 1) {',
            '            const x = Math.random() * stageWidth;',
            '            const y = -10 - (Math.random() * 40);',
            '            engine.burst(x, y, snowOptions);',
            '        }',
            '    }, wave * waveDelayMs);',
            '}',
        ]);
    }

    if (recipeId === 'leaf-fall') {
        return formatSnippetBlock([
            '// UTF leaf glyphs: 🍂 Fallen Leaf (U+1F342), 🍁 Maple Leaf (U+1F341).',
            'const leafOptions = {',
            '    timeScale: 1,',
            '    sizeScale: 1,',
            "    rocket: { enabled: false },",
            "    rocketTailEmbers: { enabled: false },",
            '    burstForms: {',
            '        enabled: true,',
            "        shape: 'glyph',",
            "        glyph: '🍂🍁',",
            "        colorMode: 'palette',",
            "        palette: ['#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#ff4d4d', '#c1ff00'],",
            '        count: 1,',
            '        speedMin: 0,',
            '        speedMax: 0,',
            '        gravity: 75,',
            '        lifeMin: 20,',
            '        lifeMax: 150,',
            '        sizeMin: 3,',
            '        sizeMax: 6,',
            '        wobble: 0.9,',
            '        spin: 0.1,',
            '        spinCoverage: 0.6,',
            '        spinDuration: 6,',
            '        spinPause: 6,',
            '        highlight: 0,',
            '    },',
            "    burstSparks: { enabled: false },",
            "    burstCenterFlash: { enabled: false },",
            "    burstTwinkleCloud: { enabled: false },",
            '};',
            '',
            'const waves = 120;',
            'const waveDelayMs = 1200;',
            '',
            'for (let wave = 0; wave < waves; wave += 1) {',
            '    schedule(() => {',
            '        for (let leaf = 0; leaf < 5; leaf += 1) {',
            '            const x = Math.random() * stageWidth;',
            '            const y = -16 - (Math.random() * 60);',
            '            engine.burst(x, y, leafOptions);',
            '        }',
            '    }, wave * waveDelayMs);',
            '}',
        ]);
    }

    if (recipeId === 'rocket-cascade') {
        return formatSnippetBlock([
            '// 1 parent rocket -> 6 child rockets -> each child runs a 3-burst cascade.',
            'engine.launchRocketAt(centerX, centerY, {',
            '    ...fullRocketOptions,',
            '    rocket: {',
            '        ...fullRocketOptions.rocket,',
            '        cascade: {',
            "            mode: 'rocket',",
            '            bursts: 6,',
            '            childBursts: 3,',
            '            delay: 90,',
            '            childSpeedMin: 100,',
            '            childSpeedMax: 150,',
            '            spreadX: 300,',
            '            spreadY: 150,',
            '            childDirectionDeg: 90,',
            '            childConeDeg: 360,',
            '        },',
            '    },',
            '});',
        ]);
    }

    if (recipeId === 'rocket-bloom') {
        return formatSnippetBlock([
            'const effectOptions = {',
            '    rocket: {',
            '        cascade: {',
            "            mode: 'rocket',",
            '            bursts: 16,',
            '            childBursts: 1,',
            '            childSpeedMin: 400,',
            '            delay: 160,',
            '            spreadX: 232,',
            '            spreadY: 239,',
            '        },',
            '    },',
            '    burstForms: { enabled: false },',
            '    burstSparks: {',
            '        count: 54,',
            '        tailScale: 1,',
            '        thickness: 1,',
            '        speedMin: 108,',
            '        speedMax: 284,',
            '        directionDeg: 0,',
            '        gravity: 180,',
            '        lifeMin: 0.8,',
            '        lifeMax: 1.4,',
            '    },',
            '    burstTwinkleCloud: { enabled: false },',
            '};',
            '',
            'engine.launchRocketAt(centerX, centerY, {',
            '    ...fullRocketOptions,',
            '    ...effectOptions,',
            '});',
        ]);
    }

    const baseLines = [];
    if (recipeId === 'full-rocket') {
        baseLines.push('// Minimal: engine.boom(centerX, centerY);');
    }
    baseLines.push(
        recipeId === 'full-rocket'
            ? "engine.boom(centerX, centerY, {"
            : "engine.launchRocketAt(centerX, centerY, {",
    );
    baseLines.push('    ...fullRocketOptions,');

    if (recipeId === 'circle-forms') {
        if (colorModeId === 'rgb') {
            baseLines.push("    burstForms: { enabled: true, shape: 'circle', colorMode: 'rgb' },");
        } else if (colorModeId === 'single-red') {
            baseLines.push(`    burstForms: { enabled: true, shape: 'circle', colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
        } else {
            baseLines.push("    burstForms: { enabled: true, shape: 'circle' },");
        }
        baseLines.push("    burstSparks: { enabled: false },");
    } else if (recipeId === 'glyph-forms') {
        baseLines.push('// You can pass multiple glyphs; each particle picks one at random.');
        if (colorModeId === 'rgb') {
            baseLines.push(`    burstForms: { enabled: true, shape: 'glyph', glyph: '${DEFAULT_GLYPH}', colorMode: 'rgb' },`);
        } else if (colorModeId === 'single-red') {
            baseLines.push(`    burstForms: { enabled: true, shape: 'glyph', glyph: '${DEFAULT_GLYPH}', colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
        } else {
            baseLines.push(`    burstForms: { enabled: true, shape: 'glyph', glyph: '${DEFAULT_GLYPH}' },`);
        }
        baseLines.push("    burstSparks: { enabled: false },");
    } else {
        if (colorModeId === 'rgb') {
            baseLines.push("    burstForms: { enabled: true, colorMode: 'rgb' },");
            baseLines.push("    burstSparks: { enabled: true, colorMode: 'rgb' },");
        } else if (colorModeId === 'single-red') {
            baseLines.push(`    burstForms: { enabled: true, colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
            baseLines.push(`    burstSparks: { enabled: true, colorMode: 'single', singleColor: '${SINGLE_RED_COLOR}' },`);
        } else {
            baseLines.push("    burstForms: { enabled: true },");
            baseLines.push("    burstSparks: { enabled: true },");
        }
    }

    if (colorModeId === 'rgb') {
        baseLines.push("    burstCenterFlash: { enabled: true, colorMode: 'rgb' },");
    } else if (colorModeId === 'single-red') {
        baseLines.push(`    burstCenterFlash: { enabled: true, colorMode: 'single', color: '${SINGLE_RED_COLOR}' },`);
    } else {
        baseLines.push("    burstCenterFlash: { enabled: true },");
    }

    baseLines.push("    rocketTailEmbers: { enabled: true },");
    baseLines.push("    burstTwinkleCloud: { enabled: true },");
    baseLines.push('});');

    return formatSnippetBlock(baseLines);
}

function buildSequenceSnippet(recipeId) {
    if (recipeId === 'confetti-dual-cannons') {
        return formatSnippetBlock([
            "const cannons = [",
            "    { x: -0.02, y: 0.5, directionDeg: 45 },",
            "    { x: 1.01, y: 0.5, directionDeg: 135 },",
            "];",
            "",
            "cannons.forEach(({ x, y, directionDeg }) => {",
            "    engine.confetti(stageWidth * x, stageHeight * y, {",
            "        timeScale: 3,",
            "        burstForms: {",
            "            count: 110,",
            "            directionDeg,",
            "            coneDeg: 40,",
            "            speedMin: 100,",
            "            speedMax: 700,",
            "            lifeMin: 4.0,",
            "            lifeMax: 7.4,",
            "            highlight: 0.8,",
            "            highlightAngleDeg: 20,",
            "            highlightWidth: 0.3,",
            "        },",
            "    });",
            "});",
        ]);
    }

    if (recipeId === 'confetti-tricolor-stream') {
        return formatSnippetBlock([
            "const cannons = [",
            "    // Spain flag",
            "    { x: -0.02, y: 0.5, color: '#a81317', directionDeg: 50 },",
            "    { x: -0.02, y: 0.5, color: '#f2b801', directionDeg: 40 },",
            "    { x: -0.02, y: 0.5, color: '#f2b801', directionDeg: 30 },",
            "    { x: -0.02, y: 0.5, color: '#a81317', directionDeg: 20 },",
            "",
            "    // Italy flag",
            "    { x: 1.01, y: 0.5, color: '#009346', directionDeg: 130 },",
            "    { x: 1.01, y: 0.5, color: '#ffffff', directionDeg: 145 },",
            "    { x: 1.01, y: 0.5, color: '#ce2b37', directionDeg: 160 },",
            "];",
            "",
            "const streamDurationMs = 5000;",
            "const cadenceMs = 120;",
            "const waves = Math.ceil(streamDurationMs / cadenceMs);",
            "",
            "for (let wave = 0; wave < waves; wave += 1) {",
            "    schedule(() => {",
            "        cannons.forEach(({ x, y, color, directionDeg }) => {",
            "            engine.confetti(stageWidth * x, stageHeight * y, {",
            "                timeScale: 3,",
            "                burstForms: {",
            "                    colorMode: 'single',",
            "                    singleColor: color,",
            "                    count: 30,",
            "                    directionDeg,",
            "                    coneDeg: 12,",
            "                    speedMin: 100,",
            "                    speedMax: 900,",
            "                    lifeMin: 2.8,",
            "                    lifeMax: 2.8,",
            "                    gravity: 0,",
            "                    highlight: 0.8,",
            "                    highlightAngleDeg: 20,",
            "                    highlightWidth: 0.3,",
            "                },",
            "            });",
            "        });",
            "    }, wave * cadenceMs);",
            "}",
        ]);
    }

    if (recipeId === 'meteor-rain') {
        return formatSnippetBlock([
            'const meteorCount = 80;',
            'const meteorCadenceMs = 120;',
            "const editorTopY = resolveRecipeEditorTopY('meteor-rain') ?? (stageHeight * 0.56);",
            '',
            'for (let index = 0; index < meteorCount; index += 1) {',
            '    schedule(() => {',
            '        const startX = stageWidth * (0.08 + Math.random() * 0.84);',
            '        const startY = -10 - (Math.random() * 30);',
            '        const targetX = stageWidth * (0.18 + Math.random() * 0.64);',
            '        const targetY = Math.max(24, Math.min(stageHeight - 24, editorTopY + ((Math.random() - 0.5) * 12)));',
            '',
            '        engine.launchRocketFromTo(',
            '            startX,',
            '            startY,',
            '            targetX,',
            '            targetY,',
            '            {',
            '                ...fullRocketOptions,',
            '                timeScale: 1.35,',
            '                sizeScale: 1.0,',
            "                burstForms: { enabled: true, colorMode: 'palette', palette: ['#ffd166', '#ff9f1c'], count: 5, directionDeg: 90, coneDeg: 100, gravity: 200, lifeMin: 0.5, lifeMax: 0.5 },",
            '                burstSparks: {',
            '                    enabled: true,',
            "                    colorMode: 'palette',",
            "                    palette: ['#fff3c4', '#ffd166', '#ff9f1c', '#ff6b35', '#f94144', '#b51717'],",
            '                    gravity: 0,',
            "                    shape: 'fade',",
            '                    count: 50,',
            '                    directionDeg: 90,',
            '                    coneDeg: 180,',
            '                    length: 24,',
            '                    tailScale: 1.8,',
            '                    speedMin: 20,',
            '                    speedMax: 220,',
            '                    thickness: 2.5,',
            '                    lifeMax: 0.25,',
            '                },',
            '                burstCenterFlash: {',
            '                    startSize: 50,',
            '                    endSize: 2,',
            '                    peakAlpha: 0.6,',
            '                    attack: 0.1,',
            "                    colorMode: 'single',",
            "                    color: '#ffe8b0',",
            '                    innerStop: 0.5,',
            '                },',
            '                burstTwinkleCloud: { enabled: false },',
            '                rocketTailEmbers: { enabled: true, count: 8, spreadY: 26 },',
            "                rocket: { ...fullRocketOptions.rocket, colorMode: 'single', singleColor: '#dff6ff', duration: 1.1, thickness: 1.3 },",
            '            },',
            '        );',
            '    }, index * meteorCadenceMs);',
            '}',
        ]);
    }

    if (recipeId === 'clock-ring') {
        return formatSnippetBlock([
            'const hourAngles = [90, 60, 30, 0, 330, 300, 270, 240, 210, 180, 150, 120];',
            'const ringCenterX = stageWidth * 0.5;',
            'const ringCenterY = stageHeight * 0.5;',
            'const startRadius = Math.max(stageWidth, stageHeight) * 0.72;',
            'const burstRadius = Math.min(stageWidth, stageHeight) * 0.28;',
            '',
            'hourAngles.forEach((angleDegrees, index) => {',
            '    schedule(() => {',
            '        const radians = angleDegrees * (Math.PI / 180);',
            '        const startX = ringCenterX + Math.cos(radians) * startRadius;',
            '        const startY = ringCenterY - Math.sin(radians) * startRadius;',
            '        const targetX = ringCenterX + Math.cos(radians) * burstRadius;',
            '        const targetY = ringCenterY - Math.sin(radians) * burstRadius;',
            '',
            '        engine.launchRocketFromTo(startX, startY, targetX, targetY, fullRocketOptions);',
            '    }, index * 100);',
            '});',
        ]);
    }

    if (recipeId === 'finale-run') {
        return formatSnippetBlock([
            'const launches = [',
            '    { delayMs: 0, x: 0.20, y: 0.42 },',
            '    { delayMs: 90, x: 0.36, y: 0.32 },',
            '    { delayMs: 180, x: 0.50, y: 0.24 },',
            '    { delayMs: 270, x: 0.64, y: 0.32 },',
            '    { delayMs: 360, x: 0.80, y: 0.40 },',
            '];',
            '',
            'launches.forEach(({ delayMs, x, y }) => {',
            '    schedule(() => {',
            '        engine.launchRocketAt(stageWidth * x, stageHeight * y, fullRocketOptions);',
            '    }, delayMs);',
            '});',
        ]);
    }

    if (recipeId === 'firework-show') {
        return formatSnippetBlock([
            'const createSingleColorOptions = (color, overrides = {}) => ({',
            '    ...fullRocketOptions,',
            '    ...overrides,',
            '    rocket: {',
            '        ...fullRocketOptions.rocket,',
            '        ...overrides.rocket,',
            "        colorMode: 'single',",
            '        singleColor: color,',
            '        cascade: {',
            '            ...fullRocketOptions.rocket?.cascade,',
            '            ...overrides.rocket?.cascade,',
            '        },',
            '    },',
            '    burstForms: {',
            '        ...fullRocketOptions.burstForms,',
            '        ...overrides.burstForms,',
            "        colorMode: 'single',",
            '        singleColor: color,',
            '    },',
            '    burstSparks: {',
            '        ...fullRocketOptions.burstSparks,',
            '        ...overrides.burstSparks,',
            "        colorMode: 'single',",
            '        singleColor: color,',
            '    },',
            '    burstCenterFlash: {',
            '        ...fullRocketOptions.burstCenterFlash,',
            '        ...overrides.burstCenterFlash,',
            "        colorMode: 'single',",
            '        color,',
            '    },',
            '    burstTwinkleCloud: {',
            '        ...fullRocketOptions.burstTwinkleCloud,',
            '        ...overrides.burstTwinkleCloud,',
            '    },',
            '});',
            '',
            'const createPaletteOptions = (palette, overrides = {}) => ({',
            '    ...fullRocketOptions,',
            '    ...overrides,',
            '    rocket: {',
            '        ...fullRocketOptions.rocket,',
            '        ...overrides.rocket,',
            "        colorMode: 'palette',",
            '        palette,',
            '        cascade: {',
            '            ...fullRocketOptions.rocket?.cascade,',
            '            ...overrides.rocket?.cascade,',
            '        },',
            '    },',
            '    burstForms: {',
            '        ...fullRocketOptions.burstForms,',
            '        ...overrides.burstForms,',
            "        colorMode: 'palette',",
            '        palette,',
            '    },',
            '    burstSparks: {',
            '        ...fullRocketOptions.burstSparks,',
            '        ...overrides.burstSparks,',
            "        colorMode: 'palette',",
            '        palette,',
            '    },',
            '    burstCenterFlash: {',
            '        ...fullRocketOptions.burstCenterFlash,',
            '        ...overrides.burstCenterFlash,',
            "        colorMode: 'palette',",
            '    },',
            '    burstTwinkleCloud: {',
            '        ...fullRocketOptions.burstTwinkleCloud,',
            '        ...overrides.burstTwinkleCloud,',
            '    },',
            '});',
            '',
            'const createRgbOptions = (overrides = {}) => ({',
            '    ...fullRocketOptions,',
            '    ...overrides,',
            '    rocket: {',
            '        ...fullRocketOptions.rocket,',
            '        ...overrides.rocket,',
            "        colorMode: 'rgb',",
            '        cascade: {',
            '            ...fullRocketOptions.rocket?.cascade,',
            '            ...overrides.rocket?.cascade,',
            '        },',
            '    },',
            '    burstForms: {',
            '        ...fullRocketOptions.burstForms,',
            '        ...overrides.burstForms,',
            "        colorMode: 'rgb',",
            '    },',
            '    burstSparks: {',
            '        ...fullRocketOptions.burstSparks,',
            '        ...overrides.burstSparks,',
            "        colorMode: 'rgb',",
            '    },',
            '    burstCenterFlash: {',
            '        ...fullRocketOptions.burstCenterFlash,',
            '        ...overrides.burstCenterFlash,',
            "        colorMode: 'rgb',",
            '    },',
            '    burstTwinkleCloud: {',
            '        ...fullRocketOptions.burstTwinkleCloud,',
            '        ...overrides.burstTwinkleCloud,',
            '    },',
            '});',
            '',
            'const launches = [',
            '    // Phase 1: simple single-color rockets',
            "    { delayMs: 0, x: 0.30, y: 0.48, options: createSingleColorOptions('#7dd3fc', { burstForms: { enabled: false }, burstSparks: { enabled: true, count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 }, burstCenterFlash: { enabled: false }, burstTwinkleCloud: { enabled: false }, rocket: { duration: 0.88 } }) },",
            "    { delayMs: 140, x: 0.50, y: 0.48, options: createSingleColorOptions('#fda4af', { burstForms: { enabled: false }, burstSparks: { enabled: true, count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 }, burstCenterFlash: { enabled: false }, burstTwinkleCloud: { enabled: false }, rocket: { duration: 0.88 } }) },",
            "    { delayMs: 280, x: 0.70, y: 0.48, options: createSingleColorOptions('#7dd3fc', { burstForms: { enabled: false }, burstSparks: { enabled: true, count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 }, burstCenterFlash: { enabled: false }, burstTwinkleCloud: { enabled: false }, rocket: { duration: 0.88 } }) },",
            '',
            '    // Phase 2: synchronized multi-color salvo',
            "    { delayMs: 500, x: 0.20, y: 0.36, options: createSingleColorOptions('#31a03f', { burstForms: { enabled: true, count: 22, speedMin: 110, speedMax: 240 }, burstSparks: { enabled: true, count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 }, burstCenterFlash: { enabled: true, peakAlpha: 0.32 } }) },",
            "    { delayMs: 500, x: 0.38, y: 0.30, options: createSingleColorOptions('#df2327', { burstForms: { enabled: true, count: 22, speedMin: 110, speedMax: 240 }, burstSparks: { enabled: true, count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 }, burstCenterFlash: { enabled: true, peakAlpha: 0.32 } }) },",
            "    { delayMs: 500, x: 0.62, y: 0.30, options: createSingleColorOptions('#f6f011', { burstForms: { enabled: true, count: 22, speedMin: 110, speedMax: 240 }, burstSparks: { enabled: true, count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 }, burstCenterFlash: { enabled: true, peakAlpha: 0.32 } }) },",
            "    { delayMs: 500, x: 0.80, y: 0.36, options: createSingleColorOptions('#23b6e6', { burstForms: { enabled: true, count: 22, speedMin: 110, speedMax: 240 }, burstSparks: { enabled: true, count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 }, burstCenterFlash: { enabled: true, peakAlpha: 0.32 } }) },",
            '',
            '    // Phase 3: cascade build-up',
            "    { delayMs: 1000, x: 0.34, y: 0.28, options: { rocket: { cascade: { bursts: 4, delay: 92, spreadX: 140, spreadY: 80 } }, burstForms: { enabled: true, count: 24 }, burstSparks: { enabled: true, count: 62 }, burstCenterFlash: { enabled: true } } },",
            "    { delayMs: 1020, x: 0.66, y: 0.28, options: { rocket: { cascade: { bursts: 4, delay: 92, spreadX: 140, spreadY: 80 } }, burstForms: { enabled: true, count: 24 }, burstSparks: { enabled: true, count: 62 }, burstCenterFlash: { enabled: true } } },",
            '',
            '    // Phase 4: sky-wide finale cascade',
            "    { delayMs: 1500, x: 0.50, y: 0.18, options: createRgbOptions({ timeScale: 1.08, rocket: { cascade: { bursts: 14, delay: 84, spreadX: 280, spreadY: 120 } }, burstForms: { enabled: true, count: 28, speedMin: 130, speedMax: 320 }, burstSparks: { enabled: true, count: 88, length: 30, tailScale: 1.9, speedMin: 140, speedMax: 320 }, burstCenterFlash: { enabled: true, startSize: 56, endSize: 92, peakAlpha: 0.5 }, burstTwinkleCloud: { enabled: true, count: 260, radius: 130 } }) },",
            '];',
            '',
            'launches.forEach(({ delayMs, x, y, options }) => {',
            '    schedule(() => {',
            '        engine.launchRocketAt(stageWidth * x, stageHeight * y, options);',
            '    }, delayMs);',
            '});',
        ]);
    }

    if (recipeId === 'classic-cascade') {
        return formatSnippetBlock([
            'const launches = [',
            '    { delayMs: 0, x: 0.18, y: 0.42, rocket: { cascade: { bursts: 3, delay: 90, spreadX: 150, spreadY: 70 } } },',
            '    { delayMs: 100, x: 0.34, y: 0.30, rocket: { cascade: { bursts: 3, delay: 90, spreadX: 150, spreadY: 70 } } },',
            '    { delayMs: 900, x: 0.50, y: 0.24, rocket: { cascade: { bursts: 18, delay: 96, spreadX: 300, spreadY: 100 } } },',
            '    { delayMs: 100, x: 0.66, y: 0.30, rocket: { cascade: { bursts: 3, delay: 90, spreadX: 150, spreadY: 70 } } },',
            '    { delayMs: 0, x: 0.82, y: 0.42, rocket: { cascade: { bursts: 3, delay: 90, spreadX: 150, spreadY: 70 } } },',
            '];',
            '',
            'launches.forEach(({ delayMs, x, y, rocket }) => {',
            '    schedule(() => {',
            '        engine.launchRocketAt(stageWidth * x, stageHeight * y, {',
            '            ...fullRocketOptions,',
            '            rocket: {',
            '                ...fullRocketOptions.rocket,',
            '                ...rocket,',
            '                cascade: {',
            '                    ...fullRocketOptions.rocket?.cascade,',
            '                    ...rocket?.cascade,',
            '                },',
            '            },',
            '        });',
            '    }, delayMs);',
            '});',
        ]);
    }

    return formatSnippetBlock([
        'const launches = [',
        '    { delayMs: 0, x: 0.38, y: 0.34, rocket: { cascade: { bursts: 4, delay: 80, spreadX: 135, spreadY: 86 } } },',
        '    { delayMs: 240, x: 0.62, y: 0.26, rocket: { cascade: { bursts: 5, delay: 84, spreadX: 145, spreadY: 92 } } },',
        '];',
        '',
        'launches.forEach(({ delayMs, x, y, rocket }) => {',
        '    schedule(() => {',
        '        engine.launchRocketAt(stageWidth * x, stageHeight * y, {',
        '            ...fullRocketOptions,',
        '            rocket: {',
        '                ...fullRocketOptions.rocket,',
        '                ...rocket,',
        '                cascade: {',
        '                    ...fullRocketOptions.rocket?.cascade,',
        '                    ...rocket?.cascade,',
        '                },',
        '            },',
        '        });',
        '    }, delayMs);',
        '});',
    ]);
}

function buildPortableLaunchEntries(launches, commonOptions) {
    return launches.map((launch) => {
        const portableLaunch = {
            delayMs: launch.delayMs,
        };

        if (Number.isFinite(launch.startXRatio)) {
            portableLaunch.startXRatio = launch.startXRatio;
        }
        if (Number.isFinite(launch.startYRatio)) {
            portableLaunch.startYRatio = launch.startYRatio;
        }
        if (Number.isFinite(launch.targetXRatio)) {
            portableLaunch.targetXRatio = launch.targetXRatio;
        }
        if (Number.isFinite(launch.targetYRatio)) {
            portableLaunch.targetYRatio = launch.targetYRatio;
        }

        const launchOptions = subtractPortableValues(launch.options, commonOptions);
        if (isPlainRecord(launchOptions) && Object.keys(launchOptions).length > 0) {
            portableLaunch.options = launchOptions;
        }

        return portableLaunch;
    });
}

function buildPortableRocketSequenceSnippet(compactedLaunches, commonOptions) {
    const launches = buildPortableLaunchEntries(compactedLaunches, commonOptions);

    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        `const launches = ${JSON.stringify(launches, null, 4)};`,
        '',
        'launches.forEach((launch) => {',
        '    setTimeout(() => {',
        '        const targetX = stageWidth * launch.targetXRatio;',
        '        const targetY = stageHeight * launch.targetYRatio;',
        '        if (Number.isFinite(launch.startXRatio) && Number.isFinite(launch.startYRatio)) {',
        '            fireworks.launchRocketFromTo(',
        '                stageWidth * launch.startXRatio,',
        '                stageHeight * launch.startYRatio,',
        '                targetX,',
        '                targetY,',
        '                launch.options,',
        '            );',
        '            return;',
        '        }',
        '        fireworks.launchRocketAt(targetX, targetY, launch.options);',
        '    }, launch.delayMs);',
        '});',
        ],
    });
}

function buildPortableConfettiStreamSnippet(compactedLaunches, commonOptions) {
    const cannons = buildPortableLaunchEntries(compactedLaunches, commonOptions).map((launch) => ({
        x: launch.targetXRatio,
        y: launch.targetYRatio,
        options: launch.options,
    }));

    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        `const cannons = ${JSON.stringify(cannons, null, 4)};`,
        '',
        'const streamDurationMs = 5000;',
        'const cadenceMs = 120;',
        'const waves = Math.ceil(streamDurationMs / cadenceMs);',
        '',
        'for (let wave = 0; wave < waves; wave += 1) {',
        '    setTimeout(() => {',
        '        cannons.forEach(({ x, y, options }) => {',
        '            fireworks.confetti(stageWidth * x, stageHeight * y, {',
        '                ...effectOptions,',
        '                burstForms: {',
        '                    ...effectOptions.burstForms,',
        '                    ...options.burstForms,',
        '                },',
        '            });',
        '        });',
        '    }, wave * cadenceMs);',
        '}',
        ],
        introLines: [
            '// Shared fan width and motion settings for all cannon launches.',
            '// Edit coneDeg here if you want a wider or narrower spread.',
        ],
    });
}

function buildPortableConfettiCannonsSnippet(compactedLaunches, commonOptions) {
    const cannons = buildPortableLaunchEntries(compactedLaunches, commonOptions).map((launch) => ({
        x: launch.targetXRatio,
        y: launch.targetYRatio,
        options: launch.options,
    }));

    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        `const cannons = ${JSON.stringify(cannons, null, 4)};`,
        '',
        'cannons.forEach(({ x, y, options }) => {',
        '    fireworks.confetti(stageWidth * x, stageHeight * y, {',
        '        ...effectOptions,',
        '        burstForms: {',
        '            ...effectOptions.burstForms,',
        '            ...options.burstForms,',
        '        },',
        '    });',
        '});',
        ],
        introLines: [
            '// Shared fan width and motion settings for both cannons.',
            '// Edit coneDeg here if you want a wider or narrower spread.',
        ],
    });
}

function buildPortableSnowFallSnippet(commonOptions) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        'const waves = 100;',
        'const waveDelayMs = 1500;',
        '',
        'for (let wave = 0; wave < waves; wave += 1) {',
        '    setTimeout(() => {',
        '        for (let flake = 0; flake < 6; flake += 1) {',
        '            const x = Math.random() * stageWidth;',
        '            const y = -10 - (Math.random() * 40);',
        '            fireworks.burst(x, y);',
        '        }',
        '    }, wave * waveDelayMs);',
        '}',
        ],
    });
}

function buildPortableLeafFallSnippet(commonOptions) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        'const waves = 120;',
        'const waveDelayMs = 1200;',
        '',
        'for (let wave = 0; wave < waves; wave += 1) {',
        '    setTimeout(() => {',
        '        for (let leaf = 0; leaf < 5; leaf += 1) {',
        '            const x = Math.random() * stageWidth;',
        '            const y = -16 - (Math.random() * 60);',
        '            fireworks.burst(x, y);',
        '        }',
        '    }, wave * waveDelayMs);',
        '}',
        ],
        introLines: [
            '// UTF leaf glyphs: 🍂 Fallen Leaf (U+1F342), 🍁 Maple Leaf (U+1F341).',
        ],
    });
}

function buildPortableMeteorRainSnippet(commonOptions) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        'const meteorCount = 80;',
        'const meteorCadenceMs = 120;',
        'const targetBandCenterY = stageHeight * 0.56;',
        '',
        'for (let index = 0; index < meteorCount; index += 1) {',
        '    setTimeout(() => {',
        '        const startX = stageWidth * (0.08 + (Math.random() * 0.84));',
        '        const startY = -10 - (Math.random() * 30);',
        '        const targetX = stageWidth * (0.18 + (Math.random() * 0.64));',
        '        const targetY = Math.max(24, Math.min(stageHeight - 24, targetBandCenterY + ((Math.random() - 0.5) * 12)));',
        '',
        '        fireworks.launchRocketFromTo(startX, startY, targetX, targetY);',
        '    }, index * meteorCadenceMs);',
        '}',
        ],
    });
}

function buildPortableClockRingSnippet(commonOptions) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
        'const stageWidth = window.innerWidth;',
        'const stageHeight = window.innerHeight;',
        '',
        'const hourAngles = [90, 60, 30, 0, 330, 300, 270, 240, 210, 180, 150, 120];',
        'const ringCenterX = stageWidth * 0.5;',
        'const ringCenterY = stageHeight * 0.5;',
        'const startRadius = Math.max(stageWidth, stageHeight) * 0.72;',
        'const burstRadius = Math.min(stageWidth, stageHeight) * 0.28;',
        '',
        'hourAngles.forEach((angleDegrees, index) => {',
        '    setTimeout(() => {',
        '        const radians = angleDegrees * (Math.PI / 180);',
        '        const startX = ringCenterX + Math.cos(radians) * startRadius;',
        '        const startY = ringCenterY - Math.sin(radians) * startRadius;',
        '        const targetX = ringCenterX + Math.cos(radians) * burstRadius;',
        '        const targetY = ringCenterY - Math.sin(radians) * burstRadius;',
        '',
        '        fireworks.launchRocketFromTo(startX, startY, targetX, targetY);',
        '    }, index * 100);',
        '});',
        ],
    });
}

function buildPortableSingleLaunchOptionsSnippet(commonOptions, extraLines = []) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
            'const centerX = window.innerWidth * 0.5;',
            'const centerY = window.innerHeight * 0.5;',
            ...extraLines,
            'fireworks.launchRocketAt(centerX, centerY, effectOptions);',
        ],
    });
}

function buildPortableSingleCallSnippet(callLine, commonOptions, extraLines = []) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
            'const centerX = window.innerWidth * 0.5;',
            'const centerY = window.innerHeight * 0.5;',
            ...extraLines,
            callLine,
        ],
    });
}

function buildPortableSingleConfettiSnippet(commonOptions) {
    return buildEngineBootstrapSnippet({
        effectOptions: commonOptions,
        bodyLines: [
            'const centerX = window.innerWidth * 0.5;',
            'const centerY = window.innerHeight * 0.5;',
            '// This recipe runs at timeScale: 3 inside its own engine instance.',
            'fireworks.confetti(centerX, centerY, effectOptions);',
        ],
    });
}

function buildPortableSnippet(recipeId, colorModeId = 'palette') {
    const launchPlan = resolveExamplesGalleryLaunchPlan(recipeId, colorModeId);
    if (!launchPlan || !Array.isArray(launchPlan.launches) || launchPlan.launches.length === 0) {
        return '';
    }

    const compactedLaunches = compactPortableLaunches(launchPlan.launches);
    const commonOptions = buildCommonPortableOptions(compactedLaunches.map((launch) => launch.options));

    if (recipeId === 'full-rocket') {
        return buildPortableSingleCallSnippet('fireworks.boom(centerX, centerY);', commonOptions);
    }

    if (recipeId === 'direct-burst') {
        return buildPortableSingleCallSnippet('fireworks.burst(centerX, centerY);', commonOptions);
    }

    if (recipeId === 'confetti') {
        return buildPortableSingleConfettiSnippet(commonOptions);
    }

    if (recipeId === 'snow-fall') {
        return buildPortableSnowFallSnippet(commonOptions);
    }

    if (recipeId === 'leaf-fall') {
        return buildPortableLeafFallSnippet(commonOptions);
    }

    if (recipeId === 'meteor-rain') {
        return buildPortableMeteorRainSnippet(commonOptions);
    }

    if (recipeId === 'clock-ring') {
        return buildPortableClockRingSnippet(commonOptions);
    }

    if (recipeId === 'confetti-dual-cannons') {
        return buildPortableConfettiCannonsSnippet(compactedLaunches, commonOptions);
    }

    if (recipeId === 'confetti-tricolor-stream') {
        return buildPortableConfettiStreamSnippet(compactedLaunches, commonOptions);
    }

    if (recipeId === 'rocket-bloom' || recipeId === 'rocket-cascade') {
        return buildPortableSingleLaunchOptionsSnippet(commonOptions);
    }

    if (recipeId === 'circle-forms' || recipeId === 'glyph-forms') {
        return buildPortableSingleCallSnippet('fireworks.launchRocketAt(centerX, centerY);', commonOptions, [
            recipeId === 'glyph-forms'
                ? '// You can pass multiple glyphs; each particle picks one at random.'
                : null,
        ].filter(Boolean));
    }

    if (recipeId === 'finale-run' || recipeId === 'firework-show' || recipeId === 'classic-cascade') {
        return buildPortableRocketSequenceSnippet(compactedLaunches, commonOptions);
    }

    return buildPortableRocketSequenceSnippet(compactedLaunches, commonOptions);
}

export function resolveExamplesGallerySnippet(recipeId, colorModeId = 'palette') {
    if (
        recipeId === 'full-rocket'
        || recipeId === 'direct-burst'
        || recipeId === 'confetti'
        || recipeId === 'snow-fall'
        || recipeId === 'leaf-fall'
        || recipeId === 'circle-forms'
        || recipeId === 'glyph-forms'
        || recipeId === 'rocket-cascade'
        || recipeId === 'rocket-bloom'
    ) {
        return buildSingleRocketSnippet(recipeId, colorModeId);
    }

    return buildSequenceSnippet(recipeId);
}

export function resolveExamplesGalleryPortableSnippet(recipeId, colorModeId = 'palette') {
    return buildPortableSnippet(recipeId, colorModeId);
}
