const paths = {
  'dinosaur-avatar': '<path d="m7 6-2-3 4 1 3-3 2 3 4-1-1 4" fill="#ffc946" stroke="#37552b" stroke-width=".8"/><path d="M4 12C4 5 7 4 12 4s8 2 8 8v4c0 5-16 5-16 0Z" fill="#81c849" stroke="#37552b" stroke-width=".9"/><ellipse cx="9" cy="10.5" rx="2.5" ry="3.2" fill="#fffef2" stroke="none"/><ellipse cx="15" cy="10.5" rx="2.5" ry="3.2" fill="#fffef2" stroke="none"/><ellipse cx="9.5" cy="11" rx="1.1" ry="1.8" fill="#223e2a" stroke="none"/><ellipse cx="14.5" cy="11" rx="1.1" ry="1.8" fill="#223e2a" stroke="none"/><path d="M3 15c0-4 18-4 18 0v2c0 6-18 6-18 0Z" fill="#b4e26d" stroke="#37552b" stroke-width=".9"/><circle cx="8" cy="15" r=".6" fill="#37552b" stroke="none"/><circle cx="16" cy="15" r=".6" fill="#37552b" stroke="none"/><path d="M9 18q3 2.4 6 0" stroke="#37552b" stroke-width="1"/><ellipse cx="5.5" cy="17" rx="1.3" ry=".7" fill="#f5ac85" stroke="none"/><ellipse cx="18.5" cy="17" rx="1.3" ry=".7" fill="#f5ac85" stroke="none"/>',
  dinosaur: '<path d="m7 5-3-1 1 4-3 1 3 3-3 2 4 2" fill="#f5d67e" stroke="#4b683e" stroke-width="1"/><path d="M8 21C4 22 1 20 1 16q3 3 5-2V8q0-5 6-5 5 0 5 4h3q3 0 3 4t-7 3v4q2 1 1 3h-4l-1-2h-2v2Z" fill="#b9dc83" stroke="#426044" stroke-width="1.2"/><path d="M10 14q5 0 4 5h-4Z" fill="#edf2c0" stroke="none"/><ellipse cx="12" cy="7.5" rx="2.3" ry="2.8" fill="#fffdf0" stroke="none"/><ellipse cx="12.7" cy="8" rx=".9" ry="1.4" fill="#304c35" stroke="none"/><circle cx="20" cy="9.5" r=".65" fill="#426044" stroke="none"/><path d="M18 12q2 1 3-.5M14 15l2 1" stroke="#426044" stroke-width="1"/><ellipse cx="16" cy="11" rx="1.3" ry=".8" fill="#efb399" stroke="none"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  exhibition: '<rect x="4" y="3" width="16" height="17" rx="2"/><path d="M4 12h16M12 3v9M7 20v2M17 20v2M10 16h4"/><path d="M9 7v2m6-2v2"/>',
  contract: '<path d="M4 9h5V4M15 4v5h5M20 15h-5v5M9 20v-5H4"/>',
  minus: '<path d="M5 12h14"/>',
  gallery: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  materials: '<path d="M3 7V4h6l3 3h9v14H3Z"/><path d="M9 17c-2-5 2-7 7-7 0 5-2 8-7 7Zm-1 2 6-6"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  microphone: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  scatter: '<path d="m4 4 4 1-1 4-4-1ZM14 14l6-1 1 6-6 1Z"/><circle cx="17" cy="6" r="3"/><path d="M5 15v6M2 18h6M12 10v3M10.5 11.5h3"/>',
  leaf: '<path d="M5 19C-1 8 9 3 21 3c0 12-7 20-16 16ZM3 21 16 8"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14"/>',
  redo: '<path d="m16 4 5 5-5 5m5-5H10a7 7 0 0 0 0 14"/>',
  frame: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" rx=".5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  message: '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8M8 12h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.2-1.5 3M12 17h.01"/>',
};
export function icons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    setIcon(el,el.dataset.icon);
  });
}
export function setIcon(el,name){el.dataset.icon=name;el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;}
