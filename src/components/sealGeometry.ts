export const SEAL_BASE_Y = 124;
export const SEAL_START_X = 87;
export const SEAL_END_X = 913;
export const getSealEdgeY = (x: number) => SEAL_BASE_Y + Math.sin(x * .11) * 2 + Math.sin(x * .27);

export function getSealEdgePath(endX: number, startX = 0) {
  let path = `M${startX} ${getSealEdgeY(startX)}`;
  for (let x = Math.ceil((startX + 1) / 8) * 8; x < endX; x += 8) {
    path += `L${x} ${getSealEdgeY(x)}`;
  }
  return `${path}L${endX} ${getSealEdgeY(endX)}`;
}
