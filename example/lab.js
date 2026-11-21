import {
    createFireworksEngine,
    resolveFireworksEnginePreset,
} from '../src/index.js';
import {
    DEFAULT_FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH,
    DEFAULT_FIREWORKS_ENGINE_LAB_BURST_FORMS,
    DEFAULT_FIREWORKS_ENGINE_LAB_BURST_SPARKS,
    DEFAULT_FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD,
    DEFAULT_FIREWORKS_ENGINE_LAB_PERFORMANCE,
    FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS,
    FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS,
    DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET,
    DEFAULT_FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS,
    DEFAULT_FIREWORKS_ENGINE_LAB_SECTION_STATE,
    FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS,
    FIREWORKS_ENGINE_LAB_BURST_FORM_COLOR_MODES,
    FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES,
    FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS,
    FIREWORKS_ENGINE_LAB_BURST_SPARK_COLOR_MODES,
    FIREWORKS_ENGINE_LAB_BURST_SPARK_SHAPES,
    FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS,
    FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS,
    FIREWORKS_ENGINE_LAB_FLASH_COLOR_MODES,
    FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS,
    FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_MODES,
    FIREWORKS_ENGINE_LAB_ROCKET_COLOR_MODES,
    FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS,
    FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS,
    FIREWORKS_ENGINE_LAB_IMAGE_CELL_SIZE_BOUNDS,
    FIREWORKS_ENGINE_LAB_IMAGE_GRID_SPACING_BOUNDS,
    FIREWORKS_ENGINE_LAB_SHAPE_WEIGHT_BOUNDS,
    createDefaultFireworksEngineLabSettings,
    loadFireworksEngineLabSettings,
    saveFireworksEngineLabSettings,
} from './labPersistence.js';
import {
    buildBurstCenterFlashOptions,
    buildBurstFormsOptions,
    buildBurstSparksOptions,
    buildBurstTwinkleCloudOptions,
    buildPerformanceOptions,
    buildRocketOptions,
    buildRocketTailEmbersOptions,
    buildSettingsSnippet,
    resolveBurstFormPickedShapes,
    resolveBurstFormShapeTokens,
} from './snippetBuilders.js';
import {
    buildGridFrames,
    createDemoAtlas,
    loadImageFile,
    resolveGridCellAt,
    resolveGridLayout,
    selectFramesByCells,
} from './labImageAtlas.js';
import { showBurstMarker } from './burstMarkers.js';

const app = document.getElementById('app');

const PRESET_CARDS = Object.freeze([
    { id: 'base', label: 'BASE', accentClassName: 'accentGold' },
    { id: 'cascade', label: 'CASCADE', accentClassName: 'accentViolet' },
    { id: 'finale', label: 'FINALE', accentClassName: 'accentViolet' },
]);
const PRESET_LAUNCH_SOURCES = Object.freeze([
    { id: 'preset', label: 'Preset' },
    { id: 'lab', label: 'Lab' },
]);

const TARGET_MODE_HINT = 'Target mode armed. Tap or click outside controls to launch one rocket.';
const TARGET_MODE_IDLE_HINT = 'Target mode idle. Use Target mode, then tap or click outside controls to launch one rocket.';
const LAB_HINT = 'Quick preset launches live at the top. Choose Preset or Lab source. Stop clears the current launch. Use Effect settings for tempo, size, and performance.';
const EFFECT_SETTINGS_HINT = 'Tempo, size, and additive blend apply live. Burst queue applies on the next launch.';
const DEFAULT_STATUS_TEXT = 'Lab ready. Start a preset or arm target mode.';
const TARGET_LAUNCH_GESTURE_MAX_DISTANCE = 18;
const TARGET_LAUNCH_BURST_PALETTE = Object.freeze([
    '#ffd166', '#ff6b6b', '#4ecdc4', '#74c0fc', '#c77dff', '#ffffff',
]);

const EFFECT_SETTING_TOGGLES = Object.freeze([
    { id: 'additiveBlending', label: 'Additive blend' },
    { id: 'burstQueueThrottling', label: 'Burst queue', runtimeKey: 'enableBurstQueueThrottling' },
]);

const GLOBAL_TUNING_CONTROLS = Object.freeze([
    {
        id: 'timeScale',
        label: 'Tempo',
        min: FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS.min,
        max: FIREWORKS_ENGINE_LAB_TIME_SCALE_BOUNDS.max,
        step: 0.05,
    },
    {
        id: 'sizeScale',
        label: 'Size',
        min: FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS.min,
        max: FIREWORKS_ENGINE_LAB_SIZE_SCALE_BOUNDS.max,
        step: 0.05,
    },
]);

const ROCKET_TUNING_CONTROLS = Object.freeze([
    { id: 'streakLength', label: 'Streak length', min: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.streakLength.min, max: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.streakLength.max, step: 0.1 },
    { id: 'finalStreakLength', label: 'Final streak', min: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.finalStreakLength.min, max: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.finalStreakLength.max, step: 0.1 },
    { id: 'thickness', label: 'Core thickness', min: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.thickness.min, max: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.thickness.max, step: 0.05 },
    { id: 'speed', label: 'Flight speed', min: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.speed.min, max: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.speed.max, step: 1 },
    { id: 'duration', label: 'Flight duration', min: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.duration.min, max: FIREWORKS_ENGINE_LAB_ROCKET_BOUNDS.duration.max, step: 0.01 },
]);

const ROCKET_CASCADE_CONTROLS = Object.freeze([
    { id: 'bursts', label: 'Cascade bursts', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.bursts.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.bursts.max, step: 1 },
    { id: 'childBursts', label: 'Child bursts', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childBursts.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childBursts.max, step: 1 },
    { id: 'childSpeedMin', label: 'Child speed min', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMin.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMin.max, step: 1 },
    { id: 'childSpeedMax', label: 'Child speed max', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMax.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childSpeedMax.max, step: 1 },
    { id: 'childDurationMin', label: 'Child duration min', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMin.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMin.max, step: 0.01 },
    { id: 'childDurationMax', label: 'Child duration max', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMax.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDurationMax.max, step: 0.01 },
    { id: 'childDirectionDeg', label: 'Child direction', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDirectionDeg.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childDirectionDeg.max, step: 1 },
    { id: 'childConeDeg', label: 'Child cone', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childConeDeg.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.childConeDeg.max, step: 1 },
    { id: 'delay', label: 'Cascade delay', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.delay.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.delay.max, step: 1 },
    { id: 'spreadX', label: 'Cascade spread X', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.spreadX.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.spreadX.max, step: 1 },
    { id: 'spreadY', label: 'Cascade spread Y', min: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.spreadY.min, max: FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_BOUNDS.spreadY.max, step: 1 },
]);

const BURST_FORM_TUNING_CONTROLS = Object.freeze([
    { id: 'count', label: 'Count', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.count.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.count.max, step: 1 },
    { id: 'speedMin', label: 'Speed min', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.speedMin.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.speedMin.max, step: 1 },
    { id: 'speedMax', label: 'Speed max', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.speedMax.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.speedMax.max, step: 1 },
    { id: 'directionDeg', label: 'Direction', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.directionDeg.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.directionDeg.max, step: 1 },
    { id: 'coneDeg', label: 'Cone', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.coneDeg.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.coneDeg.max, step: 1 },
    { id: 'gravity', label: 'Gravity', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.gravity.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.gravity.max, step: 1 },
    { id: 'lifeMin', label: 'Life min', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.lifeMin.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.lifeMin.max, step: 0.05 },
    { id: 'lifeMax', label: 'Life max', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.lifeMax.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.lifeMax.max, step: 0.05 },
    { id: 'sizeMin', label: 'Size min', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.sizeMin.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.sizeMin.max, step: 0.05 },
    { id: 'sizeMax', label: 'Size max', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.sizeMax.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.sizeMax.max, step: 0.05 },
    { id: 'spin', label: 'Spin', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spin.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spin.max, step: 0.01 },
    { id: 'spinCoverage', label: 'Spin coverage', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinCoverage.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinCoverage.max, step: 0.01 },
    { id: 'spinDuration', label: 'Spin duration', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinDuration.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinDuration.max, step: 0.05 },
    { id: 'spinPause', label: 'Spin pause', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinPause.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.spinPause.max, step: 0.05 },
    { id: 'highlight', label: 'Highlight', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlight.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlight.max, step: 0.01 },
    { id: 'highlightAngleDeg', label: 'Highlight angle', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlightAngleDeg.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlightAngleDeg.max, step: 1 },
    { id: 'highlightWidth', label: 'Highlight width', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlightWidth.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.highlightWidth.max, step: 0.01 },
    { id: 'wobble', label: 'Wobble', min: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.wobble.min, max: FIREWORKS_ENGINE_LAB_BURST_FORMS_BOUNDS.wobble.max, step: 0.01 },
]);

const BURST_SPARK_TUNING_CONTROLS = Object.freeze([
    { id: 'count', label: 'Spark count', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.count.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.count.max, step: 1 },
    { id: 'length', label: 'Spark length', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.length.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.length.max, step: 0.1 },
    { id: 'tailScale', label: 'Tail scale', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.tailScale.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.tailScale.max, step: 0.05 },
    { id: 'thickness', label: 'Spark thickness', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.thickness.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.thickness.max, step: 0.05 },
    { id: 'speedMin', label: 'Spark speed min', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.speedMin.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.speedMin.max, step: 1 },
    { id: 'speedMax', label: 'Spark speed max', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.speedMax.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.speedMax.max, step: 1 },
    { id: 'directionDeg', label: 'Spark direction', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.directionDeg.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.directionDeg.max, step: 1 },
    { id: 'coneDeg', label: 'Spark cone', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.coneDeg.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.coneDeg.max, step: 1 },
    { id: 'gravity', label: 'Spark gravity', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.gravity.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.gravity.max, step: 1 },
    { id: 'lifeMin', label: 'Spark life min', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.lifeMin.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.lifeMin.max, step: 0.05 },
    { id: 'lifeMax', label: 'Spark life max', min: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.lifeMax.min, max: FIREWORKS_ENGINE_LAB_BURST_SPARKS_BOUNDS.lifeMax.max, step: 0.05 },
]);

const ROCKET_TAIL_EMBER_TUNING_CONTROLS = Object.freeze([
    { id: 'count', label: 'Count', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.count.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.count.max, step: 1 },
    { id: 'brightness', label: 'Brightness', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.brightness.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.brightness.max, step: 0.05 },
    { id: 'fade', label: 'Fade', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.fade.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.fade.max, step: 0.05 },
    { id: 'spreadX', label: 'Spread X', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.spreadX.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.spreadX.max, step: 0.1 },
    { id: 'spreadY', label: 'Spread Y', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.spreadY.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.spreadY.max, step: 1 },
    { id: 'speed', label: 'Speed', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.speed.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.speed.max, step: 0.1 },
    { id: 'size', label: 'Size', min: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.size.min, max: FIREWORKS_ENGINE_LAB_ROCKET_TAIL_EMBERS_BOUNDS.size.max, step: 0.05 },
]);

const BURST_CENTER_FLASH_TUNING_CONTROLS = Object.freeze([
    { id: 'startSize', label: 'Start size', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.startSize.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.startSize.max, step: 1 },
    { id: 'endSize', label: 'End size', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.endSize.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.endSize.max, step: 1 },
    { id: 'peakAlpha', label: 'Peak alpha', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.peakAlpha.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.peakAlpha.max, step: 0.1 },
    { id: 'attack', label: 'Attack', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.attack.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.attack.max, step: 0.01 },
    { id: 'fade', label: 'Fade', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.fade.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.fade.max, step: 0.01 },
    { id: 'innerStop', label: 'Inner stop', min: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.innerStop.min, max: FIREWORKS_ENGINE_LAB_BURST_CENTER_FLASH_BOUNDS.innerStop.max, step: 0.05 },
]);

const BURST_TWINKLE_CLOUD_TUNING_CONTROLS = Object.freeze([
    { id: 'count', label: 'Count', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.count.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.count.max, step: 1 },
    { id: 'radius', label: 'Cloud radius', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.radius.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.radius.max, step: 0.1 },
    { id: 'startDelay', label: 'Start delay', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.startDelay.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.startDelay.max, step: 0.01 },
    { id: 'duration', label: 'Cloud duration', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.duration.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.duration.max, step: 0.01 },
    { id: 'twinkleLife', label: 'Twinkle life', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.twinkleLife.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.twinkleLife.max, step: 0.01 },
    { id: 'brightness', label: 'Brightness', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.brightness.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.brightness.max, step: 0.1 },
    { id: 'size', label: 'Size', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.size.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.size.max, step: 0.1 },
    { id: 'spawnSpread', label: 'Spawn spread', min: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.spawnSpread.min, max: FIREWORKS_ENGINE_LAB_BURST_TWINKLE_CLOUD_BOUNDS.spawnSpread.max, step: 0.1 },
]);

const SHAPE_WEIGHT_STEP = 0.1;
const IMAGE_CELL_SIZE_CONTROL = Object.freeze({
    id: 'imageCellSize',
    label: 'Atlas cell size',
    min: FIREWORKS_ENGINE_LAB_IMAGE_CELL_SIZE_BOUNDS.min,
    max: FIREWORKS_ENGINE_LAB_IMAGE_CELL_SIZE_BOUNDS.max,
    step: 1,
});
function buildGridSpacingControl(id, label) {
    return {
        id,
        label,
        min: FIREWORKS_ENGINE_LAB_IMAGE_GRID_SPACING_BOUNDS.min,
        max: FIREWORKS_ENGINE_LAB_IMAGE_GRID_SPACING_BOUNDS.max,
        step: 1,
    };
}
const IMAGE_GRID_CONTROLS = Object.freeze([
    IMAGE_CELL_SIZE_CONTROL,
    buildGridSpacingControl('imageGridOffsetX', 'Grid offset X'),
    buildGridSpacingControl('imageGridOffsetY', 'Grid offset Y'),
    buildGridSpacingControl('imageGridGapX', 'Gap X'),
    buildGridSpacingControl('imageGridGapY', 'Gap Y'),
]);
const IMAGE_GRID_PATHS = new Set(IMAGE_GRID_CONTROLS.map((control) => `burstForms.${control.id}`));
const BURST_EVENT_LOG_LIMIT = 12;
const VICTORY_TRACKING_LAUNCH = Object.freeze({ trackBurstSequence: true, sizeScale: 1.05, timeScale: 0.95 });

function buildShapeWeightControl(shapeToken) {
    return {
        id: shapeToken,
        label: `${shapeToken} weight`,
        min: FIREWORKS_ENGINE_LAB_SHAPE_WEIGHT_BOUNDS.min,
        max: FIREWORKS_ENGINE_LAB_SHAPE_WEIGHT_BOUNDS.max,
        step: SHAPE_WEIGHT_STEP,
    };
}

const RANGE_CONTROL_BY_PATH = new Map([
    ...IMAGE_GRID_CONTROLS.map((control) => [`burstForms.${control.id}`, control]),
    ...['circle', 'square', 'rectangle', 'glyph', 'image'].map((shapeToken) => [
        `burstForms.shapeWeights.${shapeToken}`,
        buildShapeWeightControl(shapeToken),
    ]),
    ...GLOBAL_TUNING_CONTROLS.map((control) => [control.id, control]),
    ...ROCKET_TUNING_CONTROLS.map((control) => [`rocket.${control.id}`, control]),
    ...ROCKET_CASCADE_CONTROLS.map((control) => [`rocket.cascade.${control.id}`, control]),
    ...BURST_FORM_TUNING_CONTROLS.map((control) => [`burstForms.${control.id}`, control]),
    ...BURST_SPARK_TUNING_CONTROLS.map((control) => [`burstSparks.${control.id}`, control]),
    ...ROCKET_TAIL_EMBER_TUNING_CONTROLS.map((control) => [`rocketTailEmbers.${control.id}`, control]),
    ...BURST_CENTER_FLASH_TUNING_CONTROLS.map((control) => [`burstCenterFlash.${control.id}`, control]),
    ...BURST_TWINKLE_CLOUD_TUNING_CONTROLS.map((control) => [`burstTwinkleCloud.${control.id}`, control]),
]);

let settings = loadFireworksEngineLabSettings();
let statusText = DEFAULT_STATUS_TEXT;
let isTargetModeEnabled = false;
let runtimeRef = null;
let targetLaunchGesture = null;
let presetLaunchSource = 'preset';
// Image frames are not persisted: the demo atlas is rebuilt, a loaded file must be loaded again.
let labAtlas = createLabDemoAtlas(settings.burstForms.imageCellSize);
let burstEventLog = [];
let burstEventCount = 0;
let showBurstMarkers = true;
let trackedVictoryRuntime = null;
let trackedVictoryStatus = 'Not launched yet.';

function createLabDemoAtlas(cellSize) {
    const source = createDemoAtlas(cellSize);
    return { label: 'Demo atlas (8 elements)', source, objectUrl: null, frames: buildGridFrames(source, cellSize) };
}

// Grid of a loaded atlas. The demo atlas is drawn without margins, so it always uses a plain grid.
function resolveLabGrid() {
    if (!labAtlas?.objectUrl) {
        return {};
    }
    const { imageGridOffsetX, imageGridOffsetY, imageGridGapX, imageGridGapY } = settings.burstForms;
    return { offsetX: imageGridOffsetX, offsetY: imageGridOffsetY, gapX: imageGridGapX, gapY: imageGridGapY };
}

function rebuildLabAtlasFrames() {
    if (!labAtlas.objectUrl) {
        labAtlas = createLabDemoAtlas(settings.burstForms.imageCellSize);
        return;
    }
    labAtlas = { ...labAtlas, frames: buildGridFrames(labAtlas.source, settings.burstForms.imageCellSize, resolveLabGrid()) };
}

function resolveActiveImageGroup() {
    const { imageGroups, imageGroup } = settings.burstForms;
    return imageGroups.find((group) => group.name === imageGroup) ?? null;
}

// Frames used by launches: the active group's cells, or every non-empty cell without a group.
function resolveActiveImageFrames() {
    const group = resolveActiveImageGroup();
    return group ? selectFramesByCells(labAtlas.frames, group.cells) : labAtlas.frames;
}

function buildLabBurstFormsOptions(burstForms) {
    return {
        ...buildBurstFormsOptions(burstForms),
        images: resolveActiveImageFrames(),
    };
}

function updateImageGroups(nextGroups, nextActiveName = settings.burstForms.imageGroup) {
    settings.burstForms.imageGroups = nextGroups;
    settings.burstForms.imageGroup = nextActiveName;
    saveSettings();
    render();
}

function createImageGroup(rawName) {
    const name = String(rawName ?? '').trim();
    if (!name) {
        updateStatus('Type a group name first, e.g. bamboo or seasons.');
        return;
    }
    if (settings.burstForms.imageGroups.some((group) => group.name === name)) {
        updateImageGroups(settings.burstForms.imageGroups, name);
        return;
    }
    updateImageGroups([...settings.burstForms.imageGroups, { name, cells: [] }], name);
    statusText = `Group "${name}" created. Click cells in the atlas preview to add them.`;
    render();
}

function deleteActiveImageGroup() {
    const group = resolveActiveImageGroup();
    if (!group) {
        return;
    }
    updateImageGroups(settings.burstForms.imageGroups.filter((entry) => entry !== group), '');
}

function toggleCellInActiveGroup(cellIndex) {
    const group = resolveActiveImageGroup();
    if (!group) {
        updateStatus('Select or create a group first: cells are picked into the active group.');
        return;
    }
    if (!labAtlas.frames.some((frame) => frame.cellIndex === cellIndex)) {
        updateStatus(`Cell ${cellIndex} is empty and cannot be used.`);
        return;
    }
    const cells = group.cells.includes(cellIndex)
        ? group.cells.filter((cell) => cell !== cellIndex)
        : [...group.cells, cellIndex].sort((left, right) => left - right);
    updateImageGroups(settings.burstForms.imageGroups.map((entry) => (entry === group ? { ...entry, cells } : entry)));
}

function formatBurstEvent(entry) {
    const parts = [`#${entry.number}`, entry.source, `x ${Math.round(entry.x)}`, `y ${Math.round(entry.y)}`];
    if (entry.sequence) {
        parts.push(`index ${entry.sequence.index}`);
        if (entry.sequence.isFirst) parts.push('FIRST');
        if (entry.sequence.isLast) parts.push('LAST');
    }
    return parts.join(' · ');
}

function renderBurstEventLogItems() {
    if (burstEventLog.length === 0) {
        return '<li class="burstEventEmpty">No bursts yet.</li>';
    }
    return burstEventLog.map((entry) => {
        const boundary = entry.sequence?.isFirst || entry.sequence?.isLast;
        return `<li class="burstEventItem${boundary ? ' burstEventBoundary' : ''}">${escapeHtml(formatBurstEvent(entry))}</li>`;
    }).join('');
}

function refreshBurstEventPanel() {
    const list = app.querySelector('[data-burst-event-log]');
    if (list) list.innerHTML = renderBurstEventLogItems();
    const counter = app.querySelector('[data-burst-event-count]');
    if (counter) counter.textContent = String(burstEventCount);
    const victoryStatus = app.querySelector('[data-victory-status]');
    if (victoryStatus) victoryStatus.textContent = trackedVictoryStatus;
}

// onBurst runs synchronously inside the engine loop: keep it cheap, no full re-render.
function recordBurst(source, { x, y, sequence }) {
    burstEventCount += 1;
    burstEventLog = [{ number: burstEventCount, source, x, y, sequence }, ...burstEventLog].slice(0, BURST_EVENT_LOG_LIMIT);
    if (showBurstMarkers) {
        showBurstMarker(x, y, sequence);
    }
    refreshBurstEventPanel();
}

function destroyTrackedVictoryRuntime() {
    trackedVictoryRuntime?.destroy();
    trackedVictoryRuntime = null;
}

// Tracking accepts only default engine settings, so the tracked launch uses its own engine
// instead of the lab-configured one (which would return false).
function launchTrackedVictory() {
    destroyTrackedVictoryRuntime();
    trackedVictoryRuntime = createFireworksEngine({
        canvas: { appendTarget: document.body, maxDevicePixelRatio: 2, zIndex: 25 },
        onBurst: (event) => recordBurst('victory', event),
    });
    const accepted = trackedVictoryRuntime.launchPresetAt(
        'victory-finale',
        window.innerWidth * 0.5,
        window.innerHeight * 0.35,
        VICTORY_TRACKING_LAUNCH,
    );
    trackedVictoryStatus = accepted
        ? 'victory-finale launched with trackBurstSequence: FIRST and LAST bursts are marked.'
        : 'Launch rejected: tracking supports only the documented victory configuration.';
    refreshBurstEventPanel();
}

function destroyRuntime() {
    runtimeRef?.destroy();
    runtimeRef = null;
}

function applyLiveLabToggles(runtime, currentSettings) {
    if (!runtime) {
        return;
    }

    runtime.enableAdditiveBlending = currentSettings.performance.additiveBlending !== false;
}

function createLabRuntime() {
    destroyRuntime();
    runtimeRef = createFireworksEngine({
        ...buildRuntimeOptions(settings),
        onBurst: (event) => recordBurst('lab', event),
    });
    applyLiveLabToggles(runtimeRef, settings);
    return runtimeRef;
}

function saveSettings() {
    settings = saveFireworksEngineLabSettings(settings);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getByPath(object, path) {
    return path.split('.').reduce((current, part) => current?.[part], object);
}

function setByPath(object, path, nextValue) {
    const parts = path.split('.');
    let current = object;
    for (let index = 0; index < parts.length - 1; index += 1) {
        current = current[parts[index]];
    }
    current[parts[parts.length - 1]] = nextValue;
}

function toggleBurstFormShape(shapeValue, shapeToken, isEnabled) {
    const nextSelection = new Set(resolveBurstFormShapeTokens(shapeValue));
    if (isEnabled) {
        nextSelection.add(shapeToken);
    } else {
        nextSelection.delete(shapeToken);
    }

    if (nextSelection.size === 0) {
        return shapeValue;
    }

    return FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES
        .filter((token) => nextSelection.has(token))
        .join('|');
}

function resolveControlValue(control, value) {
    if (Number.isFinite(value)) {
        return value;
    }
    return 0;
}

function formatTuningValue(control, value) {
    const resolvedValue = resolveControlValue(control, value);
    const digits = control.step >= 1 ? 0 : control.step < 0.1 ? 2 : 1;
    return resolvedValue.toFixed(digits);
}

function renderSettingLabel(label, shortKey, fullPath) {
    return `
        <span class="tuningLabel">
            <span class="tuningLabelMain">${escapeHtml(label)}</span>
            <span class="tuningLabelKey">(${escapeHtml(shortKey)})</span>
            <button
                type="button"
                class="tuningInfoIcon"
                data-action="copy-setting-path"
                data-copy-path="${escapeHtml(fullPath)}"
                title="Copy ${escapeHtml(fullPath)}"
                aria-label="Copy setting path ${escapeHtml(fullPath)}"
            >i</button>
        </span>
    `;
}

function buildRuntimeOptions(currentSettings) {
    return {
        timeScale: currentSettings.timeScale,
        sizeScale: currentSettings.sizeScale,
        canvas: {
            appendTarget: document.body,
            maxDevicePixelRatio: 2,
            zIndex: 24,
        },
        performance: buildPerformanceOptions(currentSettings.performance),
        rocket: buildRocketOptions(currentSettings.rocket),
        rocketTailEmbers: buildRocketTailEmbersOptions(currentSettings.rocketTailEmbers),
        burstForms: buildLabBurstFormsOptions(currentSettings.burstForms),
        burstSparks: buildBurstSparksOptions(currentSettings.burstSparks),
        burstCenterFlash: buildBurstCenterFlashOptions(currentSettings.burstCenterFlash),
        burstTwinkleCloud: buildBurstTwinkleCloudOptions(currentSettings.burstTwinkleCloud),
    };
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    } finally {
        document.body.removeChild(textarea);
    }

    return copied;
}

async function copyTextToClipboard(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to the legacy fallback below.
    }

    return fallbackCopyText(text);
}

async function copySettingsSnippet() {
    const snippet = buildSettingsSnippet(settings);
    try {
        if (!(await copyTextToClipboard(snippet))) {
            throw new Error('Clipboard fallback failed.');
        }
        updateStatus('Copied a plug-and-play snippet with current lab settings.');
    } catch {
        updateStatus('Could not copy the snippet. Clipboard access is blocked in this context.');
    }
}

async function copySettingPath(path) {
    try {
        if (!(await copyTextToClipboard(path))) {
            throw new Error('Clipboard fallback failed.');
        }
        updateStatus(`Copied setting path: ${path}.`);
    } catch {
        updateStatus('Could not copy the setting path. Clipboard access is blocked in this context.');
    }
}

function buildTargetLaunchOptions(currentSettings) {
    return {
        timeScale: currentSettings.timeScale,
        sizeScale: currentSettings.sizeScale,
        count: 1,
        palette: TARGET_LAUNCH_BURST_PALETTE,
        burstPalette: TARGET_LAUNCH_BURST_PALETTE,
        rocket: buildRocketOptions(currentSettings.rocket),
        rocketTailEmbers: buildRocketTailEmbersOptions(currentSettings.rocketTailEmbers),
        burstForms: buildLabBurstFormsOptions(currentSettings.burstForms),
        burstSparks: buildBurstSparksOptions(currentSettings.burstSparks),
        burstCenterFlash: buildBurstCenterFlashOptions(currentSettings.burstCenterFlash),
        burstTwinkleCloud: buildBurstTwinkleCloudOptions(currentSettings.burstTwinkleCloud),
    };
}

function buildPresetLaunchOptions(presetId, currentSettings) {
    const preset = resolveFireworksEnginePreset(presetId);
    if (presetLaunchSource === 'preset') {
        return preset;
    }

    const startConfig = preset.mode === 'rocket'
        ? {
            mode: 'rocket',
            rocketCount: preset.rocketCount,
            rocketDelay: preset.rocketDelay,
            totalDuration: preset.totalDuration,
        }
        : {
            mode: 'burst',
            bursts: preset.bursts,
            duration: preset.duration,
        };

    return {
        ...startConfig,
        timeScale: currentSettings.timeScale,
        sizeScale: currentSettings.sizeScale,
        rocket: buildRocketOptions(currentSettings.rocket),
        rocketTailEmbers: buildRocketTailEmbersOptions(currentSettings.rocketTailEmbers),
        burstForms: buildLabBurstFormsOptions(currentSettings.burstForms),
        burstSparks: buildBurstSparksOptions(currentSettings.burstSparks),
        burstCenterFlash: buildBurstCenterFlashOptions(currentSettings.burstCenterFlash),
        burstTwinkleCloud: buildBurstTwinkleCloudOptions(currentSettings.burstTwinkleCloud),
    };
}

function updateStatus(nextStatus) {
    statusText = nextStatus;
    render();
}

function updateSetting(path, value) {
    setByPath(settings, path, value);
    saveSettings();

    if (path === 'performance.additiveBlending') {
        applyLiveLabToggles(runtimeRef, settings);
    } else if (path === 'timeScale' || path === 'sizeScale') {
        runtimeRef?.updateOptions({
            timeScale: settings.timeScale,
            sizeScale: settings.sizeScale,
        });
    }

    render();
}

function updateRangeSetting(path, value, inputElement) {
    setByPath(settings, path, value);
    saveSettings();

    const control = RANGE_CONTROL_BY_PATH.get(path);
    if (!control || !(inputElement instanceof HTMLInputElement)) {
        return;
    }

    const tuningControl = inputElement.closest('.tuningControl');
    const tuningValue = tuningControl?.querySelector('.tuningValue');
    if (!(tuningValue instanceof HTMLElement)) {
        return;
    }

    tuningValue.textContent = formatTuningValue(control, value);

    if (path === 'timeScale' || path === 'sizeScale') {
        runtimeRef?.updateOptions({
            timeScale: settings.timeScale,
            sizeScale: settings.sizeScale,
        });
    }

    if (path === 'rocket.speed') {
        const durationInput = app.querySelector('[data-path="rocket.duration"]');
        const durationControl = durationInput?.closest('.tuningControl');
        const isDurationDisabled = settings.rocket.speed > 0;
        if (durationInput instanceof HTMLInputElement) {
            durationInput.disabled = isDurationDisabled;
        }
        durationControl?.classList.toggle('tuningControlDisabled', isDurationDisabled);
    }

    if (path === 'rocket.cascade.childSpeedMin' || path === 'rocket.cascade.childSpeedMax') {
        const isDurationDisabled = settings.rocket.cascade.childSpeedMin > 0
            || settings.rocket.cascade.childSpeedMax > 0;
        ['rocket.cascade.childDurationMin', 'rocket.cascade.childDurationMax'].forEach((durationPath) => {
            const durationInput = app.querySelector(`[data-path="${durationPath}"]`);
            const durationControl = durationInput?.closest('.tuningControl');
            if (durationInput instanceof HTMLInputElement) {
                durationInput.disabled = isDurationDisabled;
            }
            durationControl?.classList.toggle('tuningControlDisabled', isDurationDisabled);
        });
    }
}

function updateColorSetting(path, value, inputElement) {
    setByPath(settings, path, value);
    saveSettings();

    const colorField = inputElement.closest('.colorField');
    const tuningValue = colorField?.querySelector('.tuningValue');
    if (!(tuningValue instanceof HTMLElement)) {
        return;
    }

    tuningValue.textContent = String(value).toUpperCase();
}

function updateTextSetting(path, value, inputElement) {
    setByPath(settings, path, value);
    saveSettings();

    const textField = inputElement.closest('.glyphField');
    const tuningValue = textField?.querySelector('.tuningValue');
    if (!(tuningValue instanceof HTMLElement)) {
        return;
    }

    tuningValue.textContent = String(value);
}

function toggleSection(sectionId, isOpen) {
    settings.sectionState[sectionId] = isOpen;
    saveSettings();
}

function stopEngine() {
    runtimeRef?.stop(true);
    destroyTrackedVictoryRuntime();
    updateStatus('Stopped and cleared the canvas.');
}

async function loadLabAtlasFile(file) {
    try {
        const image = await loadImageFile(file);
        if (labAtlas.objectUrl) URL.revokeObjectURL(labAtlas.objectUrl);
        labAtlas = {
            label: `${file.name} (${image.naturalWidth}×${image.naturalHeight})`,
            source: image,
            objectUrl: image.src,
            frames: [],
        };
        rebuildLabAtlasFrames();
        updateStatus(`Loaded atlas ${file.name}: ${labAtlas.frames.length} non-empty cells.`);
    } catch (error) {
        updateStatus(`Could not load ${file.name}: ${error?.message || error}`);
    }
}

function useDemoAtlas() {
    if (labAtlas.objectUrl) URL.revokeObjectURL(labAtlas.objectUrl);
    labAtlas = createLabDemoAtlas(settings.burstForms.imageCellSize);
    updateStatus('Using the built-in demo atlas.');
}

function resetLabSettings() {
    settings = saveFireworksEngineLabSettings(createDefaultFireworksEngineLabSettings());
    presetLaunchSource = 'preset';
    isTargetModeEnabled = false;
    targetLaunchGesture = null;

    if (runtimeRef) {
        runtimeRef.updateOptions(buildRuntimeOptions(settings));
        applyLiveLabToggles(runtimeRef, settings);
    }

    updateStatus('Lab settings reset to defaults.');
}

function startPreset(presetId) {
    const runtime = createLabRuntime();
    runtime.start(buildPresetLaunchOptions(presetId, settings));
    updateStatus(
        `${presetId.toUpperCase()} preset started from the standalone lab (${presetLaunchSource === 'preset' ? 'preset source' : 'lab source'}).`,
    );
}

function toggleTargetMode() {
    targetLaunchGesture = null;
    isTargetModeEnabled = !isTargetModeEnabled;
    render();
}

function launchTargetRocket(targetX, targetY) {
    const runtime = createLabRuntime();
    runtime.launchRocketAt(targetX, targetY, buildTargetLaunchOptions(settings));
    updateStatus(`Launched a target rocket at ${Math.round(targetX)}, ${Math.round(targetY)}.`);
}

function isTargetModeIgnoredElement(target) {
    return (
        target instanceof Element
        && !!target.closest([
            '[data-target-mode-ignore="true"]',
            'button',
            'a',
            'input',
            'label',
            'summary',
            'select',
            'textarea',
        ].join(', '))
    );
}

function renderStyleChips(name, options, activeId, action) {
    return options.map((option) => `
        <label class="styleChip">
            <input
                type="radio"
                name="${escapeHtml(name)}"
                value="${escapeHtml(option.id)}"
                ${activeId === option.id ? 'checked' : ''}
                data-target-mode-ignore="true"
                data-action="${action}"
            />
            <span>${escapeHtml(option.label)}</span>
        </label>
    `).join('');
}

function renderMultiStyleChips(options, activeIds, action) {
    return options.map((option) => `
        <label class="styleChip">
            <input
                type="checkbox"
                value="${escapeHtml(option.id)}"
                ${activeIds.includes(option.id) ? 'checked' : ''}
                data-target-mode-ignore="true"
                data-action="${action}"
                data-shape-id="${escapeHtml(option.id)}"
            />
            <span>${escapeHtml(option.label)}</span>
        </label>
    `).join('');
}

function renderRangeControls(sectionPath, controls) {
    return controls.map((control) => {
        const path = sectionPath ? `${sectionPath}.${control.id}` : control.id;
        const value = getByPath(settings, path);
        const isDisabled = (
            path === 'rocket.duration'
            && settings.rocket.speed > 0
    ) || (
            (path === 'rocket.cascade.childDurationMin' || path === 'rocket.cascade.childDurationMax')
            && (settings.rocket.cascade.childSpeedMin > 0 || settings.rocket.cascade.childSpeedMax > 0)
        );
        return `
            <label class="tuningControl${isDisabled ? ' tuningControlDisabled' : ''}">
                <div class="tuningMeta">
                    ${renderSettingLabel(control.label, control.id, path)}
                    <span class="tuningValue">${escapeHtml(formatTuningValue(control, value))}</span>
                </div>
                <input
                    class="tuningSlider"
                    type="range"
                    min="${control.min}"
                    max="${control.max}"
                    step="${control.step}"
                    value="${resolveControlValue(control, value)}"
                    data-target-mode-ignore="true"
                    data-action="range"
                    data-path="${escapeHtml(path)}"
                    ${isDisabled ? 'disabled' : ''}
                />
            </label>
        `;
    }).join('');
}

function renderRocketSection() {
    const selectedCascadeMode = settings.rocket.cascade.mode === 'rocket' ? 'rocket' : 'burst';

    return `
        <details class="entitySection" data-section-id="rocket" ${settings.sectionState.rocket ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Rocket</span>
                <span class="summaryHint">canonical path + tuning</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.rocket.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="rocket.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'rocket.enabled')}
                    </label>
                </div>

                <div class="styleControlRow">
                    ${renderSettingLabel('Rocket colors', 'colorMode', 'rocket.colorMode')}
                    <div class="styleControlGroup">${renderStyleChips('rocket-color-mode', FIREWORKS_ENGINE_LAB_ROCKET_COLOR_MODES.map((id) => ({ id, label: id.toUpperCase() })), settings.rocket.colorMode, 'rocket-color-mode')}</div>
                </div>
                <div class="styleControlRow">
                    ${renderSettingLabel('Cascade mode', 'mode', 'rocket.cascade.mode')}
                    <div class="styleControlGroup">${renderStyleChips('rocket-cascade-mode', FIREWORKS_ENGINE_LAB_ROCKET_CASCADE_MODES.map((id) => ({ id, label: id.toUpperCase() })), selectedCascadeMode, 'rocket-cascade-mode')}</div>
                </div>

                ${settings.rocket.colorMode === 'single' ? `
                    <label class="colorField">
                        <div class="tuningMeta">
                            ${renderSettingLabel('Rocket color', 'singleColor', 'rocket.singleColor')}
                            <span class="tuningValue">${escapeHtml(settings.rocket.singleColor.toUpperCase())}</span>
                        </div>
                        <input
                            class="colorPicker"
                            type="color"
                            value="${escapeHtml(settings.rocket.singleColor)}"
                            data-target-mode-ignore="true"
                            data-action="color"
                            data-path="rocket.singleColor"
                        />
                    </label>
                ` : ''}
                <div class="tuningGrid">${renderRangeControls('rocket', ROCKET_TUNING_CONTROLS)}</div>
                <div class="tuningGrid">${renderRangeControls('rocket.cascade', ROCKET_CASCADE_CONTROLS)}</div>
            </div>
        </details>
    `;
}

function renderBurstFormsSection() {
    const selectedShapeTokens = resolveBurstFormShapeTokens(settings.burstForms.shape);
    const hasGlyphShape = selectedShapeTokens.includes('glyph');

    return `
        <details class="entitySection" data-section-id="burstForms" ${settings.sectionState.burstForms ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Burst Forms</span>
                <span class="summaryHint">toggle + colors + sliders</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.burstForms.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="burstForms.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'burstForms.enabled')}
                    </label>
                </div>

                <div class="styleControlRow">
                    ${renderSettingLabel('Form colors', 'colorMode', 'burstForms.colorMode')}
                    <div class="styleControlGroup">${renderStyleChips('burst-form-color-mode', FIREWORKS_ENGINE_LAB_BURST_FORM_COLOR_MODES.map((id) => ({ id, label: id.toUpperCase() })), settings.burstForms.colorMode, 'burst-forms-color-mode')}</div>
                </div>

                ${settings.burstForms.colorMode === 'single' ? `
                    <label class="colorField ${settings.burstForms.enabled ? '' : 'colorFieldMuted'}">
                        <div class="tuningMeta">
                            ${renderSettingLabel('Form color', 'singleColor', 'burstForms.singleColor')}
                            <span class="tuningValue">${escapeHtml(settings.burstForms.singleColor.toUpperCase())}</span>
                        </div>
                        <input
                            class="colorPicker"
                            type="color"
                            value="${escapeHtml(settings.burstForms.singleColor)}"
                            ${settings.burstForms.enabled ? '' : 'disabled'}
                            data-target-mode-ignore="true"
                            data-action="color"
                            data-path="burstForms.singleColor"
                        />
                    </label>
                ` : ''}

                <div class="styleControlRow">
                    ${renderSettingLabel('Form shape', 'shape', 'burstForms.shape')}
                    <div class="styleControlGroup">${renderMultiStyleChips(FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES.map((id) => ({ id, label: id.toUpperCase() })), selectedShapeTokens, 'burst-forms-shape-toggle')}</div>
                </div>

                <label class="glyphField ${hasGlyphShape ? '' : 'glyphFieldMuted'}">
                    <div class="tuningMeta">
                        ${renderSettingLabel('Form glyphs', 'glyph', 'burstForms.glyph')}
                        <span class="tuningValue">${escapeHtml(settings.burstForms.glyph)}</span>
                    </div>
                    <input
                        class="glyphInput"
                        type="text"
                        maxlength="8"
                        value="${escapeHtml(settings.burstForms.glyph)}"
                        ${hasGlyphShape ? '' : 'disabled'}
                        data-target-mode-ignore="true"
                        data-action="text"
                        data-path="burstForms.glyph"
                    />
                </label>

                ${renderImageAtlasBlock(selectedShapeTokens.includes('image'))}

                ${renderShapeWeightsBlock()}

                <div class="tuningBlock ${settings.burstForms.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('burstForms', BURST_FORM_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderImageGroupControls() {
    const activeGroup = resolveActiveImageGroup();
    const chips = [
        { name: '', label: `All frames (${labAtlas.frames.length})` },
        ...settings.burstForms.imageGroups.map((group) => ({
            name: group.name,
            label: `${group.name} (${selectFramesByCells(labAtlas.frames, group.cells).length})`,
        })),
    ];
    return `
        <div class="imageGroupRow">
            ${chips.map((chip) => `
                <button
                    type="button"
                    class="diagnosticButton ${chip.name === (activeGroup?.name ?? '') ? 'isActive' : ''}"
                    data-target-mode-ignore="true"
                    data-action="image-group-select"
                    data-group-name="${escapeHtml(chip.name)}"
                >${escapeHtml(chip.label)}</button>
            `).join('')}
        </div>
        <div class="imageGroupRow">
            <input
                class="glyphInput imageGroupName"
                type="text"
                maxlength="24"
                placeholder="New group name"
                data-target-mode-ignore="true"
                data-image-group-name
            />
            <button type="button" class="diagnosticButton" data-target-mode-ignore="true" data-action="image-group-create">Add group</button>
            ${activeGroup ? `<button type="button" class="diagnosticButton" data-target-mode-ignore="true" data-action="image-group-delete">Delete "${escapeHtml(activeGroup.name)}"</button>` : ''}
        </div>
        <p class="imageAtlasHint">
            ${activeGroup
        ? `Click cells in the preview to add or remove them from "${escapeHtml(activeGroup.name)}": launches use only these frames. Cell numbers depend on the atlas and the cell size.`
        : 'Without a group every non-empty cell is used. Add a group (e.g. bamboo, seasons) and click its cells to restrict a launch to them.'}
        </p>
    `;
}

function renderImageAtlasBlock(hasImageShape) {
    const frameCount = resolveActiveImageFrames().length;
    return `
        <div class="imageAtlasBlock ${hasImageShape ? '' : 'imageAtlasBlockMuted'}" data-target-mode-ignore="true">
            <div class="tuningMeta">
                ${renderSettingLabel('Image frames', 'images', 'burstForms.images')}
                <span class="tuningValue">${frameCount} frame${frameCount === 1 ? '' : 's'} in use</span>
            </div>
            <p class="imageAtlasHint">
                ${escapeHtml(labAtlas.label)}. Each image particle picks a random frame of the active group.
                Applies to Lab source and Target mode. Enable the IMAGE shape to use it.
            </p>
            ${renderImageGroupControls()}
            <div class="imageAtlasPreview" data-image-atlas-preview></div>
            <div class="imageAtlasActions">
                <label class="imageAtlasFile">
                    <span>Load atlas file…</span>
                    <input type="file" accept="image/*" data-target-mode-ignore="true" data-action="image-atlas-file" />
                </label>
                <button type="button" class="diagnosticButton" data-target-mode-ignore="true" data-action="image-atlas-demo">Use demo atlas</button>
            </div>
            <p class="imageAtlasHint">
                Grid: the first cell starts at offset X/Y, the next ones every cell size + gap.
                Offset and gap apply to a loaded atlas; the demo atlas has no margins.
            </p>
            <div class="tuningGrid">${renderRangeControls('burstForms', IMAGE_GRID_CONTROLS)}</div>
        </div>
    `;
}

function renderShapeWeightsBlock() {
    const pickedShapes = resolveBurstFormPickedShapes(settings.burstForms.shape);
    const isEnabled = settings.burstForms.shapeWeightsEnabled;
    return `
        <div class="shapeWeightsBlock" data-target-mode-ignore="true">
            <label class="toggleControl">
                <input
                    type="checkbox"
                    ${isEnabled ? 'checked' : ''}
                    data-target-mode-ignore="true"
                    data-action="checkbox"
                    data-path="burstForms.shapeWeightsEnabled"
                />
                ${renderSettingLabel('Shape weights', 'shapeWeights', 'burstForms.shapeWeights')}
            </label>
            <p class="imageAtlasHint">
                ${isEnabled
        ? 'Relative share of each selected shape; 0 excludes a shape. MIX counts as circle, square and rectangle.'
        : 'Off: shapes are picked uniformly, as before 1.1.0.'}
            </p>
            ${isEnabled && pickedShapes.length > 1
        ? `<div class="tuningGrid">${renderRangeControls('burstForms.shapeWeights', pickedShapes.map(buildShapeWeightControl))}</div>`
        : ''}
            ${isEnabled && pickedShapes.length <= 1 ? '<p class="imageAtlasHint">Select two or more shapes to weight them.</p>' : ''}
        </div>
    `;
}

function mountImageAtlasPreview() {
    const container = app.querySelector('[data-image-atlas-preview]');
    if (!container) {
        return;
    }
    const preview = document.createElement('canvas');
    const scale = Math.min(1, 480 / Math.max(1, labAtlas.source.naturalWidth || labAtlas.source.width));
    const width = Math.max(1, Math.round((labAtlas.source.naturalWidth || labAtlas.source.width) * scale));
    const height = Math.max(1, Math.round((labAtlas.source.naturalHeight || labAtlas.source.height) * scale));
    preview.width = width;
    preview.height = height;
    preview.className = 'imageAtlasCanvas';
    const ctx = preview.getContext('2d');
    ctx.drawImage(labAtlas.source, 0, 0, width, height);

    const activeGroup = resolveActiveImageGroup();
    const activeCells = new Set(activeGroup?.cells ?? []);
    ctx.lineWidth = 1;
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    labAtlas.frames.forEach((frame) => {
        const x = frame.x * scale;
        const y = frame.y * scale;
        const w = frame.width * scale;
        const h = frame.height * scale;
        const isPicked = !activeGroup || activeCells.has(frame.cellIndex);
        if (activeGroup && !isPicked) {
            ctx.fillStyle = 'rgba(10, 16, 30, 0.62)';
            ctx.fillRect(x, y, w, h);
        }
        ctx.strokeStyle = isPicked ? 'rgba(255, 209, 102, 0.95)' : 'rgba(191, 219, 254, 0.35)';
        ctx.lineWidth = activeGroup && isPicked ? 2 : 1;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = isPicked ? '#ffd166' : 'rgba(191, 219, 254, 0.7)';
        ctx.fillText(String(frame.cellIndex), x + 4, y + 3);
    });

    // Click a cell to toggle it in the active group.
    preview.addEventListener('click', (event) => {
        const rect = preview.getBoundingClientRect();
        const sourceX = ((event.clientX - rect.left) / rect.width) * (width / scale);
        const sourceY = ((event.clientY - rect.top) / rect.height) * (height / scale);
        const layout = resolveGridLayout(labAtlas.source, settings.burstForms.imageCellSize, resolveLabGrid());
        const cellIndex = resolveGridCellAt(layout, sourceX, sourceY);
        if (cellIndex < 0) {
            return;
        }
        toggleCellInActiveGroup(cellIndex);
    });
    preview.style.cursor = activeGroup ? 'pointer' : 'default';
    preview.setAttribute('data-target-mode-ignore', 'true');
    container.replaceChildren(preview);
}

function renderBurstEventsSection() {
    return `
        <details class="entitySection" data-section-id="burstEvents" ${settings.sectionState.burstEvents ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Burst Events</span>
                <span class="summaryHint">onBurst + tracked victory boundaries</span>
            </summary>
            <div class="entityBody" data-target-mode-ignore="true">
                <p class="imageAtlasHint">
                    Every lab launch is created with <code>onBurst</code>: each logical burst is logged and marked
                    on screen once, including rocket detonations and cascade children.
                </p>
                <div class="diagnosticToggleRow">
                    <button type="button" class="diagnosticButton ${showBurstMarkers ? 'isActive' : ''}" data-target-mode-ignore="true" data-action="toggle-burst-markers">Markers</button>
                    <button type="button" class="diagnosticButton" data-target-mode-ignore="true" data-action="clear-burst-log">Clear log</button>
                    <button type="button" class="diagnosticButton" data-target-mode-ignore="true" data-action="victory-boundaries">Victory boundaries</button>
                </div>
                <p class="imageAtlasHint">
                    Victory boundaries: <code>launchPresetAt('victory-finale', x, y, { trackBurstSequence: true, sizeScale: 1.05, timeScale: 0.95 })</code>
                    on a default-settings engine; the first and last bursts carry <code>sequence.isFirst</code> / <code>isLast</code>.
                </p>
                <p class="status" data-victory-status>${escapeHtml(trackedVictoryStatus)}</p>
                <p class="imageAtlasHint">Bursts: <strong data-burst-event-count>${burstEventCount}</strong></p>
                <ol class="burstEventLog" data-burst-event-log>${renderBurstEventLogItems()}</ol>
            </div>
        </details>
    `;
}

function renderBurstSparksSection() {
    return `
        <details class="entitySection" data-section-id="burstSparks" ${settings.sectionState.burstSparks ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Burst Sparks</span>
                <span class="summaryHint">toggle + colors + sliders</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.burstSparks.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="burstSparks.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'burstSparks.enabled')}
                    </label>
                </div>

                <div class="styleControlRow">
                    ${renderSettingLabel('Spark colors', 'colorMode', 'burstSparks.colorMode')}
                    <div class="styleControlGroup">${renderStyleChips('burst-spark-color-mode', FIREWORKS_ENGINE_LAB_BURST_SPARK_COLOR_MODES.map((id) => ({ id, label: id.toUpperCase() })), settings.burstSparks.colorMode, 'burst-sparks-color-mode')}</div>
                </div>

                ${settings.burstSparks.colorMode === 'single' ? `
                    <label class="colorField ${settings.burstSparks.enabled ? '' : 'colorFieldMuted'}">
                        <div class="tuningMeta">
                            ${renderSettingLabel('Spark color', 'singleColor', 'burstSparks.singleColor')}
                            <span class="tuningValue">${escapeHtml(settings.burstSparks.singleColor.toUpperCase())}</span>
                        </div>
                        <input
                            class="colorPicker"
                            type="color"
                            value="${escapeHtml(settings.burstSparks.singleColor)}"
                            ${settings.burstSparks.enabled ? '' : 'disabled'}
                            data-target-mode-ignore="true"
                            data-action="color"
                            data-path="burstSparks.singleColor"
                        />
                    </label>
                ` : ''}

                <div class="styleControlRow">
                    ${renderSettingLabel('Spark shape', 'shape', 'burstSparks.shape')}
                    <div class="styleControlGroup">${renderStyleChips('burst-spark-shape', FIREWORKS_ENGINE_LAB_BURST_SPARK_SHAPES.map((id) => ({ id, label: id.toUpperCase() })), settings.burstSparks.shape, 'burst-sparks-shape')}</div>
                </div>

                <div class="tuningBlock ${settings.burstSparks.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('burstSparks', BURST_SPARK_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderRocketTailEmbersSection() {
    return `
        <details class="entitySection" data-section-id="rocketTailEmbers" ${settings.sectionState.rocketTailEmbers ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Rocket Tail Embers</span>
                <span class="summaryHint">toggle + sliders</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.rocketTailEmbers.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="rocketTailEmbers.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'rocketTailEmbers.enabled')}
                    </label>
                </div>
                <div class="tuningBlock ${settings.rocketTailEmbers.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('rocketTailEmbers', ROCKET_TAIL_EMBER_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderBurstCenterFlashSection() {
    return `
        <details class="entitySection" data-section-id="burstCenterFlash" ${settings.sectionState.burstCenterFlash ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Burst Center Flash</span>
                <span class="summaryHint">toggle + colors + sliders</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.burstCenterFlash.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="burstCenterFlash.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'burstCenterFlash.enabled')}
                    </label>
                </div>

                <div class="styleControlRow">
                    ${renderSettingLabel('Flash colors', 'colorMode', 'burstCenterFlash.colorMode')}
                    <div class="styleControlGroup">${renderStyleChips('burst-flash-color-mode', FIREWORKS_ENGINE_LAB_FLASH_COLOR_MODES.map((id) => ({ id, label: id.toUpperCase() })), settings.burstCenterFlash.colorMode, 'burst-flash-color-mode')}</div>
                </div>

                ${settings.burstCenterFlash.colorMode === 'single' ? `
                    <label class="colorField ${settings.burstCenterFlash.enabled ? '' : 'colorFieldMuted'}">
                        <div class="tuningMeta">
                            ${renderSettingLabel('Flash color', 'color', 'burstCenterFlash.color')}
                            <span class="tuningValue">${escapeHtml(settings.burstCenterFlash.color.toUpperCase())}</span>
                        </div>
                        <input
                            class="colorPicker"
                            type="color"
                            value="${escapeHtml(settings.burstCenterFlash.color)}"
                            ${settings.burstCenterFlash.enabled ? '' : 'disabled'}
                            data-target-mode-ignore="true"
                            data-action="color"
                            data-path="burstCenterFlash.color"
                        />
                    </label>
                ` : ''}

                <div class="tuningBlock ${settings.burstCenterFlash.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('burstCenterFlash', BURST_CENTER_FLASH_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderBurstTwinkleCloudSection() {
    return `
        <details class="entitySection" data-section-id="burstTwinkleCloud" ${settings.sectionState.burstTwinkleCloud ? 'open' : ''}>
            <summary class="entitySummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Burst Twinkle Cloud</span>
                <span class="summaryHint">toggle + sliders</span>
            </summary>
            <div class="entityBody">
                <div class="diagnosticsGrid">
                    <label class="toggleControl">
                        <input
                            type="checkbox"
                            ${settings.burstTwinkleCloud.enabled ? 'checked' : ''}
                            data-target-mode-ignore="true"
                            data-action="checkbox"
                            data-path="burstTwinkleCloud.enabled"
                        />
                        ${renderSettingLabel('Enabled', 'enabled', 'burstTwinkleCloud.enabled')}
                    </label>
                </div>
                <div class="tuningBlock ${settings.burstTwinkleCloud.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('burstTwinkleCloud', BURST_TWINKLE_CLOUD_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderEffectSettingsSection() {
    return `
        <details class="diagnosticsPanel" data-section-id="effectSettings" ${settings.sectionState.effectSettings ? 'open' : ''}>
            <summary class="diagnosticsSummary" data-target-mode-ignore="true">
                <span class="summaryTitle">Effect settings</span>
                <span class="summaryHint">${escapeHtml(EFFECT_SETTINGS_HINT)}</span>
            </summary>
            <div class="diagnosticsBody">
                <div class="diagnosticToggleRow">
                    ${EFFECT_SETTING_TOGGLES.map((toggle) => `
                        <button
                            type="button"
                            class="diagnosticButton ${settings.performance[toggle.id] ? 'isActive' : ''}"
                            data-target-mode-ignore="true"
                            data-action="toggle-boolean"
                            data-path="performance.${escapeHtml(toggle.id)}"
                        >${escapeHtml(toggle.label)}</button>
                    `).join('')}
                </div>
                <div class="tuningBlock">
                    <div class="tuningGrid">${renderRangeControls('', GLOBAL_TUNING_CONTROLS)}</div>
                </div>
            </div>
        </details>
    `;
}

function renderPresets() {
    return `
        <section class="presetPanel">
            <div class="presetSourceRow">
                <span class="styleControlLabel">Preset source</span>
                <div class="styleControlGroup">
                    ${renderStyleChips(
        'presetLaunchSource',
        PRESET_LAUNCH_SOURCES,
        presetLaunchSource,
        'preset-launch-source',
    )}
                </div>
            </div>
            <div class="presetGrid">
                ${PRESET_CARDS.map((preset) => `
                    <button
                        type="button"
                        class="presetButton ${escapeHtml(preset.accentClassName)}"
                        data-target-mode-ignore="true"
                        data-action="preset"
                        data-preset-id="${escapeHtml(preset.id)}"
                    >${escapeHtml(preset.label)}</button>
                `).join('')}
            </div>
        </section>
    `;
}

function render() {
    app.className = `labPage ${isTargetModeEnabled ? 'isTargetMode' : ''}`;
    app.innerHTML = `
        <section class="shell">
            <header class="toolbar">
                <div class="toolbarMain">
                    <div class="titleBlock">
                        <p class="eyebrow">Fireworks Engine Lab</p>
                        <h1 class="title">Fireworks Engine</h1>
                    </div>
                    <div class="toolbarActions">
                        <button type="button" class="targetModeButton ${isTargetModeEnabled ? 'targetModeButtonActive' : ''}" data-target-mode-ignore="true" data-action="target-mode">Target mode</button>
                        <button type="button" class="stopButton" data-target-mode-ignore="true" data-action="stop">Stop</button>
                        <button type="button" class="resetButton" data-target-mode-ignore="true" data-action="reset">Reset</button>
                        <button type="button" class="copySnippetButton" data-target-mode-ignore="true" data-action="copy-snippet">Copy snippet</button>
                        <a class="backLink" href="./examples.html" data-target-mode-ignore="true">Gallery</a>
                        <a class="backLink" href="./fireworks-engine-options-reference.html" data-target-mode-ignore="true">Options reference</a>
                    </div>
                </div>
                <p class="compactHint">${escapeHtml(LAB_HINT)}</p>
                <p class="status">${escapeHtml(statusText)}</p>
                <p class="targetModeHint">${escapeHtml(isTargetModeEnabled ? TARGET_MODE_HINT : TARGET_MODE_IDLE_HINT)}</p>
            </header>
            ${renderPresets()}
            ${renderEffectSettingsSection()}
            ${renderRocketSection()}
            ${renderBurstFormsSection()}
            ${renderBurstSparksSection()}
            ${renderRocketTailEmbersSection()}
            ${renderBurstCenterFlashSection()}
            ${renderBurstTwinkleCloudSection()}
            ${renderBurstEventsSection()}
        </section>
    `;
    mountImageAtlasPreview();
}
app.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }

    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) {
        return;
    }

    const action = actionTarget.getAttribute('data-action');
    if (action === 'preset') {
        startPreset(actionTarget.getAttribute('data-preset-id'));
        return;
    }

    if (action === 'stop') {
        stopEngine();
        return;
    }

    if (action === 'reset') {
        resetLabSettings();
        return;
    }

    if (action === 'target-mode') {
        toggleTargetMode();
        return;
    }

    if (action === 'copy-snippet') {
        void copySettingsSnippet();
        return;
    }

    if (action === 'copy-setting-path') {
        const path = actionTarget.getAttribute('data-copy-path');
        if (path) {
            void copySettingPath(path);
        }
        return;
    }

    if (action === 'toggle-boolean') {
        const path = actionTarget.getAttribute('data-path');
        updateSetting(path, !getByPath(settings, path));
        return;
    }

    if (action === 'image-atlas-demo') {
        useDemoAtlas();
        return;
    }

    if (action === 'image-group-select') {
        updateImageGroups(settings.burstForms.imageGroups, actionTarget.getAttribute('data-group-name') || '');
        return;
    }

    if (action === 'image-group-create') {
        createImageGroup(app.querySelector('[data-image-group-name]')?.value);
        return;
    }

    if (action === 'image-group-delete') {
        deleteActiveImageGroup();
        return;
    }

    if (action === 'toggle-burst-markers') {
        showBurstMarkers = !showBurstMarkers;
        render();
        return;
    }

    if (action === 'clear-burst-log') {
        burstEventLog = [];
        burstEventCount = 0;
        refreshBurstEventPanel();
        return;
    }

    if (action === 'victory-boundaries') {
        launchTrackedVictory();
    }
});

app.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
        return;
    }

    const action = target.getAttribute('data-action');
    const path = target.getAttribute('data-path');

    if (action === 'checkbox' && path) {
        updateSetting(path, target.checked);
        return;
    }

    if (action === 'burst-forms-shape-toggle') {
        const shapeId = target.getAttribute('data-shape-id');
        if (!shapeId || !FIREWORKS_ENGINE_LAB_BURST_FORM_SHAPES.includes(shapeId)) {
            return;
        }

        const nextShapeValue = toggleBurstFormShape(settings.burstForms.shape, shapeId, target.checked);
        if (nextShapeValue === settings.burstForms.shape) {
            render();
            return;
        }

        updateSetting('burstForms.shape', nextShapeValue);
        return;
    }

    if (action === 'burst-forms-color-mode') {
        updateSetting('burstForms.colorMode', target.value);
        return;
    }

    if (action === 'burst-sparks-shape') {
        updateSetting('burstSparks.shape', target.value);
        return;
    }

    if (action === 'burst-sparks-color-mode') {
        updateSetting('burstSparks.colorMode', target.value);
        return;
    }

    if (action === 'burst-flash-color-mode') {
        updateSetting('burstCenterFlash.colorMode', target.value);
        return;
    }

    if (action === 'rocket-color-mode') {
        updateSetting('rocket.colorMode', target.value);
        return;
    }

    if (action === 'rocket-cascade-mode') {
        updateSetting('rocket.cascade.mode', target.value);
        return;
    }

    if (action === 'preset-launch-source') {
        presetLaunchSource = target.value === 'lab' ? 'lab' : 'preset';
        render();
        return;
    }

    if (action === 'image-atlas-file') {
        const file = target.files?.[0];
        if (file) void loadLabAtlasFile(file);
        return;
    }

    // Grid sliders re-slice the atlas once released, not on every input step.
    if (action === 'range' && IMAGE_GRID_PATHS.has(path)) {
        rebuildLabAtlasFrames();
        render();
    }
});

app.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
        return;
    }

    const action = target.getAttribute('data-action');
    const path = target.getAttribute('data-path');
    if (!action || !path) {
        return;
    }

    if (action === 'range') {
        const parsedValue = Number.parseFloat(target.value);
        if (Number.isFinite(parsedValue)) {
            updateRangeSetting(path, parsedValue, target);
        }
        return;
    }

    if (action === 'color') {
        updateColorSetting(path, target.value, target);
        return;
    }

    if (action === 'text') {
        updateTextSetting(path, target.value, target);
    }
});

app.addEventListener('toggle', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLDetailsElement)) {
        return;
    }

    const sectionId = target.getAttribute('data-section-id');
    if (!sectionId || !(sectionId in settings.sectionState)) {
        return;
    }

    toggleSection(sectionId, target.open);
}, true);

document.addEventListener('pointerdown', (event) => {
    if (!isTargetModeEnabled) {
        return;
    }

    if (event.button !== 0 || isTargetModeIgnoredElement(event.target)) {
        targetLaunchGesture = null;
        return;
    }

    targetLaunchGesture = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
    };
}, true);

document.addEventListener('pointerup', (event) => {
    if (!isTargetModeEnabled) {
        return;
    }

    const gesture = targetLaunchGesture;
    targetLaunchGesture = null;

    if (!gesture) {
        return;
    }

    if (gesture.pointerId !== event.pointerId || isTargetModeIgnoredElement(event.target)) {
        return;
    }

    const movement = Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY);
    if (movement > TARGET_LAUNCH_GESTURE_MAX_DISTANCE) {
        return;
    }

    launchTargetRocket(event.clientX, event.clientY);
}, true);

document.addEventListener('pointercancel', () => {
    targetLaunchGesture = null;
}, true);

app.addEventListener('keydown', (event) => {
    const target = event.target;
    if (event.key === 'Enter' && target instanceof HTMLInputElement && target.hasAttribute('data-image-group-name')) {
        event.preventDefault();
        createImageGroup(target.value);
    }
});

window.addEventListener('beforeunload', () => {
    destroyRuntime();
    destroyTrackedVictoryRuntime();
});

render();
