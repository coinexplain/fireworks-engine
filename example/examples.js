import {
    createFireworksEngine,
    resolveFireworksEnginePreset,
} from '../src/index.js';
import {
    EXAMPLES_GALLERY_SECTIONS,
    EXAMPLES_GALLERY_SINGLE_COLOR_MODES,
    resolveExamplesGalleryLaunchPlan,
    resolveExamplesGalleryRecipe,
} from './examplesGalleryData.js';
import {
    resolveExamplesGalleryPortableSnippet,
    resolveExamplesGallerySnippet,
} from './examplesGallerySnippets.js';

const gallery = document.getElementById('gallery');
const status = document.getElementById('status');

const EXAMPLES_ENGINE_OPTIONS = Object.freeze({
    performance: {
        enableBurstQueueThrottling: false,
    },
    canvas: {
        appendTarget: document.body,
        maxDevicePixelRatio: 2,
        zIndex: 24,
    },
});

function createExamplesEngine() {
    return createFireworksEngine({
        performance: { ...EXAMPLES_ENGINE_OPTIONS.performance },
        canvas: { ...EXAMPLES_ENGINE_OPTIONS.canvas },
    });
}

const engine = createExamplesEngine();
let isolatedConfettiEngine = null;

const singleColorModeState = new Map();
const editorContentState = new Map();
const editorErrorState = new Map();
const scheduledLaunches = new Set();
let floatingMetricsWidgetNode = null;
let floatingParticlesValueNode = null;
let floatingFpsValueNode = null;
let floatingSourceValueNode = null;
let floatingMetricsDragState = null;
let floatingMetricsUpdateIntervalId = null;
const ISOLATED_CONFETTI_RECIPE_IDS = new Set(['confetti', 'confetti-dual-cannons', 'confetti-tricolor-stream']);
const fpsProbeEngines = new WeakSet();
const mainFpsState = {
    measuredFps: 0,
    frameCount: 0,
    windowStart: 0,
};
const isolatedFpsState = {
    measuredFps: 0,
    frameCount: 0,
    windowStart: 0,
};

const FLOATING_METRICS_TUNING = {
    topOffsetPx: 12,
    rightOffsetPx: 12,
    viewportMarginPx: 8,
    uiUpdateIntervalMs: 120,
    fpsSampleWindowMs: 500,
};

function resolveUiNow() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }

    return Date.now();
}

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function resetFpsState(fpsState) {
    fpsState.measuredFps = 0;
    fpsState.frameCount = 0;
    fpsState.windowStart = resolveUiNow();
}

function sampleEngineFps(fpsState, now) {
    const sampleNow = Number.isFinite(now) ? now : resolveUiNow();
    if (fpsState.frameCount === 0) {
        fpsState.windowStart = sampleNow;
    }

    fpsState.frameCount += 1;
    const elapsed = sampleNow - fpsState.windowStart;
    if (elapsed >= FLOATING_METRICS_TUNING.fpsSampleWindowMs) {
        fpsState.measuredFps = Math.round((fpsState.frameCount * 1000) / elapsed);
        fpsState.frameCount = 0;
        fpsState.windowStart = sampleNow;
    }
}

function attachEngineFpsProbe(targetEngine, fpsState) {
    if (!targetEngine || fpsProbeEngines.has(targetEngine)) {
        return;
    }

    const originalLoopFrame = targetEngine.loopFrame;
    if (typeof originalLoopFrame !== 'function') {
        return;
    }

    targetEngine.loopFrame = (now) => {
        sampleEngineFps(fpsState, now);
        return originalLoopFrame(now);
    };

    fpsProbeEngines.add(targetEngine);
}

function setStatus(text) {
    status.textContent = text;
}

function resolveActiveParticleCount() {
    return engine.particles.length + (isolatedConfettiEngine?.particles.length ?? 0);
}

function resolveActiveEngineSource() {
    const mainRunning = engine.running;
    const isolatedRunning = Boolean(isolatedConfettiEngine?.running);

    if (mainRunning && isolatedRunning) {
        return 'both';
    }

    if (isolatedRunning) {
        return 'isolated';
    }

    if (mainRunning) {
        return 'main';
    }

    return 'idle';
}

function resolveActiveFps() {
    const mainRunning = engine.running;
    const isolatedRunning = Boolean(isolatedConfettiEngine?.running);

    if (!mainRunning) {
        resetFpsState(mainFpsState);
    }

    if (!isolatedRunning) {
        resetFpsState(isolatedFpsState);
    }

    if (!mainRunning && !isolatedRunning) {
        return 0;
    }

    return Math.max(mainFpsState.measuredFps, isolatedFpsState.measuredFps);
}

function stopGalleryEngines() {
    clearScheduledLaunches();
    engine.stop(true);
    isolatedConfettiEngine?.stop(true);
    refreshFloatingMetrics();
    setStatus('Stopped and cleared the page overlay.');
}

function applyFloatingMetricsWidgetPosition(nextLeft, nextTop) {
    if (!floatingMetricsWidgetNode) {
        return;
    }

    const viewportWidth = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1;
    const viewportHeight = Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 1;
    const nodeWidth = floatingMetricsWidgetNode.offsetWidth || 1;
    const nodeHeight = floatingMetricsWidgetNode.offsetHeight || 1;
    const margin = FLOATING_METRICS_TUNING.viewportMarginPx;
    const maxLeft = Math.max(margin, viewportWidth - nodeWidth - margin);
    const maxTop = Math.max(margin, viewportHeight - nodeHeight - margin);
    const clampedLeft = clampNumber(nextLeft, margin, maxLeft);
    const clampedTop = clampNumber(nextTop, margin, maxTop);

    floatingMetricsWidgetNode.style.left = `${clampedLeft}px`;
    floatingMetricsWidgetNode.style.top = `${clampedTop}px`;
}

function onFloatingMetricsPointerDown(event) {
    if (!floatingMetricsWidgetNode) {
        return;
    }

    if (typeof event.button === 'number' && event.button !== 0) {
        return;
    }

    const rect = floatingMetricsWidgetNode.getBoundingClientRect();
    floatingMetricsDragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
    };
    floatingMetricsWidgetNode.classList.add('isDragging');
    event.preventDefault();
}

function onFloatingMetricsPointerMove(event) {
    if (!floatingMetricsDragState) {
        return;
    }

    applyFloatingMetricsWidgetPosition(
        event.clientX - floatingMetricsDragState.offsetX,
        event.clientY - floatingMetricsDragState.offsetY,
    );
}

function onFloatingMetricsPointerUp() {
    if (!floatingMetricsDragState || !floatingMetricsWidgetNode) {
        return;
    }

    floatingMetricsDragState = null;
    floatingMetricsWidgetNode.classList.remove('isDragging');
}

function onFloatingMetricsViewportResize() {
    if (!floatingMetricsWidgetNode) {
        return;
    }

    const currentLeft = Number.parseFloat(floatingMetricsWidgetNode.style.left);
    const currentTop = Number.parseFloat(floatingMetricsWidgetNode.style.top);
    applyFloatingMetricsWidgetPosition(
        Number.isFinite(currentLeft) ? currentLeft : FLOATING_METRICS_TUNING.viewportMarginPx,
        Number.isFinite(currentTop) ? currentTop : FLOATING_METRICS_TUNING.viewportMarginPx,
    );
}

function createFloatingMetricsRow(labelText, valueClassName, initialValue = '0') {
    const row = document.createElement('p');
    row.className = 'floatingMetricsRow';
    row.append(`${labelText}: `);

    const valueNode = document.createElement('span');
    valueNode.className = `floatingMetricsValue ${valueClassName}`;
    valueNode.textContent = initialValue;
    row.appendChild(valueNode);

    return {
        row,
        valueNode,
    };
}

function initializeFloatingMetricsWidget() {
    if (floatingMetricsWidgetNode) {
        return;
    }

    const widget = document.createElement('aside');
    widget.className = 'floatingMetricsWidget';
    widget.setAttribute('aria-live', 'polite');

    const handle = document.createElement('div');
    handle.className = 'floatingMetricsHandle';
    handle.textContent = 'Live Metrics';
    handle.title = 'Drag to move';
    handle.addEventListener('pointerdown', onFloatingMetricsPointerDown);
    widget.appendChild(handle);

    const particlesMetric = createFloatingMetricsRow('Particles', 'floatingMetricsParticlesValue');
    widget.appendChild(particlesMetric.row);

    const fpsMetric = createFloatingMetricsRow('FPS', 'floatingMetricsFpsValue');
    widget.appendChild(fpsMetric.row);

    const sourceMetric = createFloatingMetricsRow('FPS source', 'floatingMetricsSourceValue', 'idle');
    widget.appendChild(sourceMetric.row);

    const actions = document.createElement('div');
    actions.className = 'floatingMetricsActions';

    const stopButton = document.createElement('button');
    stopButton.type = 'button';
    stopButton.className = 'stopButton';
    stopButton.textContent = 'Stop animation';
    stopButton.addEventListener('click', stopGalleryEngines);
    actions.appendChild(stopButton);

    widget.appendChild(actions);

    document.body.appendChild(widget);

    floatingMetricsWidgetNode = widget;
    floatingParticlesValueNode = particlesMetric.valueNode;
    floatingFpsValueNode = fpsMetric.valueNode;
    floatingSourceValueNode = sourceMetric.valueNode;

    const viewportWidth = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1;
    const initialLeft = viewportWidth - widget.offsetWidth - FLOATING_METRICS_TUNING.rightOffsetPx;
    const initialTop = FLOATING_METRICS_TUNING.topOffsetPx;
    applyFloatingMetricsWidgetPosition(initialLeft, initialTop);

    window.addEventListener('pointermove', onFloatingMetricsPointerMove);
    window.addEventListener('pointerup', onFloatingMetricsPointerUp);
    window.addEventListener('resize', onFloatingMetricsViewportResize);
}

function updateFloatingMetricsWidget(activeParticleCount, activeFps, activeSource) {
    if (!floatingMetricsWidgetNode) {
        return;
    }

    if (floatingParticlesValueNode) {
        floatingParticlesValueNode.textContent = activeParticleCount;
    }
    if (floatingFpsValueNode) {
        floatingFpsValueNode.textContent = activeFps;
    }
    if (floatingSourceValueNode) {
        floatingSourceValueNode.textContent = activeSource;
    }
}

function refreshFloatingMetrics() {
    const activeParticleCount = String(resolveActiveParticleCount());
    const activeFps = String(resolveActiveFps());
    const activeSource = resolveActiveEngineSource();

    updateFloatingMetricsWidget(activeParticleCount, activeFps, activeSource);
}

function startFloatingMetricsUpdates() {
    refreshFloatingMetrics();
    floatingMetricsUpdateIntervalId = window.setInterval(() => {
        refreshFloatingMetrics();
    }, FLOATING_METRICS_TUNING.uiUpdateIntervalMs);
}

function getColorMode(recipe) {
    if (!recipe?.supportsColorModes) {
        return null;
    }

    return singleColorModeState.get(recipe.id) || 'palette';
}

function clearScheduledLaunches() {
    scheduledLaunches.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
    });
    scheduledLaunches.clear();
}

function scheduleLaunch(callback, delayMs) {
    const timeoutId = window.setTimeout(() => {
        scheduledLaunches.delete(timeoutId);
        callback();
    }, delayMs);

    scheduledLaunches.add(timeoutId);
    return timeoutId;
}

function getViewportMetrics() {
    const width = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1;
    const height = Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 1;

    return {
        width,
        height,
    };
}

function launchAtRatio(targetXRatio, targetYRatio, options) {
    const viewport = getViewportMetrics();
    const targetX = viewport.width * targetXRatio;
    const targetY = viewport.height * targetYRatio;
    return engine.launchRocketAt(targetX, targetY, options);
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
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    return fallbackCopyText(text);
}

function resolveCanonicalEditorContent(recipeId, colorModeId) {
    return resolveExamplesGallerySnippet(recipeId, colorModeId || undefined);
}

function getEditorContent(recipeId, colorModeId) {
    const cachedContent = editorContentState.get(recipeId);
    if (typeof cachedContent === 'string') {
        return cachedContent;
    }

    const canonicalContent = resolveCanonicalEditorContent(recipeId, colorModeId);
    editorContentState.set(recipeId, canonicalContent);
    return canonicalContent;
}

function setEditorContent(recipeId, nextContent) {
    editorContentState.set(recipeId, nextContent);
}

function getEditorError(recipeId) {
    return editorErrorState.get(recipeId) || '';
}

function setEditorError(recipeId, message) {
    if (message) {
        editorErrorState.set(recipeId, message);
    } else {
        editorErrorState.delete(recipeId);
    }
}

function resetRecipe(recipeId) {
    const recipe = resolveExamplesGalleryRecipe(recipeId);
    const colorModeId = getColorMode(recipe);
    clearScheduledLaunches();
    setEditorContent(recipeId, resolveCanonicalEditorContent(recipeId, colorModeId));
    setEditorError(recipeId, '');
    setStatus(`Reset ${recipe.title} to its canonical example code.`);
    renderGallery();
}

async function copyPortableSnippet(recipeId) {
    const recipe = resolveExamplesGalleryRecipe(recipeId);
    if (!recipe) {
        setStatus('The requested recipe could not be resolved.');
        return;
    }

    const colorModeId = getColorMode(recipe);
    const snippet = resolveExamplesGalleryPortableSnippet(recipeId, colorModeId || undefined);
    if (!snippet) {
        setStatus(`No portable snippet is available for ${recipe.title}.`);
        return;
    }

    try {
        await copyTextToClipboard(snippet);
        setStatus(`Copied a portable snippet for ${recipe.title}.`);
    } catch {
        setStatus('Could not copy the portable snippet. Clipboard access is blocked in this context.');
    }
}

function countEditorLines(content) {
    return Math.max(1, content.split('\n').length);
}

function renderEditorLineNumbers(content) {
    return Array.from({ length: countEditorLines(content) }, (_, index) => String(index + 1)).join('\n');
}

function syncEditorHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 176)}px`;
}

function syncEditorScroll(textarea, gutter) {
    gutter.scrollTop = textarea.scrollTop;
}

function resolveRecipeEditorTopY(recipeId) {
    if (!recipeId || typeof recipeId !== 'string') {
        return null;
    }

    const input = document.querySelector(`.recipeCard[data-recipe-id="${recipeId}"] .editorInput`);
    if (!input) {
        return null;
    }

    return input.getBoundingClientRect().top;
}

function buildExecutionContext() {
    const viewport = getViewportMetrics();
    const fullRocketOptions = resolveExamplesGalleryLaunchPlan('full-rocket', 'palette')?.launches?.[0]?.options
        ?? resolveFireworksEnginePreset('base');

    const helpers = {
        engine,
        resolveFireworksEnginePreset,
        fullRocketOptions,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        centerX: viewport.width * 0.5,
        centerY: viewport.height * 0.36,
        stageWidth: viewport.width,
        stageHeight: viewport.height,
        resolveRecipeEditorTopY,
        launchAtRatio,
        schedule(callback, delayMs) {
            return scheduleLaunch(callback, delayMs);
        },
        setTimeout(callback, delayMs) {
            return scheduleLaunch(callback, delayMs);
        },
        clearTimeout(timeoutId) {
            window.clearTimeout(timeoutId);
            scheduledLaunches.delete(timeoutId);
        },
    };

    return helpers;
}

async function runEditorCode(recipeId) {
    const recipe = resolveExamplesGalleryRecipe(recipeId);
    const colorModeId = getColorMode(recipe);
    const source = getEditorContent(recipeId, colorModeId);

    if (!recipe || typeof source !== 'string') {
        setStatus('The requested recipe could not be resolved.');
        return;
    }

    clearScheduledLaunches();
    setEditorError(recipeId, '');

    let executionEngine = engine;
    if (ISOLATED_CONFETTI_RECIPE_IDS.has(recipe.id)) {
        if (!isolatedConfettiEngine) {
            isolatedConfettiEngine = createExamplesEngine();
            attachEngineFpsProbe(isolatedConfettiEngine, isolatedFpsState);
        }
        executionEngine = isolatedConfettiEngine;
    }
    const context = buildExecutionContext();
    context.engine = executionEngine;
    const parameterNames = Object.keys(context);
    const parameterValues = Object.values(context);

    try {
        const runner = new Function(...parameterNames, `'use strict';\n${source}`);
        const result = runner(...parameterValues);
        if (result && typeof result.then === 'function') {
            await result;
        }

        const modeLabel = colorModeId
            ? EXAMPLES_GALLERY_SINGLE_COLOR_MODES.find((mode) => mode.id === colorModeId)?.label
            : null;
        if (ISOLATED_CONFETTI_RECIPE_IDS.has(recipe.id)) {
            setStatus('Ran Confetti in an isolated engine (timeScale is global per instance; other recipes stay at timeScale 1).');
        } else {
            setStatus(modeLabel
                ? `Ran ${recipe.title} in ${modeLabel} from the editor.`
                : `Ran ${recipe.title} from the editor.`);
        }
    } catch (error) {
        clearScheduledLaunches();
        const message = error instanceof Error ? error.message : String(error);
        setEditorError(recipeId, message);
        setStatus(`Execution failed for ${recipe.title}.`);
        renderGallery();
    }
}

function renderColorModeButtons(recipe) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cardMeta';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'toggleGroup';

    const activeColorMode = getColorMode(recipe);
    EXAMPLES_GALLERY_SINGLE_COLOR_MODES.forEach((colorMode) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'toggleButton';
        button.textContent = colorMode.label;
        if (activeColorMode === colorMode.id) {
            button.classList.add('isActive');
        }

        button.addEventListener('click', () => {
            singleColorModeState.set(recipe.id, colorMode.id);
            setEditorContent(recipe.id, resolveCanonicalEditorContent(recipe.id, colorMode.id));
            setEditorError(recipe.id, '');
            renderGallery();
        });

        toggleGroup.appendChild(button);
    });

    wrapper.appendChild(toggleGroup);
    return wrapper;
}

function renderEditor(recipe, colorModeId) {
    const content = getEditorContent(recipe.id, colorModeId);
    const shell = document.createElement('div');
    shell.className = 'editorShell';

    const gutter = document.createElement('pre');
    gutter.className = 'editorGutter';
    gutter.setAttribute('aria-hidden', 'true');
    gutter.textContent = renderEditorLineNumbers(content);
    shell.appendChild(gutter);

    const input = document.createElement('textarea');
    input.className = 'editorInput';
    input.dataset.recipeId = recipe.id;
    input.spellcheck = false;
    input.value = content;
    input.setAttribute('aria-label', `${recipe.title} editable code`);
    input.addEventListener('input', () => {
        setEditorContent(recipe.id, input.value);
        setEditorError(recipe.id, '');
        gutter.textContent = renderEditorLineNumbers(input.value);
        syncEditorHeight(input);
        syncEditorScroll(input, gutter);
    });
    input.addEventListener('scroll', () => {
        syncEditorScroll(input, gutter);
    });
    shell.appendChild(input);

    window.requestAnimationFrame(() => {
        syncEditorHeight(input);
        syncEditorScroll(input, gutter);
    });

    return shell;
}

function renderError(recipeId) {
    const message = getEditorError(recipeId);
    if (!message) {
        return null;
    }

    const errorNode = document.createElement('p');
    errorNode.className = 'editorError';
    errorNode.textContent = message;
    return errorNode;
}

function renderRecipeCard(recipeId) {
    const recipe = resolveExamplesGalleryRecipe(recipeId);
    const activeColorMode = getColorMode(recipe);
    const card = document.createElement('article');
    card.className = 'recipeCard';
    card.dataset.recipeId = recipe.id;

    const top = document.createElement('div');
    top.className = 'recipeTop';

    const left = document.createElement('div');
    left.className = 'recipeColumn recipeColumnLeft';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'recipeTitleBlock';

    const title = document.createElement('h3');
    title.textContent = recipe.title;
    titleBlock.appendChild(title);

    const runButton = document.createElement('button');
    runButton.type = 'button';
    runButton.className = 'runButton';
    runButton.textContent = 'Run';
    runButton.addEventListener('click', () => {
        runEditorCode(recipe.id);
    });
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'resetButton';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => {
        resetRecipe(recipe.id);
    });
    const actionRow = document.createElement('div');
    actionRow.className = 'actionRow';
    actionRow.appendChild(runButton);
    actionRow.appendChild(resetButton);
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copySnippetButton';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => {
        void copyPortableSnippet(recipe.id);
    });
    actionRow.appendChild(copyButton);
    titleBlock.appendChild(actionRow);

    left.appendChild(titleBlock);

    const right = document.createElement('div');
    right.className = 'recipeColumn recipeColumnRight';

    const description = document.createElement('p');
    description.textContent = recipe.description;
    right.appendChild(description);

    if (recipe.supportsColorModes) {
        right.appendChild(renderColorModeButtons(recipe));
    }

    if (Array.isArray(recipe.notes) && recipe.notes.length > 0) {
        recipe.notes.forEach((noteText) => {
            const note = document.createElement('p');
            note.className = 'cardNote';
            note.textContent = noteText;
            right.appendChild(note);
        });
    }

    top.appendChild(left);
    top.appendChild(right);
    card.appendChild(top);
    card.appendChild(renderEditor(recipe, activeColorMode));

    const errorNode = renderError(recipe.id);
    if (errorNode) {
        card.appendChild(errorNode);
    }

    return card;
}

function renderSection(section) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('section');
    header.className = 'sectionHeader';

    const headerTop = document.createElement('div');
    headerTop.className = 'sectionHeaderTop';

    const title = document.createElement('h2');
    title.textContent = section.title;
    headerTop.appendChild(title);

    header.appendChild(headerTop);

    const description = document.createElement('p');
    if (section.id === 'single-fireworks') {
        description.textContent = 'Edit the recipe code, switch color presets, then run or reset a single-firework composition.';
    } else if (section.id === 'firework-series') {
        description.textContent = 'Edit launch timing, target ratios, and authored start points, then run or reset short repeated-launch sequences.';
    } else if (section.id === 'creative-scenes') {
        description.textContent = 'Edit confetti, snow, and meteor scenes for reusable ambient and cinematic overlays.';
    } else {
        description.textContent = 'Edit rocket.cascade timing and spread, then run or reset follow-up bursts that extend beyond the rocket count.';
    }
    header.appendChild(description);
    fragment.appendChild(header);

    section.recipeIds.forEach((recipeId) => {
        fragment.appendChild(renderRecipeCard(recipeId));
    });

    return fragment;
}

function renderGallery() {
    gallery.replaceChildren(...EXAMPLES_GALLERY_SECTIONS.map(renderSection));
    refreshFloatingMetrics();
}

window.addEventListener('beforeunload', () => {
    if (floatingMetricsUpdateIntervalId !== null) {
        window.clearInterval(floatingMetricsUpdateIntervalId);
        floatingMetricsUpdateIntervalId = null;
    }
    clearScheduledLaunches();
    isolatedConfettiEngine?.destroy();
    isolatedConfettiEngine = null;
    window.removeEventListener('pointermove', onFloatingMetricsPointerMove);
    window.removeEventListener('pointerup', onFloatingMetricsPointerUp);
    window.removeEventListener('resize', onFloatingMetricsViewportResize);
    engine.destroy();
});

attachEngineFpsProbe(engine, mainFpsState);
initializeFloatingMetricsWidget();
renderGallery();
startFloatingMetricsUpdates();
