import { prefersReducedMotion as defaultPrefersReducedMotion } from './runtimeCapabilities.js';

const HIDDEN_DOCUMENT_TIMEOUT_RETRY_MS = 250;

function resolveEngineRef(value, fallback) {
    if (value !== undefined) {
        return value;
    }

    if (fallback !== undefined) {
        return fallback;
    }

    return null;
}

function resolveFrameFunction(engine, refKey, methodName) {
    const engineFn = engine[refKey];
    if (typeof engineFn === 'function') {
        return engineFn;
    }

    const win = getWindow(engine);
    const winFn = win?.[methodName];
    if (typeof winFn === 'function') {
        return winFn.bind(win);
    }

    const globalFn = globalThis[methodName];
    if (typeof globalFn === 'function') {
        return globalFn.bind(globalThis);
    }

    return null;
}

export function getDocument(engine) {
    return resolveEngineRef(engine.documentRef, globalThis.document);
}

export function getWindow(engine) {
    return resolveEngineRef(engine.windowRef, globalThis.window);
}

export function getRequestAnimationFrame(engine) {
    return resolveFrameFunction(engine, 'requestAnimationFrameRef', 'requestAnimationFrame');
}

export function getCancelAnimationFrame(engine) {
    return resolveFrameFunction(engine, 'cancelAnimationFrameRef', 'cancelAnimationFrame');
}


export function getNow(engine) {
    const nowRef = engine.nowRef;
    if (typeof nowRef === 'function') {
        return nowRef();
    }

    const performanceNow = globalThis.performance?.now;
    if (typeof performanceNow === 'function') {
        return performanceNow.call(globalThis.performance);
    }

    return Date.now();
}

export function isDocumentHidden(engine) {
    const doc = getDocument(engine);
    return doc?.hidden === true || doc?.visibilityState === 'hidden';
}

export function shouldReduceMotion(engine) {
    if (typeof engine.prefersReducedMotionRef === 'function') {
        return !!engine.prefersReducedMotionRef();
    }

    return defaultPrefersReducedMotion();
}

export function resolveRoot(engine) {
    const doc = getDocument(engine);

    if (typeof engine.rootRef === 'function') {
        return engine.rootRef({ document: doc, window: getWindow(engine) }) || null;
    }

    if (engine.rootRef) {
        return engine.rootRef;
    }

    return doc?.body || doc?.documentElement || null;
}

export function usesElementScopedCanvas(engine) {
    const doc = getDocument(engine);
    const root = resolveRoot(engine);
    return !!root && root !== doc?.body && root !== doc?.documentElement;
}

export function addResizeListener(engine) {
    if (engine.hasResizeListener) {
        return;
    }

    const win = getWindow(engine);
    if (typeof win?.addEventListener !== 'function') {
        return;
    }

    win.addEventListener('resize', engine.resize, { passive: true });
    engine.hasResizeListener = true;
}

export function removeResizeListener(engine) {
    if (!engine.hasResizeListener) {
        return;
    }

    const win = getWindow(engine);
    win?.removeEventListener?.('resize', engine.resize);
    engine.hasResizeListener = false;
}

export function addResizeObserver(engine) {
    if (engine.hasResizeObserver) {
        return true;
    }

    const ResizeObserverCtor = globalThis.ResizeObserver;
    if (typeof ResizeObserverCtor !== 'function') {
        return false;
    }

    const root = resolveRoot(engine);
    if (!root || typeof root.nodeType !== 'number') {
        return false;
    }

    const observer = new ResizeObserverCtor(() => {
        if (engine.canvas && engine.ctx) {
            engine.resize();
        }
    });

    observer.observe(root);
    engine.resizeObserver = observer;
    engine.hasResizeObserver = true;
    return true;
}

export function removeResizeObserver(engine) {
    if (!engine.hasResizeObserver) {
        return;
    }

    engine.resizeObserver?.disconnect?.();
    engine.resizeObserver = null;
    engine.hasResizeObserver = false;
}

export function scheduleTimeout(engine, callback, delay = 0) {
    const generation = engine.runGeneration;
    const schedule = typeof engine.setTimeoutRef === 'function' ? engine.setTimeoutRef : setTimeout;

    let timeoutId = null;
    const runWhenVisible = () => {
        if (engine.runGeneration !== generation) return;
        if (timeoutId !== null) {
            engine.timeoutIds.delete(timeoutId);
        }

        if (isDocumentHidden(engine)) {
            timeoutId = schedule(runWhenVisible, HIDDEN_DOCUMENT_TIMEOUT_RETRY_MS);
            engine.timeoutIds.add(timeoutId);
            return;
        }

        callback();
    };

    timeoutId = schedule(runWhenVisible, delay);

    engine.timeoutIds.add(timeoutId);
    return timeoutId;
}

export function resolveScaledDelay(engine, delay = 0) {
    const baseDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0;
    const timeScale = Number.isFinite(engine.timeScale) && engine.timeScale > 0
        ? engine.timeScale
        : 1;
    return baseDelay / timeScale;
}

export function clearScheduledTimeouts(engine) {
    const clear = typeof engine.clearTimeoutRef === 'function' ? engine.clearTimeoutRef : clearTimeout;
    engine.timeoutIds.forEach((timeoutId) => {
        clear(timeoutId);
    });
    engine.timeoutIds.clear();
}

export function clearPendingStart(engine) {
    if (engine.hasDomReadyListener) {
        getDocument(engine)?.removeEventListener?.('DOMContentLoaded', engine.handleDOMContentLoaded);
    }
    engine.hasDomReadyListener = false;
    engine.pendingStartConfig = null;
}

export function handleDOMContentLoaded(engine) {
    engine.hasDomReadyListener = false;
    const nextConfig = engine.pendingStartConfig;
    engine.pendingStartConfig = null;

    if (nextConfig) {
        engine.start(nextConfig);
    }
}

export function schedulePendingStart(engine, config) {
    const doc = getDocument(engine);
    engine.pendingStartConfig = config;

    if (doc?.readyState !== 'loading' || engine.hasDomReadyListener) {
        return false;
    }

    doc.addEventListener('DOMContentLoaded', engine.handleDOMContentLoaded, { once: true });
    engine.hasDomReadyListener = true;
    return true;
}

export function ensureCanvas(engine) {
    if (engine.canvas && engine.ctx) {
        return true;
    }

    const doc = getDocument(engine);
    const root = resolveRoot(engine);
    if (!doc || !root || typeof doc.createElement !== 'function' || typeof root.appendChild !== 'function') {
        return false;
    }

    const canvas = doc.createElement('canvas');
    const ctx = canvas.getContext?.('2d', { alpha: true });
    if (!ctx) {
        return false;
    }

    if (usesElementScopedCanvas(engine)) {
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    } else {
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
    }

    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = String(engine.canvasZIndex);
    canvas.style.display = 'none';

    root.appendChild(canvas);

    engine.canvas = canvas;
    engine.ctx = ctx;
    if (usesElementScopedCanvas(engine)) {
        if (!addResizeObserver(engine)) {
            addResizeListener(engine);
        }
    } else {
        addResizeListener(engine);
    }
    resizeCanvas(engine);

    return true;
}

export function startLoop(engine) {
    if (!engine.canvas) {
        return false;
    }

    const requestAnimationFrameFn = getRequestAnimationFrame(engine);
    if (typeof requestAnimationFrameFn !== 'function') {
        return false;
    }

    engine.canvas.style.display = 'block';

    if (engine.running) {
        return true;
    }

    clearPendingStart(engine);
    engine.running = true;
    engine.lastTime = getNow(engine);
    engine.rafId = requestAnimationFrameFn(engine.loopFrame);
    return true;
}

export function resizeCanvas(engine) {
    if (!engine.canvas || !engine.ctx) {
        return;
    }

    const win = getWindow(engine);
    const doc = getDocument(engine);
    const root = resolveRoot(engine);
    const rootRect = usesElementScopedCanvas(engine) && typeof root?.getBoundingClientRect === 'function'
        ? root.getBoundingClientRect()
        : null;
    const viewportWidth = Number(win?.innerWidth) || Number(doc?.documentElement?.clientWidth) || 1;
    const viewportHeight = Number(win?.innerHeight) || Number(doc?.documentElement?.clientHeight) || 1;
    const renderWidth = Number(rootRect?.width) || viewportWidth;
    const renderHeight = Number(rootRect?.height) || viewportHeight;
    const devicePixelRatio = Number(win?.devicePixelRatio) || 1;
    const dpr = Math.min(Math.max(devicePixelRatio, 1), engine.maxDevicePixelRatio);

    engine.dpr = dpr;
    engine.width = Math.max(1, Math.floor(renderWidth));
    engine.height = Math.max(1, Math.floor(renderHeight));
    engine.canvas.width = Math.floor(engine.width * dpr);
    engine.canvas.height = Math.floor(engine.height * dpr);
    engine.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
