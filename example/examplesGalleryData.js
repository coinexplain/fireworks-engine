import { resolveFireworksEnginePreset } from '../src/index.js';

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.freeze(value);
    Object.values(value).forEach((entry) => {
        deepFreeze(entry);
    });
    return value;
}

function isPlainRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeOptions(baseOptions, ...overrides) {
    const merged = {
        ...baseOptions,
    };

    overrides.forEach((override) => {
        if (!isPlainRecord(override)) {
            return;
        }

        Object.entries(override).forEach(([key, value]) => {
            if (isPlainRecord(value) && isPlainRecord(merged[key])) {
                merged[key] = {
                    ...merged[key],
                    ...value,
                };
                return;
            }

            merged[key] = value;
        });
    });

    return merged;
}

const SINGLE_RED_COLOR = '#ff3b30';
const DEFAULT_GLYPH = '★✦';
const CLOCK_RING_HOUR_ANGLES = deepFreeze([90, 60, 30, 0, 330, 300, 270, 240, 210, 180, 150, 120]);
const CLOCK_RING_START_RADIUS_RATIO = 0.72;
const CLOCK_RING_BURST_RADIUS_RATIO = 0.28;

export const EXAMPLES_GALLERY_SINGLE_COLOR_MODES = deepFreeze([
    {
        id: 'palette',
        label: 'Palette',
    },
    {
        id: 'rgb',
        label: 'RGB',
    },
    {
        id: 'single-red',
        label: 'Single (red)',
    },
]);

const FULL_EFFECT_ENTITY_OVERRIDES = deepFreeze({
    rocketTailEmbers: {
        enabled: true,
    },
    burstForms: {
        enabled: true,
    },
    burstSparks: {
        enabled: true,
    },
    burstCenterFlash: {
        enabled: true,
    },
    burstTwinkleCloud: {
        enabled: true,
    },
});

const BASE_SINGLE_LAUNCH_OPTIONS = deepFreeze(mergeOptions(
    resolveFireworksEnginePreset('base'),
    FULL_EFFECT_ENTITY_OVERRIDES,
));

const BASE_CASCADE_OPTIONS = BASE_SINGLE_LAUNCH_OPTIONS;

function resolveSingleColorModeOverrides(colorModeId) {
    if (colorModeId === 'rgb') {
        return {
            burstForms: {
                colorMode: 'rgb',
            },
            burstSparks: {
                colorMode: 'rgb',
            },
            burstCenterFlash: {
                colorMode: 'rgb',
            },
        };
    }

    if (colorModeId === 'single-red') {
        return {
            burstForms: {
                colorMode: 'single',
                singleColor: SINGLE_RED_COLOR,
            },
            burstSparks: {
                colorMode: 'single',
                singleColor: SINGLE_RED_COLOR,
            },
            burstCenterFlash: {
                colorMode: 'single',
                color: SINGLE_RED_COLOR,
            },
        };
    }

    return {};
}

function toClockRingRatioPoint(angleDegrees, radiusRatio) {
    const radians = angleDegrees * (Math.PI / 180);

    return {
        x: 0.5 + Math.cos(radians) * radiusRatio,
        y: 0.5 - Math.sin(radians) * radiusRatio,
    };
}

function buildClockRingLaunches() {
    return CLOCK_RING_HOUR_ANGLES.map((angleDegrees, index) => {
        const start = toClockRingRatioPoint(angleDegrees, CLOCK_RING_START_RADIUS_RATIO);
        const target = toClockRingRatioPoint(angleDegrees, CLOCK_RING_BURST_RADIUS_RATIO);

        return {
            delayMs: index * 100,
            startXRatio: start.x,
            startYRatio: start.y,
            targetXRatio: target.x,
            targetYRatio: target.y,
            options: {},
        };
    });
}

export const EXAMPLES_GALLERY_SECTIONS = deepFreeze([
    {
        id: 'single-fireworks',
        title: 'Single Fireworks',
        recipeIds: ['full-rocket', 'direct-burst', 'circle-forms', 'glyph-forms'],
    },
    {
        id: 'creative-scenes',
        title: 'Creative Scenes',
        recipeIds: ['confetti', 'confetti-dual-cannons', 'confetti-tricolor-stream', 'snow-fall', 'leaf-fall', 'meteor-rain', 'rocket-bloom'],
    },
    {
        id: 'firework-series',
        title: 'Firework Series',
        recipeIds: ['clock-ring', 'firework-show', 'finale-run'],
    },
    {
        id: 'cascades',
        title: 'Cascades',
        recipeIds: ['rocket-cascade', 'classic-cascade'],
    },
]);

export const EXAMPLES_GALLERY_RECIPES = deepFreeze([
    {
        id: 'full-rocket',
        sectionId: 'single-fireworks',
        title: 'Full Rocket',
        description: 'A single rocket using all major effect entities.',
        runType: 'single',
        supportsColorModes: true,
        colorModeIds: ['palette', 'rgb', 'single-red'],
        recipeOptions: {},
    },
    {
        id: 'direct-burst',
        sectionId: 'single-fireworks',
        title: 'Direct Burst',
        description: 'A full-effect burst at target coordinates without rocket flight.',
        runType: 'single',
        supportsColorModes: true,
        colorModeIds: ['palette', 'rgb', 'single-red'],
        recipeOptions: {
            rocket: {
                enabled: false,
            },
        },
    },
    {
        id: 'confetti',
        sectionId: 'creative-scenes',
        title: 'Confetti',
        description: 'A forms-only fan burst tuned for confetti motion. It runs in an isolated engine because timeScale is global per instance.',
        runType: 'single',
        supportsColorModes: false,
        recipeOptions: {
            timeScale: 3,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: true,
                shape: 'circle|square',
                colorMode: 'palette',
                count: 100,
                speedMin: 100,
                speedMax: 600,
                directionDeg: 90,
                coneDeg: 100,
                gravity: 80,
                lifeMin: 8,
                lifeMax: 8,
                sizeMin: 3.3,
                sizeMax: 4.4,
                wobble: 0.4,
                spin: 0.3,
                spinCoverage: 0.92,
                highlight: 0.8,
                highlightAngleDeg: 20,
                highlightWidth: 0.3,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
    },
    {
        id: 'confetti-dual-cannons',
        sectionId: 'creative-scenes',
        title: 'Confetti Dual Cannons',
        description: 'Two side cannons fire confetti upward at 45 degrees from opposite edges.',
        runType: 'sequence',
        launches: [
            { delayMs: 0, targetXRatio: -0.02, targetYRatio: 0.5, options: { burstForms: { directionDeg: 45 } } },
            { delayMs: 0, targetXRatio: 1.01, targetYRatio: 0.5, options: { burstForms: { directionDeg: 135 } } },
        ],
        supportsColorModes: false,
        recipeOptions: {
            timeScale: 3,
            rocket: { enabled: false },
            rocketTailEmbers: { enabled: false },
            burstForms: {
                enabled: true,
                shape: 'circle|square',
                colorMode: 'palette',
                count: 110,
                speedMin: 100,
                speedMax: 700,
                coneDeg: 40,
                gravity: 95,
                lifeMin: 4.0,
                lifeMax: 7.4,
                sizeMin: 3.1,
                sizeMax: 4.2,
                wobble: 0.42,
                spin: 0.3,
                spinCoverage: 0.92,
                highlight: 0.8,
                highlightAngleDeg: 20,
                highlightWidth: 0.3,
            },
            burstSparks: { enabled: false },
            burstCenterFlash: { enabled: false },
            burstTwinkleCloud: { enabled: false },
        },
    },
    {
        id: 'confetti-tricolor-stream',
        sectionId: 'creative-scenes',
        title: 'Confetti Tricolor Stream',
        description: 'Two side tricolor streams (Spain and Italy) run for 5 seconds with narrow cone layers.',
        runType: 'sequence',
        launches: [
            { delayMs: 0, targetXRatio: -0.02, targetYRatio: 0.5, options: { burstForms: { singleColor: '#a81317', directionDeg: 50 } } },
            { delayMs: 0, targetXRatio: -0.02, targetYRatio: 0.5, options: { burstForms: { singleColor: '#f2b801', directionDeg: 40 } } },
            { delayMs: 0, targetXRatio: -0.02, targetYRatio: 0.5, options: { burstForms: { singleColor: '#f2b801', directionDeg: 30 } } },
            { delayMs: 0, targetXRatio: -0.02, targetYRatio: 0.5, options: { burstForms: { singleColor: '#a81317', directionDeg: 20 } } },
            { delayMs: 0, targetXRatio: 1.01, targetYRatio: 0.5, options: { burstForms: { singleColor: '#009346', directionDeg: 130 } } },
            { delayMs: 0, targetXRatio: 1.01, targetYRatio: 0.5, options: { burstForms: { singleColor: '#ffffff', directionDeg: 145 } } },
            { delayMs: 0, targetXRatio: 1.01, targetYRatio: 0.5, options: { burstForms: { singleColor: '#ce2b37', directionDeg: 160 } } },
        ],
        supportsColorModes: false,
        recipeOptions: {
            timeScale: 3,
            rocket: { enabled: false },
            rocketTailEmbers: { enabled: false },
            burstForms: {
                enabled: true,
                shape: 'circle|square',
                colorMode: 'single',
                singleColor: '#a81317',
                count: 30,
                speedMin: 100,
                speedMax: 900,
                directionDeg: 50,
                coneDeg: 12,
                gravity: 0,
                lifeMin: 2.8,
                lifeMax: 2.8,
                sizeMin: 3.0,
                sizeMax: 4.2,
                wobble: 0.42,
                spin: 0.28,
                spinCoverage: 0.92,
                highlight: 0.8,
                highlightAngleDeg: 20,
                highlightWidth: 0.3,
            },
            burstSparks: { enabled: false },
            burstCenterFlash: { enabled: false },
            burstTwinkleCloud: { enabled: false },
        },
    },
    {
        id: 'snow-fall',
        sectionId: 'creative-scenes',
        title: 'Snow Fall',
        description: 'A forms-only glyph snowfall profile with weighted white/blue palette and airy wobble.',
        runType: 'single',
        supportsColorModes: false,
        recipeOptions: {
            timeScale: 1,
            sizeScale: 1,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: true,
                shape: 'glyph',
                glyph: '❄•',
                colorMode: 'palette',
                palette: ['#ffffff', '#ffffff', '#ffffff', '#80dfff'],
                count: 1,
                speedMin: 0,
                speedMax: 0,
                coneDeg: 20,
                gravity: 60,
                lifeMin: 12,
                lifeMax: 140,
                sizeMin: 1.6,
                sizeMax: 4.0,
                wobble: 0.9,
                spin: 0.6,
                spinCoverage: 0.25,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
    },
    {
        id: 'leaf-fall',
        sectionId: 'creative-scenes',
        title: 'Leaf Fall',
        description: 'A warm falling-leaf scene using UTF glyphs with airy wobble, intermittent spin, and no highlight effect.',
        runType: 'single',
        supportsColorModes: false,
        recipeOptions: {
            timeScale: 1,
            sizeScale: 1,
            rocket: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: false,
            },
            burstForms: {
                enabled: true,
                shape: 'glyph',
                glyph: '🍂🍁',
                colorMode: 'palette',
                palette: ['#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#f6c453', '#e98b2a', '#b85f1f', '#8f3f16', '#ff4d4d', '#c1ff00'],
                count: 1,
                speedMin: 0,
                speedMax: 0,
                gravity: 75,
                lifeMin: 20,
                lifeMax: 150,
                sizeMin: 3,
                sizeMax: 6,
                wobble: 0.9,
                spin: 0.1,
                spinCoverage: 0.6,
                spinDuration: 6,
                spinPause: 6,
                highlight: 0,
            },
            burstSparks: {
                enabled: false,
            },
            burstCenterFlash: {
                enabled: false,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
    },
    {
        id: 'circle-forms',
        sectionId: 'single-fireworks',
        title: 'Circle Forms',
        description: 'A single rocket with circle forms only and no sparks.',
        runType: 'single',
        supportsColorModes: true,
        colorModeIds: ['palette', 'rgb', 'single-red'],
        recipeOptions: {
            burstForms: {
                shape: 'circle',
            },
            burstSparks: {
                enabled: false,
            },
        },
    },
    {
        id: 'glyph-forms',
        sectionId: 'single-fireworks',
        title: 'Glyph Forms',
        description: 'A single rocket with glyph forms only and no sparks.',
        runType: 'single',
        supportsColorModes: true,
        colorModeIds: ['palette', 'rgb', 'single-red'],
        recipeOptions: {
            burstForms: {
                shape: 'glyph',
                glyph: DEFAULT_GLYPH,
            },
            burstSparks: {
                enabled: false,
            },
        },
    },
    {
        id: 'meteor-rain',
        sectionId: 'creative-scenes',
        title: 'Meteor Rain',
        description: 'A falling meteor sequence launched from random top start points into the top edge of this card editor area.',
        runType: 'sequence',
        launches: [
            { delayMs: 0, startXRatio: 0.16, startYRatio: -0.10, targetXRatio: 0.28, targetYRatio: 0.66, options: {} },
            { delayMs: 120, startXRatio: 0.62, startYRatio: -0.14, targetXRatio: 0.56, targetYRatio: 0.58, options: {} },
            { delayMs: 240, startXRatio: 0.40, startYRatio: -0.08, targetXRatio: 0.72, targetYRatio: 0.62, options: {} },
            { delayMs: 360, startXRatio: 0.84, startYRatio: -0.12, targetXRatio: 0.68, targetYRatio: 0.70, options: {} },
            { delayMs: 480, startXRatio: 0.26, startYRatio: -0.16, targetXRatio: 0.38, targetYRatio: 0.64, options: {} },
            { delayMs: 600, startXRatio: 0.52, startYRatio: -0.06, targetXRatio: 0.46, targetYRatio: 0.60, options: {} },
        ],
        recipeOptions: {
            timeScale: 1.35,
            sizeScale: 1.0,
            burstForms: {
                enabled: true,
                colorMode: 'palette',
                palette: ['#ffd166', '#ff9f1c'],
                count: 5,
                directionDeg: 90,
                coneDeg: 100,
                gravity: 200,
                lifeMin: 0.5,
                lifeMax: 0.5,
            },
            burstSparks: {
                enabled: true,
                colorMode: 'palette',
                palette: ['#fff3c4', '#ffd166', '#ff9f1c', '#ff6b35', '#f94144', '#b51717'],
                gravity: 0,
                shape: 'fade',
                count: 50,
                directionDeg: 90,
                coneDeg: 180,
                length: 24,
                tailScale: 1.8,
                speedMin: 20,
                speedMax: 220,
                thickness: 2.5,
                lifeMax: 0.25,
            },
            burstCenterFlash: {
                startSize: 50,
                endSize: 2,
                peakAlpha: 0.6,
                attack: 0.1,
                colorMode: 'single',
                color: '#ffe8b0',
                innerStop: 0.5,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
            rocketTailEmbers: {
                enabled: true,
                count: 8,
                spreadY: 26,
            },
            rocket: {
                colorMode: 'single',
                singleColor: '#dff6ff',
                duration: 1.1,
                thickness: 1.3,
            },
        },
    },
    {
        id: 'rocket-bloom',
        sectionId: 'creative-scenes',
        title: 'Rocket Bloom',
        description: 'One rocket opens into a wide child-rocket bloom, with each child finishing in a compact spark burst.',
        runType: 'single',
        supportsColorModes: false,
        recipeOptions: {
            rocket: {
                cascade: {
                    mode: 'rocket',
                    bursts: 16,
                    childBursts: 1,
                    childSpeedMin: 400,
                    delay: 160,
                    spreadX: 232,
                    spreadY: 239,
                },
            },
            burstForms: {
                enabled: false,
            },
            burstSparks: {
                count: 54,
                tailScale: 1,
                thickness: 1,
                speedMin: 108,
                speedMax: 284,
                directionDeg: 0,
                gravity: 180,
                lifeMin: 0.8,
                lifeMax: 1.4,
            },
            burstTwinkleCloud: {
                enabled: false,
            },
        },
    },
    {
        id: 'clock-ring',
        sectionId: 'firework-series',
        title: 'Clock Ring',
        description: 'Twelve rockets launch from clock-hour positions outside the screen and burst early into a ring around the center.',
        runType: 'sequence',
        launches: buildClockRingLaunches(),
    },
    {
        id: 'finale-run',
        sectionId: 'firework-series',
        title: 'Finale Run',
        description: 'A compact celebratory sequence with quick rocket timing.',
        runType: 'sequence',
        launches: [
            { delayMs: 0, targetXRatio: 0.20, targetYRatio: 0.42, options: {} },
            { delayMs: 90, targetXRatio: 0.36, targetYRatio: 0.32, options: {} },
            { delayMs: 180, targetXRatio: 0.50, targetYRatio: 0.24, options: {} },
            { delayMs: 270, targetXRatio: 0.64, targetYRatio: 0.32, options: {} },
            { delayMs: 360, targetXRatio: 0.80, targetYRatio: 0.40, options: {} },
        ],
    },
    {
        id: 'firework-show',
        sectionId: 'firework-series',
        title: 'Firework Show',
        description: 'A staged show: simple rockets, synchronized single-color salvos, cascade build-up, and a sky-wide finale cascade.',
        runType: 'sequence',
        launches: [
            {
                delayMs: 0,
                targetXRatio: 0.30,
                targetYRatio: 0.48,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#7dd3fc', duration: 0.88 },
                    burstForms: { enabled: false },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#7dd3fc', count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 },
                    burstCenterFlash: { enabled: false },
                    burstTwinkleCloud: { enabled: false },
                },
            },
            {
                delayMs: 140,
                targetXRatio: 0.50,
                targetYRatio: 0.48,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#fda4af', duration: 0.88 },
                    burstForms: { enabled: false },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#fda4af', count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 },
                    burstCenterFlash: { enabled: false },
                    burstTwinkleCloud: { enabled: false },
                },
            },
            {
                delayMs: 280,
                targetXRatio: 0.70,
                targetYRatio: 0.48,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#7dd3fc', duration: 0.88 },
                    burstForms: { enabled: false },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#7dd3fc', count: 42, length: 20, tailScale: 1.2, speedMin: 90, speedMax: 190, lifeMin: 0.6, lifeMax: 0.95 },
                    burstCenterFlash: { enabled: false },
                    burstTwinkleCloud: { enabled: false },
                },
            },
            {
                delayMs: 500,
                targetXRatio: 0.20,
                targetYRatio: 0.36,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#31a03f' },
                    burstForms: { enabled: true, colorMode: 'single', singleColor: '#31a03f', count: 22, speedMin: 110, speedMax: 240 },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#31a03f', count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 },
                    burstCenterFlash: { enabled: true, colorMode: 'single', color: '#31a03f', peakAlpha: 0.32 },
                },
            },
            {
                delayMs: 500,
                targetXRatio: 0.38,
                targetYRatio: 0.30,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#df2327' },
                    burstForms: { enabled: true, colorMode: 'single', singleColor: '#df2327', count: 22, speedMin: 110, speedMax: 240 },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#df2327', count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 },
                    burstCenterFlash: { enabled: true, colorMode: 'single', color: '#df2327', peakAlpha: 0.32 },
                },
            },
            {
                delayMs: 500,
                targetXRatio: 0.62,
                targetYRatio: 0.30,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#f6f011' },
                    burstForms: { enabled: true, colorMode: 'single', singleColor: '#f6f011', count: 22, speedMin: 110, speedMax: 240 },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#f6f011', count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 },
                    burstCenterFlash: { enabled: true, colorMode: 'single', color: '#f6f011', peakAlpha: 0.32 },
                },
            },
            {
                delayMs: 500,
                targetXRatio: 0.80,
                targetYRatio: 0.36,
                options: {
                    rocket: { colorMode: 'single', singleColor: '#23b6e6' },
                    burstForms: { enabled: true, colorMode: 'single', singleColor: '#23b6e6', count: 22, speedMin: 110, speedMax: 240 },
                    burstSparks: { enabled: true, colorMode: 'single', singleColor: '#23b6e6', count: 56, length: 26, tailScale: 1.5, speedMin: 120, speedMax: 280 },
                    burstCenterFlash: { enabled: true, colorMode: 'single', color: '#23b6e6', peakAlpha: 0.32 },
                },
            },
            {
                delayMs: 1000,
                targetXRatio: 0.34,
                targetYRatio: 0.28,
                options: {
                    rocket: { cascade: { bursts: 4, delay: 92, spreadX: 140, spreadY: 80 } },
                    burstForms: { enabled: true, count: 24 },
                    burstSparks: { enabled: true, count: 62 },
                    burstCenterFlash: { enabled: true },
                },
            },
            {
                delayMs: 1020,
                targetXRatio: 0.66,
                targetYRatio: 0.28,
                options: {
                    rocket: { cascade: { bursts: 4, delay: 92, spreadX: 140, spreadY: 80 } },
                    burstForms: { enabled: true, count: 24 },
                    burstSparks: { enabled: true, count: 62 },
                    burstCenterFlash: { enabled: true },
                },
            },
            {
                delayMs: 1500,
                targetXRatio: 0.50,
                targetYRatio: 0.18,
                options: {
                    timeScale: 1.08,
                    rocket: { colorMode: 'rgb', cascade: { bursts: 14, delay: 84, spreadX: 280, spreadY: 120 } },
                    burstForms: { enabled: true, colorMode: 'rgb', count: 28, speedMin: 130, speedMax: 320 },
                    burstSparks: { enabled: true, colorMode: 'rgb', count: 88, length: 30, tailScale: 1.9, speedMin: 140, speedMax: 320 },
                    burstCenterFlash: { enabled: true, colorMode: 'rgb', startSize: 56, endSize: 92, peakAlpha: 0.5 },
                    burstTwinkleCloud: { enabled: true, count: 260, radius: 130 },
                },
            },
        ],
    },
    {
        id: 'rocket-cascade',
        sectionId: 'cascades',
        title: 'Rocket Cascade',
        description: 'One rocket branches into directed child rockets, and each child resolves into its own burst cascade.',
        runType: 'single',
        recipeOptions: {
            rocket: {
                cascade: {
                    mode: 'rocket',
                    bursts: 6,
                    childBursts: 3,
                    delay: 90,
                    childSpeedMin: 100,
                    childSpeedMax: 150,
                    spreadX: 150,
                    spreadY: 300,
                    childDirectionDeg: 90,
                    childConeDeg: 360,
                },
            },
        },
    },
    {
        id: 'classic-cascade',
        sectionId: 'cascades',
        title: 'Classic Cascade',
        description: 'A readable cascade where each rocket continues into follow-up bursts.',
        runType: 'sequence',
        launches: [
            {
                delayMs: 0,
                targetXRatio: 0.18,
                targetYRatio: 0.42,
                options: {
                    rocket: {
                        cascade: {
                            bursts: 3,
                            delay: 90,
                            spreadX: 150,
                            spreadY: 70,
                        },
                    },
                },
            },
            {
                delayMs: 100,
                targetXRatio: 0.34,
                targetYRatio: 0.30,
                options: {
                    rocket: {
                        cascade: {
                            bursts: 3,
                            delay: 90,
                            spreadX: 150,
                            spreadY: 70,
                        },
                    },
                },
            },
            {
                delayMs: 900,
                targetXRatio: 0.50,
                targetYRatio: 0.24,
                options: {
                    rocket: {
                        cascade: {
                            bursts: 18,
                            delay: 96,
                            spreadX: 300,
                            spreadY: 100,
                        },
                    },
                },
            },
            {
                delayMs: 100,
                targetXRatio: 0.66,
                targetYRatio: 0.30,
                options: {
                    rocket: {
                        cascade: {
                            bursts: 3,
                            delay: 90,
                            spreadX: 150,
                            spreadY: 70,
                        },
                    },
                },
            },
            {
                delayMs: 0,
                targetXRatio: 0.82,
                targetYRatio: 0.42,
                options: {
                    rocket: {
                        cascade: {
                            bursts: 3,
                            delay: 90,
                            spreadX: 150,
                            spreadY: 70,
                        },
                    },
                },
            },
        ],
    },
]);

const EXAMPLES_GALLERY_RECIPE_MAP = new Map(
    EXAMPLES_GALLERY_RECIPES.map((recipe) => [recipe.id, recipe]),
);

export function resolveExamplesGalleryRecipe(recipeId) {
    return EXAMPLES_GALLERY_RECIPE_MAP.get(recipeId) || null;
}

export function resolveExamplesGalleryLaunchPlan(recipeId, colorModeId = 'palette') {
    const recipe = resolveExamplesGalleryRecipe(recipeId);
    if (!recipe) {
        return null;
    }

    const baseColorModeId = recipe.supportsColorModes ? colorModeId : null;
    const colorModeOverrides = recipe.supportsColorModes
        ? resolveSingleColorModeOverrides(baseColorModeId)
        : {};

    const buildLaunchOptions = (recipeOptions = {}) => {
        const baseOptions = recipe.runType === 'sequence' && recipe.sectionId === 'cascades'
            ? BASE_CASCADE_OPTIONS
            : BASE_SINGLE_LAUNCH_OPTIONS;

        return mergeOptions(
            baseOptions,
            colorModeOverrides,
            recipe.recipeOptions,
            recipeOptions,
        );
    };

    if (recipe.runType === 'single') {
        return {
            recipeId: recipe.id,
            sectionId: recipe.sectionId,
            runType: 'single',
            colorModeId: baseColorModeId,
            launches: [
                {
                    delayMs: 0,
                    targetXRatio: 0.5,
                    targetYRatio: 0.36,
                    options: buildLaunchOptions(),
                },
            ],
        };
    }

    return {
        recipeId: recipe.id,
        sectionId: recipe.sectionId,
        runType: 'sequence',
        colorModeId: null,
        launches: recipe.launches.map((launch) => ({
            ...launch,
            options: buildLaunchOptions(launch.options),
        })),
    };
}
