// The Skills screens: the daily practice queue chosen by the therapist session, progress per skill, and playing one game.
import { DOMAINS, DOMAIN_META, GAME_ICONS, getGameById } from "./catalog.js";
import { dailyQueue, domainProgress, improvement, latestTherapy, ensurePedia, recordGame, skillLevel, LEVEL_NAME, labelFor, LAGGING_BELOW } from "./engine.js";
import { mountGame, loadRuntime, themes } from "./runtime.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (d) => DOMAIN_META[d].slug;

export async function viewSkills(root, p, { S, nav, today }) {
  const x = ensurePedia(p), q = dailyQueue(p, today), prog = domainProgress(p), imp = improvement(p), last = latestTherapy(p);
  try { await loadRuntime(); } catch { /* the theme chips just stay empty */ }
  const th = themes();
  const first = p.name.trim().split(/\s+/)[0];
  root.innerHTML = `<div class="page"><div class="wrap reveal">
    <div class="page-head"><div><div class="eyebrow">Skills practice</div><h1>${esc(first)}'s games for today</h1>
      <p class="lede">Dr. Sarah's session found where more practice helps most. The games below start with those skills, and each one moves to an easier or harder level by itself as ${esc(first)} plays.</p></div>
      <a class="btn quiet" href="#/therapy">Redo the therapist session</a></div>
    <div class="kpis">
      <div class="kpi"><span class="k-top">Today</span><span class="k-val">${q.doneCount} of ${q.queue.length}</span><span class="k-sub">games finished</span></div>
      <div class="kpi"><span class="k-top">Practice focus</span><span class="k-val">${q.laggingCat.length ? esc(q.laggingCat.join(", ")) : "None"}</span><span class="k-sub">${last ? `from session ${last.n}` : ""}</span></div>
      <div class="kpi"><span class="k-top">Games played</span><span class="k-val">${x.results.length}</span><span class="k-sub">in total</span></div>
      <div class="kpi"><span class="k-top">Sessions with Dr. Sarah</span><span class="k-val">${x.sessions.length}</span><span class="k-sub">${last ? esc(last.date) : ""}</span></div>
    </div>
    <div class="dash">
      <section class="card"><div class="card-head"><div><h2>Today's queue</h2><span class="sub">${q.queue.length} games · weak skills first</span></div></div>
        <div class="progressbar"><i style="width:${q.queue.length ? (q.doneCount / q.queue.length) * 100 : 0}%"></i></div>
        <ol class="glist sk-list">${q.queue.map((it, i) => { const d = q.done[it.gameId], nextUp = !d && q.queue.findIndex((z) => !q.done[z.gameId]) === i;
          return `<li class="grow area-${slug(it.domain)} ${d ? "done" : nextUp ? "next" : ""}"><span class="rank">${d ? "✓" : esc(GAME_ICONS[it.gameId] || "🎮")}</span>
          <div><div class="g-title">${esc(it.game.name)}${it.weak ? ` <em class="tag focus">focus</em>` : ""}</div><div class="g-sub">${esc(it.domain)} · ${esc(LEVEL_NAME[it.level])} · ${esc(it.why)}${d ? ` · scored ${d.score}%` : ""}</div></div>
          <a class="btn small ${d ? "quiet" : ""}" href="#/skillgame/${esc(it.gameId)}">${d ? "Play again" : "Play"}</a></li>`; }).join("")}</ol>
      </section>
      <div class="stack">
        <section class="card"><div class="card-head"><h3>Skill progress</h3><span class="sub">latest result</span></div>
          <ul class="skillbars">${prog.map((d) => `<li class="area-${slug(d.domain)} ${d.weak ? "weak" : ""}"><div class="s-top"><b>${DOMAIN_META[d.domain].emoji} ${esc(d.domain)}</b><span>${d.now == null ? "—" : d.now + "%"}</span></div>
            <div class="progressbar"><i style="width:${d.now ?? 0}%"></i></div>
            <small class="muted">${d.now == null ? "Not looked at yet" : esc(labelFor(d.now))}${d.level ? ` · level ${d.level}` : ""} · ${d.plays} ${d.plays === 1 ? "game" : "games"}${d.trend != null ? ` · ${d.trend >= 0 ? "▲ +" : "▼ "}${d.trend} since the first games` : ""}</small></li>`).join("")}</ul>
          <p class="small muted" style="margin:1rem 0 0">Below ${LAGGING_BELOW} is marked "focus". A change is only shown after 6 or more games in a skill.</p></section>
        ${imp ? `<section class="card"><div class="card-head"><h3>Since the first session</h3><span class="sub">session ${imp.from.n} → ${imp.to.n}</span></div>
          <dl class="mini-dl">${imp.rows.map((r) => `<div><dt>${esc(r.domain)}</dt><dd>${r.before}% → ${r.after}% (${r.change >= 0 ? "+" : ""}${r.change})</dd></div>`).join("")}</dl></section>` : ""}
        <section class="card"><div class="card-head"><h3>Game theme</h3><span class="sub">changes the pictures</span></div>
          <div class="th-themes" role="group" aria-label="Game theme">${th.map((t) => `<button type="button" class="chip ${t.id === x.theme ? "" : "soft"}" data-theme="${esc(t.id)}" aria-pressed="${t.id === x.theme}">${esc(t.emoji || "")} ${esc(t.name || t.id)}</button>`).join("")}</div></section>
        <section class="card"><div class="card-head"><h3>More games</h3><span class="sub">optional</span></div>
          <ul class="suglist">${q.extra.map((e) => `<li class="area-${slug(e.domain)}"><div><b>${esc(GAME_ICONS[e.gameId] || "")} ${esc(e.game.name)}</b> <span class="chip soft">${esc(e.domain)}</span><p>${esc(e.game.description)}</p></div><a class="btn small" href="#/skillgame/${esc(e.gameId)}">Play</a></li>`).join("") || `<li class="muted">Every game is in today's queue.</li>`}</ul></section>
      </div></div></div></div>`;
  root.querySelectorAll("[data-theme]").forEach((b) => (b.onclick = () => { x.theme = b.dataset.theme; S.save(); viewSkills(root, p, { S, nav, today }); }));
}

// Plays one game inside a page. Returns stop().
export function playSkillGame(root, p, gameId, { S, nav, today }) {
  const game = getGameById(gameId); if (!game) { nav("#/skills"); return () => {}; }
  const x = ensurePedia(p);
  root.innerHTML = `<div class="page"><div class="wrap"><div class="pg-stage card" id="pg-stage" aria-live="polite"></div></div></div>`;
  const box = root.querySelector("#pg-stage");
  let stop = null, gone = false;
  const level = skillLevel(p, game.skillId);
  mountGame(box, gameId, { level, themeId: x.theme,
    onComplete: (r) => {
      if (gone) return;
      let rec; try { rec = recordGame(p, gameId, r, today); S.save(); } catch { return nav("#/skills"); }
      stop && stop(); stop = null;
      const q = dailyQueue(p, today), nxt = q.queue.find((it) => !q.done[it.gameId] && it.gameId !== gameId);
      box.innerHTML = `<div class="th-result"><div class="th-star" aria-hidden="true">${rec.success ? "⭐" : "💪"}</div><h2>${rec.success ? "Great job!" : "Good effort!"}</h2>
        <p class="lede">${esc(game.name)}: ${rec.score}% · ${rec.errors} ${rec.errors === 1 ? "miss" : "misses"} · ${rec.timeSec}s</p><p class="muted">${esc(rec.note)}</p>
        <div class="th-actions">${nxt ? `<a class="btn lg" href="#/skillgame/${esc(nxt.gameId)}">Next: ${esc(nxt.game.name)}</a>` : ""}<a class="btn ${nxt ? "quiet" : "lg"}" href="#/skills">Back to the games</a></div></div>`;
    },
    onExit: () => nav("#/skills") }).then((s) => { if (gone) s(); else stop = s; }).catch(() => nav("#/skills"));
  return () => { gone = true; stop && stop(); };
}
