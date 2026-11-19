// The therapist-session report (HTML). Same markup classes as the assessment and daily reports.
import { DOMAINS, DOMAIN_META, GAME_ICONS } from "./catalog.js";
import { LAGGING_BELOW, labelFor, LEVEL_NAME } from "./engine.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); };
const bar = (v) => `<span class="bar"><i style="width:${v ?? 0}%"></i></span>`;
const pct = (v) => (v == null ? "—" : `${v}%`);
const tone = (v) => (v == null ? "none" : v >= LAGGING_BELOW ? "ok" : "low");

export const therapyTitle = (r) => `Therapist session ${r.n}`;
export const therapySummary = (r) => (r.laggingCatalog.length ? `Practice focus: ${r.laggingCatalog.join(", ")}` : "No area below the practice line") + (r.overall != null ? ` · ${r.overall}% overall` : "");

export function therapyReport(r) {
  const prev = r.previous;
  return `<article class="report">
  <header><div class="eyebrow">Virtual therapist session ${r.n}</div><h1>${esc(r.name)}</h1>
  <p class="lede">Dr. Sarah asked ${r.responses.length} questions and watched four short movement games. This report shows which of the four skills (thinking, communication, fine motor, gross motor) need more practice, and the games chosen for them.</p></header>
  <div class="panel who-panel"><dl class="who"><div><dt>Name</dt><dd>${esc(r.name)}</dd></div><div><dt>Age</dt><dd>${esc(r.age)} years</dd></div><div><dt>Date</dt><dd>${esc(when(r.date))}</dd></div><div><dt>Questions answered</dt><dd>${r.answered} of ${r.responses.length + r.motor.length}</dd></div></dl></div>
  <h2>Four skill areas</h2>
  <p class="prose-p">Scores come from the answers and the movement games in this session only. Anything below ${LAGGING_BELOW} is marked for practice.${prev ? ` Arrows compare with session ${prev.n}.` : ""}</p>
  <ul class="skillbars th-skills">${DOMAINS.map((d) => { const v = r.catalogScores[d], pv = prev ? prev.catalogScores[d] : null; const delta = v != null && pv != null ? v - pv : null;
    return `<li class="th-${tone(v)}"><div class="s-top"><b>${DOMAIN_META[d].emoji} ${esc(d)}</b><span>${pct(v)} · ${esc(labelFor(v))}${delta != null ? ` (${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "= "}${delta})` : ""}</span></div>${bar(v)}<small>${esc(DOMAIN_META[d].blurb)}</small></li>`; }).join("")}</ul>
  <h2>What Dr. Sarah noticed</h2>
  <div class="tablewrap"><table><thead><tr><th>Area</th><th>Answer</th><th>Score</th></tr></thead><tbody>
  ${r.responses.map((x) => `<tr><td><b>${esc(x.domain)}</b></td><td>${x.kind === "skipped" ? `<span class="muted">Skipped</span>` : esc(x.answer)} <span class="muted small">${x.kind === "skipped" ? "" : `(${esc(x.kind)})`}</span></td><td>${pct(x.score)}</td></tr>`).join("")}
  ${r.motor.map((m) => `<tr><td><b>${esc(m.domain)}</b></td><td>${esc(m.gameId.replace(/_/g, " "))}: ${m.errors} ${m.errors === 1 ? "miss" : "misses"} in ${m.timeTakenSec}s</td><td>${m.score}%</td></tr>`).join("")}
  </tbody></table></div>
  ${r.strengths.length ? `<h2>Strengths</h2><ul class="th-list">${r.strengths.map((s) => `<li><b>${esc(s.domain)}:</b> ${esc(s.summary)}</li>`).join("")}</ul>` : ""}
  ${r.practice.length ? `<h2>Practice ideas</h2><ul class="th-list">${r.practice.map((s) => `<li><b>${esc(s.domain)}:</b> ${esc(s.tip)}</li>`).join("")}</ul>` : ""}
  <h2>Games chosen for ${esc(r.name.split(" ")[0])}</h2>
  <p class="prose-p">${r.laggingCatalog.length ? `Games for ${r.laggingCatalog.map(esc).join(" and ")} come first. ` : ""}Each game starts at the level shown and moves up after 3 good rounds in a row, or down after 2 hard ones.</p>
  <ol class="glist">${r.plan.map((g) => `<li class="grow ${g.weak ? "next" : ""}"><span class="rank">${esc(GAME_ICONS[g.gameId] || "🎮")}</span><div><div class="g-title">${esc(g.title)}${g.weak ? ` <em class="tag focus">focus</em>` : ""}</div><div class="g-sub">${esc(g.domain)} · ${esc(LEVEL_NAME[g.level])}${g.why ? ` · ${esc(g.why)}` : ""}</div></div></li>`).join("")}</ol>
  <p class="legal-note">This is a play-based screening to choose games, not a medical assessment or a diagnosis. Scoring uses a simple rubric (answer length, tapped answers, game accuracy) and should be reviewed with a qualified professional. Nothing from the camera or microphone is recorded or saved.</p>
</article>`;
}
