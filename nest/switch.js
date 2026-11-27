// The Perch Nest strip at the top of every page of /mac/ and /windows/ (added by scripts/build.mjs): the Nest's home (to
// choose again), and Mac / Windows to go straight to the other. Going to the other also remembers it.
const here = location.pathname.includes('/windows/') ? 'windows' : 'mac';
const KEY = 'nest.choice.v1';

function link(href, html, cls, label) {
  const a = document.createElement('a');
  a.href = href;
  a.className = cls;
  a.innerHTML = html;
  if (label) a.setAttribute('aria-label', label);
  return a;
}

function mount() {
  if (document.querySelector('.nest-strip')) return;
  const base = location.pathname.replace(/\/(mac|windows)\/.*$/, '/');
  const nav = document.createElement('nav');
  nav.className = 'nest-strip';
  nav.setAttribute('aria-label', 'Perch Nest');
  const picks = document.createElement('span');
  picks.className = 'nest-picks';
  picks.append(
    link(`${base}mac/connect.html`, 'Mac', `nest-pick nest-mac${here === 'mac' ? ' nest-on' : ''}`),
    link(`${base}windows/connect.html`, 'Windows', `nest-pick nest-windows${here === 'windows' ? ' nest-on' : ''}`),
  );
  nav.append(
    link(`${base}#choose`, `<img src="${base}img/logo.svg" alt=""><span class="nest-label">Perch Nest</span>`, 'nest-home', 'Perch Nest: choose your computer'),
    picks,
  );
  for (const a of nav.querySelectorAll('.nest-pick')) {
    if (a.classList.contains('nest-on')) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', () => { try { localStorage.setItem(KEY, a.classList.contains('nest-mac') ? 'mac' : 'windows'); } catch {} });
  }
  document.body.prepend(nav);
}

if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
