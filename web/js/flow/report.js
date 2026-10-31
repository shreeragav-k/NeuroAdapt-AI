// Report pages. They read only the saved report, so an old report never changes.
import { GROUPS, LEVEL_LABEL, RULES } from "./data.js";
import { MEANINGFUL } from "./logic.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const group = (id) => GROUPS.find((g) => g.id === id);
const when = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); };
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
const who = (r) => `<div class="panel who-panel"><dl class="who">
  ${row("Name", esc(r.name))}
  ${row("Age", `${esc(r.age)} years`)}
  ${row("Age group", esc(group(r.groupId).label))}
  ${row("Health condition", r.condition ? esc(r.condition) : "Not applicable")}
  ${row("Date", esc(when(r.date)))}
  ${r.type === "daily" ? row("Session", `Day ${r.day}`) + row("Level played", LEVEL_LABEL[r.level]) : ""}
</dl></div>`;


// ------------------------------------------------------------------ charts
// Plain SVG, no library. Colours come from the page's CSS variables.
const C = { teal: "var(--teal)", amber: "var(--amber)", grey: "#a9a392", ink: "var(--ink-3)", line: "var(--line)" };

// points: [{ label, sub, value }]   value 0..100
export function lineChart(points, { title = "Accuracy over time" } = {}) {
  const W = 720, H = 300, L = 50, R = 150, T = 20, B = 62, iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (points.length === 1 ? iw / 2 : 28 + ((iw - 56) * i) / (points.length - 1));   // inset so the first value never sits on the axis labels
  const y = (v) => T + ih - (ih * v) / 100;
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${C.line}" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
  const mark = (v, text, color) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${color}" stroke-width="1.2" stroke-dasharray="5 5"/><text x="${W - R + 8}" y="${y(v) + 4}" text-anchor="start" style="fill:${color}">${text}</text>`;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="5.5" style="fill:var(--paper);stroke:${C.teal};stroke-width:2.5"/>
    <text x="${x(i).toFixed(1)}" y="${(y(p.value) - 12).toFixed(1)}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${p.value}%</text>
    ${points.length <= 8 || i % 2 === 0 || i === points.length - 1 ? `<text x="${x(i).toFixed(1)}" y="${H - 38}" text-anchor="middle" style="fill:var(--ink)">${esc(p.label)}</text>
    <text x="${x(i).toFixed(1)}" y="${H - 20}" text-anchor="middle">${esc(p.sub || "")}</text>` : ""}`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${points.map((p) => `${p.label} ${p.value}%`).join(", ")}">
    ${grid}${mark(RULES.promoteAt, `up at ${RULES.promoteAt}%`, C.amber)}${mark(RULES.demoteBelow, `down < ${RULES.demoteBelow}%`, C.grey)}
    <path d="${path}" fill="none" stroke="${C.teal}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`;
}

// rows: [{ label, <key>: value|null ... }]  series: [{ key, label, color }]
export function barChart(rows, series, { title = "Accuracy by cognitive skill" } = {}) {
  const W = 720, L = 190, R = 64, bh = 14, gap = 4, pad = 18, top = 34;
  const rh = series.length * (bh + gap) + pad, H = top + rows.length * rh + 6, iw = W - L - R;
  let lx = 12;
  const legend = series.map((s) => { const x = lx; lx += 44 + s.label.length * 10; return `<rect x="${x}" y="6" width="14" height="14" rx="3" style="fill:${s.color}"/><text x="${x + 20}" y="18" style="fill:var(--ink)">${esc(s.label)}</text>`; }).join("");
  const body = rows.map((r, j) => {
    const y0 = top + j * rh;
    const bars = series.map((s, i) => {
      const v = r[s.key], y = y0 + i * (bh + gap);
      return v == null ? ""
        : `<rect x="${L}" y="${y}" width="${Math.max(2, (iw * v) / 100).toFixed(1)}" height="${bh}" rx="3" style="fill:${s.color}"/><text x="${(L + (iw * v) / 100 + 6).toFixed(1)}" y="${y + bh - 2}" style="fill:var(--ink)">${v}%</text>`;
    }).join("");
    return `<text x="${L - 10}" y="${y0 + (series.length * (bh + gap)) / 2 + 3}" text-anchor="end" style="fill:var(--ink)">${esc(r.label)}</text>${bars}`;
  }).join("");
  const axis = [0, 50, 100].map((v) => `<line x1="${L + (iw * v) / 100}" x2="${L + (iw * v) / 100}" y1="${top - 6}" y2="${H - 4}" stroke="${C.line}" stroke-dasharray="${v === 0 ? "0" : "3 4"}"/>`).join("");
  const summary = rows.map((r) => `${r.label}: ${series.map((s) => `${s.label} ${r[s.key] == null ? "no data" : r[s.key] + "%"}`).join(", ")}`).join("; ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}. ${esc(summary)}">${axis}${legend}${body}</svg>`;
}

const short = (t, n = 17) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const SERIES = { assessment: { key: "assessment", label: "Assessment (before)", color: C.grey }, previous: { key: "previous", label: "Previous session", color: C.amber }, today: { key: "today", label: "Today", color: C.teal } };
const diffCell = (a, b) => (a == null || b == null ? "—" : sign(b - a));

const bar = (v) => `<span class="mini"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const planList = (plan) => `<ol class="plan">${plan.map((g) => `<li><b>${esc(g.title)}</b><span>${esc(g.skill)}</span></li>`).join("")}</ol>`;


// Is it working? The numbers behind the verdict, in plain words. Wording is careful on purpose: these are
// results in the games, and practice with a game can raise a score, so it is a trend and not a clinical finding.
export const VERDICT = {
  early: ["Too early to say", "One session is a starting point. Trends show from the second day."],
  improving: ["Improving", "Your results are moving up compared with the assessment."],
  steady: ["Steady", "Your results are about the same as at the assessment. Steady practice is what moves them."],
  mixed: ["Mixed", "Some results are up and some are down compared with the assessment."],
  slipping: ["Slipping a little", "Your results are lower than at the assessment. A rest day or an easier level can help."],
};
export function progressHtml(pr, { heading = "h2" } = {}) {
  if (!pr) return "";
  const [title, line] = VERDICT[pr.verdict];
  const lv = pr.levelsGained > 0 ? `moved up ${pr.levelsGained === 1 ? "one level" : pr.levelsGained + " levels"}` : pr.levelsGained < 0 ? "moved down" : "the same level";
  const same = pr.sameLevel ? `<li>At the <b>${LEVEL_LABEL[pr.sameLevel.level]}</b> level, your first session scored <b>${pr.sameLevel.first}%</b> and your latest <b>${pr.sameLevel.latest}%</b> (${sign(pr.sameLevel.change)} points over ${pr.sameLevel.sessions} sessions). Same games, same difficulty, so this is the fairest comparison.</li>` : "";
  const rows = pr.areas.map((a) => ({ label: a.area, start: a.start, now: a.now }));
  return `<${heading}>Is it working? Progress since the assessment</${heading}>
  <div class="callout ${pr.verdict === "slipping" ? "warm" : ""}"><b>${title}.</b> ${line}</div>
  <div class="stats">
    <div><b>${pr.startAccuracy}% → ${pr.nowAccuracy}%</b><span>Accuracy, assessment to Day ${pr.days}</span></div>
    <div><b>${LEVEL_LABEL[pr.startLevel]} → ${LEVEL_LABEL[pr.nowLevel]}</b><span>Level: ${lv}</span></div>
    <div><b>${pr.better} of ${pr.areas.length}</b><span>Skill areas up by ${MEANINGFUL} points or more</span></div>
  </div>
  <ul class="plain">
    ${pr.best ? `<li>Biggest gain: <b>${esc(pr.best.area)}</b>, from ${pr.best.start}% to ${pr.best.now}% (${sign(pr.best.change)} points).</li>` : ""}
    ${same}
    ${pr.levelsGained > 0 ? `<li>Moving up a level means the games are now harder, so a steady score at a higher level is real progress.</li>` : ""}
  </ul>
  ${rows.length ? `<div class="chartbox">${barChart(rows, [{ key: "start", label: "Assessment (start)", color: C.grey }, { key: "now", label: "Latest day (now)", color: C.teal }], { title: "Accuracy by cognitive skill: assessment and latest day" })}</div>` : ""}
  <p class="small muted">This shows how you do in these games. Practice with a game can raise your score in that game, and these games are not a clinical test, so it is a trend to watch and not proof of a medical benefit.</p>`;
}

function dailyCharts(r) {
  const pts = [...(r.baseline ? [{ label: "Assessment", sub: "start", value: r.baseline.accuracy }] : []), ...r.history.map((h) => ({ label: `Day ${h.day}`, sub: LEVEL_LABEL[h.level], value: h.accuracy }))];
  const line = `<h2>Accuracy before and after</h2>
  <p class="prose-p">Overall accuracy from the assessment to today. Each point is a whole session; the level played is written under it.</p>
  <div class="chartbox">${lineChart(pts)}</div>`;
  const hasBefore = r.games.some((g) => g.previous != null);
  const gameChart = `<h2>Each game: before and today</h2>
  <p class="prose-p">${hasBefore ? "Accuracy in each game today, next to the last session played at this level." : "Accuracy in each game today. There is no earlier session at this level yet, so the comparison starts with the next one."}</p>
  <div class="chartbox">${barChart(r.games.map((g) => ({ label: short(g.title), previous: g.previous, today: g.accuracy })), hasBefore ? [SERIES.previous, SERIES.today] : [SERIES.today], { title: "Accuracy in each game: previous session and today" })}</div>`;
  if (!r.skills || !r.skills.length) return line + gameChart;
  const hasPrev = r.skills.some((k) => k.previous != null), series = [SERIES.assessment, ...(hasPrev ? [SERIES.previous] : []), SERIES.today];
  const rows = r.skills.map((k) => ({ label: k.area, ...k }));
  return `${line}${gameChart}
  <h2>Cognitive skills: before and after</h2>
  <p class="prose-p">Accuracy for each skill area, averaged over the games that train it. "Before" is the assessment. A skill area only has a bar when games for it were played.</p>
  <div class="chartbox">${barChart(rows, series, { title: "Accuracy by cognitive skill: assessment, previous session and today" })}</div>
  <div class="tablewrap"><table><thead><tr><th>Skill area</th><th>Assessment</th><th>Previous</th><th>Today</th><th>Change since assessment</th><th>Change since previous</th></tr></thead><tbody>
  ${r.skills.map((k) => `<tr><td><b>${esc(k.area)}</b></td><td>${k.assessment == null ? "—" : k.assessment + "%"}</td><td>${k.previous == null ? "—" : k.previous + "%"}</td><td>${k.today == null ? "—" : k.today + "%"}</td><td>${diffCell(k.assessment, k.today)}</td><td>${diffCell(k.previous, k.today)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

export function assessmentReport(r) {
  return `<article class="report">
  <header><div class="eyebrow">Initial assessment report</div><h1>${esc(r.name)}</h1>
  <p class="lede">Five games chosen for ${esc(group(r.groupId).label.toLowerCase())}. This report shows where adaptive learning will begin.</p></header>
  ${who(r)}
  <div class="stats">
    <div><b>${r.overallAccuracy}%</b><span>Overall accuracy across the 5 games</span></div>
    <div><b>${r.ability.toFixed(2)}</b><span>Ability score, on a scale from 1 to 6</span></div>
    <div><b>${LEVEL_LABEL[r.level]}</b><span>Starting level for adaptive learning</span></div>
  </div>
  <h2>Results by game</h2>
  <div class="tablewrap"><table><thead><tr><th>#</th><th>Game</th><th>Skill</th><th>Correct</th><th>Accuracy</th><th>Ability</th></tr></thead><tbody>
  ${r.games.map((g, i) => `<tr><td>${i + 1}</td><td><b>${esc(g.title)}</b></td><td>${esc(g.skill)}</td><td>${g.correct} of ${g.rounds}</td><td>${g.accuracy}% ${bar(g.accuracy)}</td><td>${g.ability.toFixed(2)}</td></tr>`).join("")}
  <tr class="total"><td></td><td><b>Overall</b></td><td></td><td></td><td><b>${r.overallAccuracy}%</b></td><td><b>${r.ability.toFixed(2)}</b></td></tr>
  </tbody></table></div>
  ${r.domains ? `<h2>Cognitive skills at the start</h2>
  <p class="prose-p">Average accuracy of the games that test each skill area. These are the "before" values that later reports are compared with.</p>
  <div class="chartbox">${barChart(Object.entries(r.domains).map(([label, v]) => ({ label, assessment: v })), [SERIES.assessment], { title: "Accuracy by cognitive skill in the assessment" })}</div>` : ""}
  <h2>How the level was chosen</h2>
  <p class="prose-p">Each game started at a middle difficulty and moved one step up after a correct answer and one step down after a wrong one, so each game settled near the player's comfortable step (1 to 6). The ability score is the average across the five games. Below ${RULES.easyBelow.toFixed(1)} is <b>Easy</b>, from ${RULES.easyBelow.toFixed(1)} up to ${RULES.hardFrom.toFixed(1)} is <b>Medium</b>, and ${RULES.hardFrom.toFixed(1)} or more is <b>Hard</b>. An ability score of ${r.ability.toFixed(2)} places ${esc(r.name)} at the <b>${LEVEL_LABEL[r.level]}</b> level.</p>
  <h2>Adaptive learning suggestion: the 10 ${LEVEL_LABEL[r.level]} games</h2>
  <p class="prose-p">One session a day, made of these ten games in this order. None of them was part of the assessment.</p>
  ${planList(r.plan)}
  <p class="legal-note">This report describes performance in these games only. It is not a medical assessment or a diagnosis.</p>
</article>`;
}

export function dailyReport(r) {
  const prev = r.previous, up = r.decision.action === "promote", down = r.decision.action === "demote";
  const trendText = { first: "This is the first session, so there is nothing to compare yet.", improved: "Accuracy improved on the previous session.", steady: "Accuracy is about the same as the previous session.", declined: "Accuracy is lower than the previous session." }[r.trend];
  const cmpNote = prev && prev.level !== r.level ? ` The previous session was played at ${LEVEL_LABEL[prev.level]}, so the games were different.` : "";
  return `<article class="report">
  <header><div class="eyebrow">Daily report · Day ${r.day}</div><h1>${esc(r.name)}</h1>
  <p class="lede">${LEVEL_LABEL[r.level]} level, ${esc(when(r.date))}. ${trendText}${cmpNote}</p></header>
  ${who(r)}
  <div class="stats">
    <div><b>${r.accuracy}%</b><span>Today's accuracy (average of 10 games)</span></div>
    <div><b>${prev ? prev.accuracy + "%" : "—"}</b><span>${prev ? `Previous session, Day ${prev.day} (${LEVEL_LABEL[prev.level]})` : "No previous session"}</span></div>
    <div><b>${r.difference == null ? "—" : sign(r.difference)}</b><span>${r.difference == null ? "Change in points" : "Change in percentage points"}</span></div>
    <div><b>${LEVEL_LABEL[r.nextLevel]}</b><span>Level for the next session</span></div>
  </div>
  <h2>Today's games compared with last time</h2>
  <div class="tablewrap"><table><thead><tr><th>#</th><th>Game</th><th>Skill</th><th>Correct</th><th>Today</th><th>Before</th><th>Change</th></tr></thead><tbody>
  ${r.games.map((g, i) => `<tr><td>${i + 1}</td><td><b>${esc(g.title)}</b></td><td>${esc(g.skill)}</td><td>${g.correct} of ${g.rounds}</td><td>${g.accuracy}% ${bar(g.accuracy)}</td><td>${g.previous == null ? "—" : g.previous + "%"}</td><td>${g.change == null ? "—" : sign(g.change)}</td></tr>`).join("")}
  <tr class="total"><td></td><td><b>Overall</b></td><td></td><td></td><td><b>${r.accuracy}%</b></td><td>${r.previousSameLevel ? r.previousSameLevel.accuracy + "%" : "—"}</td><td>${r.previousSameLevel ? sign(r.accuracy - r.previousSameLevel.accuracy) : "—"}</td></tr>
  </tbody></table></div>
  <p class="small muted">"Before" is the last session played at the same level. ${r.previousSameLevel ? "" : "There is none yet, because these games are new at this level."}</p>
  ${dailyCharts(r)}
  ${progressHtml(r.progress)}
  <h2>Level decision</h2>
  <div class="callout ${down ? "warm" : ""}"><b>${up ? "Moving up to " + LEVEL_LABEL[r.nextLevel] : down ? "Moving down to " + LEVEL_LABEL[r.nextLevel] : "Staying at " + LEVEL_LABEL[r.nextLevel]}.</b> ${esc(r.decision.reason)}</div>
  <h2>Progress so far</h2>
  <div class="tablewrap"><table><thead><tr><th>Day</th><th>Date</th><th>Level</th><th>Accuracy</th></tr></thead><tbody>
  ${r.history.map((h) => `<tr class="${h.day === r.day ? "now" : ""}"><td>${h.day}</td><td>${esc(when(h.date))}</td><td>${LEVEL_LABEL[h.level]}</td><td>${h.accuracy}% ${bar(h.accuracy)}</td></tr>`).join("")}
  </tbody></table></div>
  <h2>Next session: the 10 ${LEVEL_LABEL[r.nextLevel]} games</h2>
  ${planList(r.nextPlan)}
  <p class="legal-note">Moving up needs ${RULES.promoteAt}% or more (without falling more than ${RULES.dropTolerance} points below the last session at that level). Moving down happens below ${RULES.demoteBelow}%. This report describes performance in these games only and is not a medical assessment. The camera, if you used it for Fruit Catcher, was never recorded: nothing from it is saved in this report or anywhere else.</p>
</article>`;
}

export const reportHtml = (r) => (r.type === "assessment" ? assessmentReport(r) : dailyReport(r));
export const reportTitle = (r) => (r.type === "assessment" ? "Initial assessment" : `Day ${r.day} · ${LEVEL_LABEL[r.level]}`);
export const reportSummary = (r) => (r.type === "assessment" ? `${r.overallAccuracy}% overall · starts at ${LEVEL_LABEL[r.level]}` : `${r.accuracy}% · ${r.decision.action === "promote" ? "moves up to" : r.decision.action === "demote" ? "moves down to" : "stays at"} ${LEVEL_LABEL[r.nextLevel]}`);
