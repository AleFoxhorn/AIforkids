import { materialFiles } from './artwork-store.js';
import { preparePhoto, makeTransparentMaterial, requestMaterial } from './material-generation.js';
import { showGenerationQuotaError } from './generation-errors.js';
import { GENERATION_ENABLED } from './features.js';

// Originals are committed before a chargeable request. Reload never retries a
// request automatically; successful raw results can be processed without billing.
export function setupGeneratedUploads({ button, input, controls, load, add, flash, settled }) {
  if (!GENERATION_ENABLED) {
    button.title = '试用版暂停生图，先玩玩内置素材';
    button.onclick = () => flash('试用版暂未开放照片生图，可以使用内置素材自由拼贴');
    input.disabled = true;
    return;
  }
  const archive = document.createElement('button'); archive.dataset.icon = 'gallery'; archive.title = '上传记录与原图'; archive.setAttribute('aria-label', archive.title); controls.append(archive);
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.style.cssText = 'font-size:13px;margin:8px 16px;max-width:320px'; status.textContent = '照片将用于云端生成，原图保存在本机'; controls.parentElement.after(status);
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', '上传记录与原图'); dialog.className = 'upload-archive'; document.body.append(dialog);
  let running = false;
  function download(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
  async function renderArchive() {
    dialog.replaceChildren();
    const title = document.createElement('h2'); title.textContent = '上传记录';
    const close = document.createElement('button'); close.textContent = '关闭'; close.onclick = () => dialog.close(); const header = document.createElement('div'); header.className = 'modal-title'; header.append(title, close); dialog.append(header);
    const records = (await materialFiles('list')).sort((a, b) => b.createdAt - a.createdAt);
    if (!records.length) { const empty = document.createElement('p'); empty.textContent = '还没有上传照片'; dialog.append(empty); }
    for (const record of records) {
      const row = document.createElement('div'); row.style.cssText = 'padding:12px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
      const label = document.createElement('span'); label.style.cssText = 'flex-basis:100%;overflow-wrap:anywhere'; label.textContent = `${record.name || '照片'} · ${record.status === 'ready' ? '已生成' : record.status === 'pending' ? '未完成' : record.status === 'failed' ? '未完成' : '已导入'}`; row.append(label);
      const original = document.createElement('button'); original.textContent = '原图 ↓'; original.onclick = () => download(record.originalBlob || record.blob, record.name || '原图.png'); row.append(original);
      if (record.generatedBlob) { const raw = document.createElement('button'); raw.textContent = '生成图 ↓'; raw.onclick = () => download(record.generatedBlob, '胶带生成图.png'); row.append(raw); }
      if (record.originalBlob && record.status !== 'ready') {
        const retry = document.createElement('button'); retry.textContent = record.generatedBlob ? '重新去底' : '重试生成'; retry.title = record.generatedBlob ? '使用已保存的生成图，不调用模型' : '重新调用模型，可能产生费用'; retry.disabled = running;
        retry.onclick = () => { dialog.close(); generate(record); }; row.append(retry);
      }
      dialog.append(row);
    }
  }
  archive.onclick = async () => { try { await renderArchive(); dialog.showModal(); } catch { flash('无法读取本机上传记录'); } };
  async function generate(record) {
    if (running) return;
    running = true; button.disabled = true; let src;
    status.textContent = '正在识别主体并制作胶带素材…可以继续拼贴';
    try {
      record = { ...record, status: 'pending' }; await materialFiles('put', record);
      if (!record.generatedBlob) {
        const result = await requestMaterial(await preparePhoto(record.originalBlob));
        record.generatedBlob = await (await fetch(result.image)).blob(); record.models = result.models;
        await materialFiles('put', record);
      }
      const blob = await makeTransparentMaterial(record.generatedBlob);
      src = URL.createObjectURL(blob); const material = { id: record.id, label: '上传的素材', width: 160, src };
      await load(material);
      await materialFiles('put', { ...record, blob, status: 'ready' });
      add(material); src = null;
      status.textContent = '胶带素材已加入素材库'; flash('素材做好了，长按拖入画布');
    } catch (error) {
      if (src) URL.revokeObjectURL(src);
      let retained = true; try { await materialFiles('put', { ...record, status: 'failed' }); } catch { retained = false; }
      status.textContent = retained ? `${error.message || '生成未完成'} 原图已保留，可在上传记录中下载。` : '本机存储失败，请保留自己的原始照片';
      if (!showGenerationQuotaError(error, document.getElementById('generationQuotaDialog'))) flash(error.message || '生成失败，请稍后再试');
    } finally { running = false; button.disabled = false; settled(); }
  }
  input.onchange = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file || running) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return flash('请选择 PNG、JPG 或 WebP 图片');
    if (file.size > 20 * 1024 * 1024) return flash('请选择 20 MB 以内的图片');
    generate({ id: `upload-${crypto.randomUUID()}`, originalBlob: file, name: file.name, createdAt: Date.now() });
  };
}
