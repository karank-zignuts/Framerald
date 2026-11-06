export type Placed = { x: number; y: number; width: number; height: number };
export type MasonryLayout = { items: Placed[]; height: number; columns: number };

/**
 * Places items of any shape in columns, each in the shortest one so far, like a Pinterest board.
 * `ratios` are width / height. Columns are at least `minColumnWidth` wide and share the container's width evenly.
 */
export function layoutMasonry(ratios: number[], containerWidth: number, minColumnWidth: number, gap: number): MasonryLayout {
  const columns = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
  const columnWidth = Math.max(0, (containerWidth - gap * (columns - 1)) / columns);
  const heights = new Array<number>(columns).fill(0);
  const items = ratios.map((raw): Placed => {
    const ratio = Number.isFinite(raw) && raw > 0 ? raw : 1; // an unknown shape counts as square
    const height = columnWidth / ratio;
    let column = 0;
    for (let c = 1; c < columns; c++) if (heights[c] < heights[column]) column = c;
    const placed = { x: column * (columnWidth + gap), y: heights[column], width: columnWidth, height };
    heights[column] += height + gap;
    return placed;
  });
  const total = ratios.length ? Math.max(...heights) - gap : 0;
  return { items, height: total, columns };
}
