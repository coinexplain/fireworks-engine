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
    resolveBurstFormShapeTokens,
} from './snippetBuilders.js';

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

const RANGE_CONTROL_BY_PATH = new Map([
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
    runtimeRef = createFireworksEngine(buildRuntimeOptions(settings));
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
        burstForms: buildBurstFormsOptions(currentSettings.burstForms),
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
        burstForms: buildBurstFormsOptions(currentSettings.burstForms),
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
        burstForms: buildBurstFormsOptions(currentSettings.burstForms),
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
    updateStatus('Stopped and cleared the canvas.');
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

                <div class="tuningBlock ${settings.burstForms.enabled ? '' : 'tuningBlockMuted'}">
                    <div class="tuningGrid">${renderRangeControls('burstForms', BURST_FORM_TUNING_CONTROLS)}</div>
                </div>
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
        </section>
    `;
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

window.addEventListener('beforeunload', () => {
    destroyRuntime();
});

render();
