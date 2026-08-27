const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const $ = id => document.getElementById(id);
let fixtures = [];

$('loadBtn').addEventListener('click', loadFixtures);

async function loadFixtures() {
  const errEl = $('err');
  errEl.textContent = '';
  const league = Number($('league').value);
  const season = Number($('season').value);
  $('loadBtn').disabled = true;
  $('loadBtn').textContent = 'Loading…';
  try {
    const res = await fetch(`/api/fixtures?league=${league}&season=${season}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    fixtures = data;
    renderFixtures(fixtures);
    $('fixCard').style.display = 'block';
    $('analysisArea').innerHTML = '';
  } catch (e) {
    errEl.textContent = 'Could not load fixtures: ' + e.message;
  } finally {
    $('loadBtn').disabled = false;
    $('loadBtn').textContent = 'Load Fixtures';
  }
}

function renderFixtures(list) {
  const wrap = $('fixList');
  if (!list.length) {
    wrap.innerHTML = '<div class="none-note">No upcoming fixtures found.</div>';
    return;
  }
  wrap.innerHTML = list.map((f, i) => {
    const d = new Date(f.fixture.date);
    return `<div class="fixture" data-i="${i}">
      <div class="teams">${f.teams.home.name} vs ${f.teams.away.name}</div>
      <div class="meta">${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>`;
  }).join('');
  wrap.querySelectorAll('.fixture').forEach(el => {
    el.addEventListener('click', () => {
      wrap.querySelectorAll('.fixture').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      analyzeFixture(fixtures[Number(el.dataset.i)]);
      tg?.HapticFeedback?.impactOccurred('light');
    });
  });
}

async function analyzeFixture(fixture) {
  const area = $('analysisArea');
  area.innerHTML = `<div class="loading">Pulling H2H, form, injuries, table &amp; splits…</div>`;
  const home = fixture.teams.home, away = fixture.teams.away;
  const league = fixture.league.id, season = fixture.league.season;
  const params = new URLSearchParams({
    homeId: home.id, awayId: away.id,
    homeName: home.name, awayName: away.name,
    league, season
  });
  try {
    const res = await fetch(`/api/analysis?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    render(data.prediction);
  } catch (e) {
    area.innerHTML = `<div class="card err">Analysis failed: ${e.message}</div>`;
  }
}

function badges(arr) {
  return arr.map(c => `<div class="badge ${c}">${c === 'x' ? '–' : c}</div>`).join('');
}

function injuryList(list) {
  if (!list || !list.length) return `<div class="none-note">No reported injuries.</div>`;
  return `<ul class="injury-list">${list.slice(0, 6).map(x =>
    `<li><span>${x.player?.name || 'Player'}</span><span>${x.player?.reason || x.player?.type || ''}</span></li>`
  ).join('')}</ul>`;
}

function render(p) {
  const { home, away, percentages, lean, factors } = p;
  const f = factors;
  const area = $('analysisArea');
  area.innerHTML = `
  <div class="card">
    <div class="matchup"><div>${home.name}</div><div class="vs">VS</div><div>${away.name}</div></div>

    <div class="factor">
      <div class="factor-head"><span>Recent Form</span><span class="weight">${Math.round(f.form.weight*100)}%</span></div>
      <div class="split-row"><div class="lbl">${home.name}</div><div class="form-badges">${badges(f.form.home.arr)}</div><div class="val">${f.form.home.pts}/15</div></div>
      <div class="split-row"><div class="lbl">${away.name}</div><div class="form-badges">${badges(f.form.away.arr)}</div><div class="val">${f.form.away.pts}/15</div></div>
    </div>

    <div class="factor">
      <div class="factor-head"><span>Head-to-Head</span><span class="weight">${Math.round(f.h2h.weight*100)}% · last ${f.h2h.total}</span></div>
      <div class="h2h-tally">
        <div><div class="n">${f.h2h.homeWins}</div><div class="l">${home.name}</div></div>
        <div><div class="n">${f.h2h.draws}</div><div class="l">Draws</div></div>
        <div><div class="n">${f.h2h.awayWins}</div><div class="l">${away.name}</div></div>
      </div>
      <div class="h2h-list">${f.h2h.lines.join('<br>') || 'No prior meetings on record.'}</div>
    </div>

    <div class="factor">
      <div class="factor-head"><span>Home / Away Split</span><span class="weight">${Math.round(f.split.weight*100)}%</span></div>
      <div class="split-row"><div class="lbl">${home.name} home</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(f.split.home.pct*100)}%"></div></div><div class="val">${f.split.home.wins}/${f.split.home.played}</div></div>
      <div class="split-row"><div class="lbl">${away.name} away</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(f.split.away.pct*100)}%"></div></div><div class="val">${f.split.away.wins}/${f.split.away.played}</div></div>
    </div>

    <div class="factor">
      <div class="factor-head"><span>League Position</span><span class="weight">${Math.round(f.table.weight*100)}%</span></div>
      <div class="pos-compare">
        <div><div class="p">${f.table.homeRank ?? '—'}</div><div class="n">${home.name}</div></div>
        <div><div class="p">${f.table.awayRank ?? '—'}</div><div class="n">${away.name}</div></div>
      </div>
    </div>

    <div class="factor">
      <div class="factor-head"><span>Injuries</span><span class="weight">${Math.round(f.injury.weight*100)}%</span></div>
      <div class="row">
        <div><div class="section-title">${home.name} (${f.injury.home})</div>${injuryList(p.rawHomeInj)}</div>
        <div><div class="section-title">${away.name} (${f.injury.away})</div>${injuryList(p.rawAwayInj)}</div>
      </div>
    </div>
  </div>

  <div class="meter-card">
    <div class="meter-title">Model Read</div>
    <div class="meter-sub">Leans toward ${lean}</div>
    <div class="stack">
      <div class="seg-home" style="width:${percentages.home}%">${percentages.home>=12?percentages.home+'%':''}</div>
      <div class="seg-draw" style="width:${percentages.draw}%">${percentages.draw>=12?percentages.draw+'%':''}</div>
      <div class="seg-away" style="width:${percentages.away}%">${percentages.away>=12?percentages.away+'%':''}</div>
    </div>
    <div class="stack-labels"><span>${home.name}</span><span>Draw</span><span>${away.name}</span></div>
    <div class="rationale">A weighted read of form, H2H, home/away splits, table position and injuries — one input among many, not a certainty.</div>
  </div>
  `;
}
