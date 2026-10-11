// Presentation only: the tip follows the same board-space contact point as the grab constraint.
export function createTwigCursor(board, assistant = false) {
  const cursor = document.createElement('div');
  cursor.className = assistant ? 'twig-cursor ai-twig' : 'twig-cursor';
  cursor.hidden = true;
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4 12 12 21 27 31 39 39 54 53 73 58 70 44 49 36 34 26 22 16 9Z" fill="#8c6746" stroke="#65482f" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="m32 36 5-14 9-9 3 2-8 10-4 18" fill="#8c6746" stroke="#65482f" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="m11 12 12 15 11 14 11 20 9 11M36 35l4-12 6-7" fill="none" stroke="#bea17b" stroke-width="1.5" stroke-linecap="round"/>
    <path d="m22 28 4-1m13 24 4-1m-11-10 4 1m9 20 4-1" fill="none" stroke="#65482f" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="4" cy="4" r="2" fill="#c7b28d"/>
  </svg>`;
  board.append(cursor);
  return {
    show(point) {
      cursor.style.left = `${point.x}px`;
      cursor.style.top = `${point.y}px`;
      cursor.hidden = false;
      if (!assistant) board.classList.add('has-twig-cursor');
    },
    hide() {
      cursor.hidden = true;
      if (!assistant) board.classList.remove('has-twig-cursor');
    },
  };
}
