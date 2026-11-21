# Proposal: atlas frames from texture packer JSON in the lab

Status: proposal, not scheduled. Recorded 2026-11-21 at the owner's request so it is not lost.

## Problem

The lab (`example/lab.html`) slices an atlas into a grid: equal cells, the first one placed at
offset X/Y, the next ones repeating every "cell size + gap". Partial cells at the right and bottom
edges are dropped. This is enough for atlases with equal-size frames in a regular grid, including
frames with margins around them.

Atlases built by a texture packer are not covered: frames of different sizes, tight packing,
rotated or alpha-trimmed frames. The grid slices them wrongly and does not report it.

The engine itself is not the limit: `burstForms.images` accepts any rectangles
`{ source, x, y, width, height }`. The limitation is only in how the lab obtains frames.

## Proposal

Load a JSON file with frame rectangles together with the atlas image and take frames from it
instead of the grid.

- Format: Free Texture Packer JSON hash, which is compatible with the TexturePacker format:
  `frames: { [name]: { frame: { x, y, w, h }, rotated, trimmed, spriteSourceSize, sourceSize } }`.
- Each frame gets its name from the JSON. Frame groups are selected by name rather than by cell
  index: names survive repacking the atlas, cell indices do not.
- The preview shows the frame rectangles from the JSON; clicking a frame adds it to or removes it
  from the active group, as cells work now.
- **Copy snippet** outputs frames with explicit rectangles, or code that reads the same JSON.
- Grid mode stays for atlases without JSON.

## Open questions

- Rotated frames (`rotated: true`): the engine draws frames unrotated. Either forbid rotation when
  packing, or add 90° frame rotation to the engine.
- Alpha trimming (`trimmed`): draw only the trimmed part (the particle becomes smaller than the
  original drawing), or restore the original canvas via `spriteSourceSize`/`sourceSize` (needs
  engine support for an image offset inside the frame).
- Whether the second format (TexturePacker JSON array) is needed, or hash is enough.

## Scope

Lab only: JSON parsing, frame preview and selection, groups by name, snippet. The engine does not
change if the packer is configured without rotation and trimming.
