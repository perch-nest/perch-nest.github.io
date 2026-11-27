// Runs before the page draws: someone who chose before goes straight to their computer's page, unless they came
// back to choose again (#choose, which the switch on every page links to).
(function () {
  try {
    if (location.hash === '#choose') return;
    var c = localStorage.getItem('nest.choice.v1');
    if (c === 'mac' || c === 'windows') location.replace(c + '/connect.html');
  } catch (e) { /* storage blocked: just show the choice */ }
})();
