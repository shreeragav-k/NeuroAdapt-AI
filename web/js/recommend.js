// Explainable recommendations. Mirrors halcyon_game/adaptive.py so the website
// and the game suggest the same things. Uses only what the player or caregiver
// entered plus play history. It never infers or changes a diagnosis.

const MOODS = {
  calmer: ["calm"], quicker: ["quick"], visual: ["visual"], notime: ["no_time_pressure"], movement: ["movement"],
};

export function recommend(profile, progress, cat, opts = {}) {
  const traits = new Set(profile.profile?.traits || []);
  const prefs = profile.preferences || {};
  const estDone = !!progress?.estimate?.done;
  const played = {};
  const lastFb = {};
  (progress?.sessions || []).forEach((s) => { played[s.game] = (played[s.game] || 0) + 1; lastFb[s.game] = s.feedback; });
  const age = profile.age || 9;
  const mood = [...(opts.mood || [])].flatMap((m) => MOODS[m] || []);
  const dismissed = new Set(opts.dismissed || []);

  const out = cat.games.filter((g) => !dismissed.has(g.id)).map((g) => {
    const gt = new Set(g.traits);
    let score = 0;
    const reasons = [];
    const phaseMatch = (g.phase === "starter") !== estDone;
    if (phaseMatch && !played[g.id]) { score += 5; reasons.push(!estDone ? "It's part of getting to know your pace." : "It's a new one to try."); }
    if (!played[g.id]) score += 1;
    else {
      score += Math.max(0, 2 - played[g.id] * 0.5);
      if (lastFb[g.id] === "right") { score += 1.5; reasons.push("You said this one felt just right."); }
      if (!estDone) score -= 12;   // five different games first
    }
    if (traits.has("motion_sensitive") && gt.has("calm")) { score += 1.5; reasons.push("It has gentle, slow movement on screen."); }
    if (traits.has("light_sensitive") && gt.has("calm")) score += 0.5;
    if (traits.has("predictable_routines") && gt.has("predictable")) { score += 2; reasons.push("Its steps are the same every time."); }
    if (traits.has("likes_patterns") && ["pattern_loom", "constellation_trace", "mirror_match", "lantern_memory", "steady_beat"].includes(g.id)) { score += 2; reasons.push("You enjoy patterns and sequences."); }
    if (traits.has("fewer_words") && gt.has("visual")) { score += 1; reasons.push("It uses pictures more than words."); }
    if (traits.has("needs_time") && gt.has("no_time_pressure")) { score += 2; reasons.push("There's no rush to answer."); }
    if (traits.has("fine_motor") && (gt.has("left_right") || g.id === "steady_beat")) { score += 2; reasons.push("You don't need to point precisely."); }
    if (["hands", "pose"].includes(prefs.movement_mode) && gt.has("movement")) { score += 1; reasons.push("It works nicely with movement."); }
    if (age <= 8 && gt.has("quick")) score -= 0.5;
    mood.forEach((m) => { if (gt.has(m)) { score += 3; reasons.unshift("You asked for something " + ({ calm: "calmer", quick: "quicker", visual: "more visual", no_time_pressure: "without time pressure", movement: "that uses movement" }[m]) + "."); } });
    if (!reasons.length) reasons.push("A good balance of skills.");
    return { game: g, score, reason: reasons[0], reasons };
  });
  out.sort((a, b) => b.score - a.score);
  return out;
}
