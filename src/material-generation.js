export function removeKeyBackground(pixels, width, height) {
  const n = width * height;
  let keyed = 0, visible = 0, borderKey = 0, borderCount = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4, r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
    const match = r > 180 && b > 180 && g < 95 && Math.abs(r - b) < 75;
    const border = i < width || i >= n - width || i % width === 0 || i % width === width - 1;
    if (border) { borderCount++; if (match || pixels[p + 3] < 20) borderKey++; }
    if (match) { pixels[p + 3] = 0; keyed++; }
    else if (pixels[p + 3] > 20) visible++;
  }
  if (borderKey / borderCount < 0.85 || visible / n < 0.02 || (keyed < n * 0.05 && !pixels.some((v, i) => i % 4 === 3 && v < 20))) throw new Error('生成图片的背景未能分离，原图和生成结果已保留，请换张照片再试。');
  return pixels;
}
export async function preparePhoto(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const ratio = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally { bitmap.close(); }
}
export async function makeTransparentMaterial(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width * bitmap.height > 16000000) throw new Error('生成图片尺寸过大。');
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    removeKeyBackground(data.data, canvas.width, canvas.height); ctx.putImageData(data, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('素材转换失败。')), 'image/png'));
  } finally { bitmap.close(); }
}
export async function requestMaterial(image) {
  const response = await fetch('/api/materials/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }), signal: AbortSignal.timeout(200000) });
  let result; try { result = await response.json(); } catch { throw new Error('本机生图服务未启动，请联系开发者。'); }
  if (!response.ok) throw Object.assign(new Error(result.error?.message || '生图暂不可用'), { code: result.error?.code });
  return result;
}
