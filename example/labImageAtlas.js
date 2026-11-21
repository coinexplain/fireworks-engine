// Image atlas for the lab `image` form shape: a built-in demo atlas and grid frames
// from a user-loaded image file. Frames reference the image; they are never cloned.

const DEMO_ATLAS_COLUMNS = 4;
const DEMO_ATLAS_ROWS = 2;

function drawCoin(ctx, cx, cy, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    for (let petal = 0; petal < 6; petal += 1) {
        const angle = (petal / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * radius * 0.34, cy + Math.sin(angle) * radius * 0.34, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStick(ctx, cx, cy, size, color) {
    const width = size * 0.2;
    const height = size * 0.78;
    ctx.fillStyle = color;
    ctx.fillRect(cx - width / 2, cy - height / 2, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - width / 2, cy - size * 0.02, width, size * 0.04);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy - height / 2, width * 0.85, size * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + height / 2, width * 0.85, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawText(ctx, cx, cy, size, text, color) {
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(size * 0.72)}px "Noto Serif CJK SC", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + size * 0.03);
}

function drawFlower(ctx, cx, cy, size, petalColor, coreColor) {
    ctx.fillStyle = petalColor;
    for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(angle) * size * 0.2, cy + Math.sin(angle) * size * 0.2, size * 0.17, size * 0.11, angle, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
}

function drawLeaf(ctx, cx, cy, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.36, size * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.24, cy + size * 0.24);
    ctx.lineTo(cx + size * 0.24, cy - size * 0.24);
    ctx.stroke();
}

const DEMO_CELLS = Object.freeze([
    (ctx, cx, cy, size) => drawCoin(ctx, cx, cy, size * 0.4, '#0958ae'),
    (ctx, cx, cy, size) => drawCoin(ctx, cx, cy, size * 0.4, '#c33327'),
    (ctx, cx, cy, size) => drawStick(ctx, cx, cy, size, '#1c914a'),
    (ctx, cx, cy, size) => drawText(ctx, cx, cy, size, '萬', '#c33327'),
    (ctx, cx, cy, size) => drawText(ctx, cx, cy, size, '東', '#0958ae'),
    (ctx, cx, cy, size) => drawFlower(ctx, cx, cy, size, '#d6336c', '#ea9b23'),
    (ctx, cx, cy, size) => drawStick(ctx, cx, cy, size, '#c33327'),
    (ctx, cx, cy, size) => drawLeaf(ctx, cx, cy, size, '#82a439'),
]);

/** Demo atlas: 4×2 cells of multi-colored sample elements, drawn at the given cell size. */
export function createDemoAtlas(cellSize, documentRef = document) {
    const canvas = documentRef.createElement('canvas');
    canvas.width = cellSize * DEMO_ATLAS_COLUMNS;
    canvas.height = cellSize * DEMO_ATLAS_ROWS;
    const ctx = canvas.getContext('2d');
    DEMO_CELLS.forEach((drawCell, index) => {
        const column = index % DEMO_ATLAS_COLUMNS;
        const row = Math.floor(index / DEMO_ATLAS_COLUMNS);
        drawCell(ctx, (column + 0.5) * cellSize, (row + 0.5) * cellSize, cellSize);
    });
    return canvas;
}

function resolveSourceSize(source) {
    return {
        width: source.naturalWidth || source.width || 0,
        height: source.naturalHeight || source.height || 0,
    };
}

function readAlphaData(source, width, height, documentRef) {
    try {
        const canvas = documentRef.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0);
        return ctx.getImageData(0, 0, width, height).data;
    } catch {
        // Cross-origin images cannot be read back; keep every cell then.
        return null;
    }
}

function isCellEmpty(alphaData, sourceWidth, x, y, cellSize) {
    for (let row = y; row < y + cellSize; row += 2) {
        for (let column = x; column < x + cellSize; column += 2) {
            if (alphaData[((row * sourceWidth) + column) * 4 + 3] > 0) {
                return false;
            }
        }
    }
    return true;
}

function resolveGridOptions(grid = {}) {
    const value = (key) => (Number.isFinite(grid[key]) && grid[key] > 0 ? Math.floor(grid[key]) : 0);
    return { offsetX: value('offsetX'), offsetY: value('offsetY'), gapX: value('gapX'), gapY: value('gapY') };
}

function countGridCells(length, offset, cellSize, gap) {
    const available = length - offset;
    return available >= cellSize ? Math.floor((available - cellSize) / (cellSize + gap)) + 1 : 0;
}

/**
 * Grid layout: cells of `cellSize` start at (offsetX, offsetY) and repeat every
 * cellSize + gap. Only whole cells are counted; leftovers at the right and bottom are ignored.
 */
export function resolveGridLayout(source, cellSize, grid = {}) {
    const { width, height } = resolveSourceSize(source);
    const options = resolveGridOptions(grid);
    return {
        ...options,
        cellSize,
        columns: countGridCells(width, options.offsetX, cellSize, options.gapX),
        rows: countGridCells(height, options.offsetY, cellSize, options.gapY),
    };
}

/** Number of whole grid columns. */
export function resolveGridColumns(source, cellSize, grid = {}) {
    return resolveGridLayout(source, cellSize, grid).columns;
}

/** Cell under a point in source pixels, or -1 for a gap, the offset margin, or leftovers. */
export function resolveGridCellAt(layout, sourceX, sourceY) {
    const stepX = layout.cellSize + layout.gapX;
    const stepY = layout.cellSize + layout.gapY;
    const localX = sourceX - layout.offsetX;
    const localY = sourceY - layout.offsetY;
    if (localX < 0 || localY < 0) return -1;
    const column = Math.floor(localX / stepX);
    const row = Math.floor(localY / stepY);
    const insideX = localX - column * stepX < layout.cellSize;
    const insideY = localY - row * stepY < layout.cellSize;
    if (!insideX || !insideY || column >= layout.columns || row >= layout.rows) return -1;
    return row * layout.columns + column;
}

/**
 * Frames for every non-empty grid cell of the source (see resolveGridLayout).
 * `cellIndex` numbers cells row by row over the whole grid (empty cells included), so indices
 * stay stable when frames are picked for a group. The engine ignores the extra field.
 */
export function buildGridFrames(source, cellSize, grid = {}, documentRef = document) {
    const layout = resolveGridLayout(source, cellSize, grid);
    if (layout.columns === 0 || layout.rows === 0) {
        return [];
    }

    const { width, height } = resolveSourceSize(source);
    const alphaData = readAlphaData(source, width, height, documentRef);
    const frames = [];
    for (let row = 0; row < layout.rows; row += 1) {
        for (let column = 0; column < layout.columns; column += 1) {
            const x = layout.offsetX + column * (cellSize + layout.gapX);
            const y = layout.offsetY + row * (cellSize + layout.gapY);
            if (alphaData && isCellEmpty(alphaData, width, x, y, cellSize)) {
                continue;
            }
            frames.push({ source, x, y, width: cellSize, height: cellSize, cellIndex: row * layout.columns + column });
        }
    }
    return frames;
}

/** Frames of the listed cells, in cell order. Unknown or empty cells are skipped. */
export function selectFramesByCells(frames, cells) {
    const wanted = new Set(cells);
    return frames.filter((frame) => wanted.has(frame.cellIndex));
}

/** Loads a local image file; the object URL stays alive while the image is used. */
export async function loadImageFile(file) {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    await image.decode();
    return image;
}
