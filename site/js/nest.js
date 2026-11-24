// The landing page: each project's own moving background on its side, the meeting point leaning towards whichever
// side is pointed at, and the choice remembered (js/remembered.js uses it on the next visit).
import { startCipher } from '../mac/js/shared/cipher.js';
import { startEmbers } from '../windows/js/shared/ember.js';

const KEY = 'nest.choice.v1';
const root = document.documentElement;
const split = document.getElementById('split');

// The headline sits where the two meet: both backgrounds go quiet behind it, as they do behind each site's text.
const calm = () => document.querySelector('.center');
startCipher(document.querySelector('.perch-bg'), { calm });
startEmbers(document.querySelector('.roost-bg'), { calm });

// Lean towards the side being pointed at (or focused): it grows, and the fade follows.
const lean = side => {
  split.dataset.leaning = side ?? '';
  if (!side) delete split.dataset.leaning;
  // A gentle lean: enough to feel the side respond, not so much that the middle swings about.
  root.style.setProperty('--split', side === 'mac' ? '53' : side === 'windows' ? '47' : '50');
};
for (const el of document.querySelectorAll('.side')) {
  const side = el.dataset.choice;
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') lean(side); });
  el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') lean(null); });
  el.addEventListener('focus', () => lean(side));
  el.addEventListener('blur', () => lean(null));
  // Choosing remembers it.
  el.addEventListener('click', e => {
    try { localStorage.setItem(KEY, side); } catch {}
    const sub = e.target.closest('[data-href]');
    if (sub) { e.preventDefault(); location.href = sub.dataset.href; }
  });
}

// Coming back to choose again: show which one was chosen last.
try {
  const last = localStorage.getItem(KEY);
  const el = document.querySelector(`.side[data-choice="${last}"] .last`);
  if (el) el.hidden = false;
} catch {}

// Left and right arrows move between the two.
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  document.getElementById(e.key === 'ArrowLeft' ? 'pickMac' : 'pickWin').focus();
});
