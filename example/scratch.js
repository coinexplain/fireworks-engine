const snippetSource = document.getElementById('snippetSource');
const runButton = document.getElementById('runSnippet');
const status = document.getElementById('scratchStatus');
const coreModuleUrl = new URL('../src/index.js', window.location.href).href;
const IDLE_STATUS_TEXT = typeof status?.textContent === 'string'
    ? status.textContent
    : '';

let activeRunId = 0;
let activeBlobUrl = null;
let activeModuleScript = null;
let detachDiagnostics = null;

function normalizeSnippetText(source) {
    const trimmed = source.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }

    const lines = trimmed.split('\n');
    if (lines.length < 3) {
        return trimmed;
    }

    const withoutFirstFence = lines.slice(1);
    if (withoutFirstFence[withoutFirstFence.length - 1].trim().startsWith('```')) {
        withoutFirstFence.pop();
    }

    return withoutFirstFence.join('\n').trim();
}

function resolveRunnableSource(source) {
    const normalized = normalizeSnippetText(source);
    const coreSpecifierPattern = /(['"])@fireworks-engine\/core\1/g;
    return normalized.replace(coreSpecifierPattern, `'${coreModuleUrl}'`);
}

function reportRuntimeError(runId, prefix, message) {
    if (runId !== activeRunId) {
        return;
    }

    const details = typeof message === 'string' && message.trim()
        ? message.trim()
        : 'Unknown runtime error.';
    status.textContent = `${prefix}: ${details}`;
}

function attachDiagnostics(runId) {
    const onError = (event) => {
        reportRuntimeError(runId, 'Snippet error', event?.message);
    };

    const onUnhandledRejection = (event) => {
        reportRuntimeError(runId, 'Snippet rejection', String(event?.reason ?? 'Unhandled rejection'));
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
}

function cleanupPreviousRun() {
    if (typeof detachDiagnostics === 'function') {
        detachDiagnostics();
        detachDiagnostics = null;
    }

    if (activeModuleScript?.parentNode) {
        activeModuleScript.parentNode.removeChild(activeModuleScript);
    }
    activeModuleScript = null;

    if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = null;
    }
}

function runSnippet() {
    const source = snippetSource.value.trim();
    if (!source) {
        status.textContent = 'Paste a snippet first.';
        return;
    }

    activeRunId += 1;
    const runId = activeRunId;
    const runnableSource = resolveRunnableSource(source);

    cleanupPreviousRun();
    status.textContent = IDLE_STATUS_TEXT;

    detachDiagnostics = attachDiagnostics(runId);

    try {
        activeBlobUrl = URL.createObjectURL(new Blob([runnableSource], { type: 'text/javascript' }));

        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.src = activeBlobUrl;
        moduleScript.addEventListener('error', () => {
            reportRuntimeError(runId, 'Snippet load error', 'Module could not be loaded.');
        });

        document.body.appendChild(moduleScript);
        activeModuleScript = moduleScript;
    } catch {
        status.textContent = 'Could not run the snippet. Check browser console for details.';
    }
}

runButton.addEventListener('click', runSnippet);
snippetSource.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        runSnippet();
    }
});
