// On-screen markers for onBurst events, shared by the lab and the examples gallery.
// Boundary markers (tracked victory sequence) show FIRST / LAST labels.

const STYLE_ID = 'fireworks-engine-burst-marker-style';

const MARKER_CSS = `
.burstMarker {
    position: fixed;
    z-index: 30;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border: 2px solid rgba(191, 219, 254, 0.9);
    border-radius: 50%;
    pointer-events: none;
    animation: burstMarkerFade 700ms ease-out forwards;
}

.burstMarkerBoundary {
    width: auto;
    height: auto;
    margin: -14px 0 0 -30px;
    padding: 4px 8px;
    border-color: #ffd166;
    border-radius: 999px;
    background: rgba(10, 16, 30, 0.85);
    color: #ffd166;
    font: 700 12px/1 system-ui, sans-serif;
    animation-duration: 1600ms;
}

@keyframes burstMarkerFade {
    from { opacity: 1; transform: scale(0.6); }
    to { opacity: 0; transform: scale(1.6); }
}
`;

function ensureMarkerStyle(documentRef) {
    if (documentRef.getElementById(STYLE_ID)) {
        return;
    }
    const style = documentRef.createElement('style');
    style.id = STYLE_ID;
    style.textContent = MARKER_CSS;
    documentRef.head.appendChild(style);
}

/** Marks a burst at viewport coordinates; FIRST / LAST label for tracked boundaries. */
export function showBurstMarker(x, y, sequence = null, documentRef = document) {
    ensureMarkerStyle(documentRef);
    const marker = documentRef.createElement('div');
    const isBoundary = !!(sequence?.isFirst || sequence?.isLast);
    marker.className = `burstMarker${isBoundary ? ' burstMarkerBoundary' : ''}`;
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    if (isBoundary) {
        marker.textContent = [sequence.isFirst ? 'FIRST' : '', sequence.isLast ? 'LAST' : '']
            .filter(Boolean)
            .join(' + ');
    }
    marker.addEventListener('animationend', () => marker.remove());
    documentRef.body.appendChild(marker);
    return marker;
}
