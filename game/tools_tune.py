"""Guided hand-tracking tuning.

    python tools_tune.py            # measure and print suggested settings
    python tools_tune.py --apply    # also write them to halcyon/config.json

Takes about a minute. It measures YOUR open hand, pinch, steadiness and
comfortable range, then suggests pinch thresholds, smoothing, hold-still radius
and a movement calibration. Only numbers are kept; video is never saved.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

import pygame

sys.path.insert(0, str(Path(__file__).parent))

from halcyon_game import gfx, storage, theme as T
from halcyon_game.config import CONFIG_PATH, DATA_DIR, Config
from halcyon_game.screens import preview_surface
from halcyon_game.tracking.mediapipe_tracker import MediaPipeTracker

W, H = 1100, 640
PHASES = [
    ("open", "Open hand: spread your fingers", "Thumb well away from your index finger, like waving hello. Keep your hand in the picture.", 5),
    ("pinch", "Pinch: touch thumb tip to fingertip", "As if holding a tiny bead. Keep the pinch until the bar fills.", 5),
    ("still", "Hold your hand still", "Point towards the middle of the screen. Pinching or not, whichever is natural.", 5),
    ("range", "Move your hand slowly around", "Cover the area that feels comfortable. Small movements are fine.", 8),
    ("palm", "Hold an open palm up", "Fingers spread, palm towards the camera, for a few seconds.", 5),
]


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * p))]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def best_gap(data, idx):
    """Gap between the low end of 'open' and the high end of 'pinch' for one metric (negative = swapped)."""
    if len(data["open"]) < 5 or len(data["pinch"]) < 5:
        return -1.0
    return pct([v[idx] for v in data["open"]], 0.10) - pct([v[idx] for v in data["pinch"]], 0.90)


def best_metric(data):
    """Pick the pinch measurement that separates open from pinched best."""
    gi, gw = best_gap(data, 0), best_gap(data, 1)
    return ("world", gw) if gw > gi else ("image", gi)


def run(apply: bool) -> dict:
    cfg = Config.load()
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Halcyon: tuning")
    clock = pygame.time.Clock()
    tracker = MediaPipeTracker("hands", cfg, storage.load_calibration())
    tracker.start()
    data = {k: [] for k, *_ in PHASES}
    raw_pts, cursor_pts, fps_list, bright = [], [], [], []
    palm_best, palm_open_frames, palm_frames = 0.0, 0, 0
    phase_i, phase_t0, lead = -1, time.time(), 3.0
    retried, notice = False, ""
    started = time.time()
    done = False
    result: dict = {}

    def next_phase():
        nonlocal phase_i, phase_t0
        phase_i += 1
        phase_t0 = time.time()

    next_phase()
    aborted = False
    while not done:
        for e in pygame.event.get():
            if e.type == pygame.QUIT or (e.type == pygame.KEYDOWN and e.key == pygame.K_ESCAPE):
                aborted = done = True
        ts = tracker.poll()
        el = time.time() - phase_t0
        key, title, sub, dur = PHASES[phase_i]
        collecting = el > lead and ts.present and ts.status == "ok"
        if ts.status == "ok":
            fps_list.append(ts.fps)
            bright.append(ts.brightness)
        if collecting:
            data[key].append((ts.pinch_ratio_img, ts.pinch_ratio_world))
            if key in ("still", "range") and ts.cursor:
                if key == "still":
                    cursor_pts.append((ts.cursor[0] * 1280, ts.cursor[1] * 720))
                if ts.raw:
                    raw_pts.append(ts.raw)
            if key == "palm":
                palm_frames += 1
                palm_open_frames += 1 if ts.palm_open else 0
                palm_best = max(palm_best, ts.palm_hold)
        if el > lead + dur:
            if key == "pinch" and not retried and len(data["open"]) >= 20 and len(data["pinch"]) >= 20 and best_metric(data)[1] < 0.10:
                # The two readings look swapped or too close. Say so and repeat just those two steps.
                retried = True
                data["open"].clear()
                data["pinch"].clear()
                notice = "Those two looked very similar, so let's do the first two steps once more. Spread wide, then pinch tight."
                phase_i = -1
                next_phase()
            elif phase_i == len(PHASES) - 1:
                done = True
            else:
                next_phase()

        # ------------------------------------------------------------ draw
        screen.blit(gfx.paper_background((W, H)), (0, 0))
        gfx.text(screen, "HALCYON · TUNING", T.font("strong", 16), T.TEAL, (48, 34))
        gfx.text(screen, f"Step {phase_i + 1} of {len(PHASES)}", T.font("body", 20), T.INK_SOFT, (W - 48, 30), "topright")
        box = pygame.Rect(48, 80, 520, 390)
        arr = tracker.preview()
        gfx.draw_rrect(screen, box.inflate(14, 14), T.PAPER, radius=24, shadow=14)
        if arr is not None:
            pv = preview_surface(arr, box.size, ts.landmarks, ts.connections).convert_alpha()
            mask = pygame.Surface(box.size, pygame.SRCALPHA)
            pygame.draw.rect(mask, (255, 255, 255, 255), (0, 0, *box.size), border_radius=18)
            pv.blit(mask, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
            screen.blit(pv, box)
        x = 620
        gfx.paragraph(screen, title, T.font("display", 40), T.INK, (x, 84), W - x - 40, 1.15)
        gfx.paragraph(screen, sub, T.font("body", 21), T.INK_SOFT, (x, 200), W - x - 40, 1.4)
        frac = clamp((el - lead) / dur, 0, 1) if el > lead else 0
        pygame.draw.rect(screen, T.LINE, (x, 320, 420, 8), border_radius=4)
        pygame.draw.rect(screen, T.TEAL, (x, 320, int(420 * frac), 8), border_radius=4)
        if el <= lead:
            gfx.text(screen, f"Get ready… {int(lead - el) + 1}", T.font("display", 30), T.CHAMPAGNE, (x, 346))
        elif not ts.present:
            gfx.text(screen, "I can't see your hand yet", T.font("strong", 22), T.AMBER, (x, 346))
        else:
            gfx.text(screen, "Good, measuring", T.font("strong", 22), T.TEAL_DEEP, (x, 346))
        # live pinch meter with the current thresholds
        if notice:
            gfx.paragraph(screen, notice, T.font("body", 18), T.AMBER, (x, 366), W - x - 40, 1.3)
        label = "PINCHED" if ts.present and ts.pinch_ratio < cfg.pinch_on else "OPEN" if ts.present else "-"
        lcol = T.TEAL_DEEP if label == "PINCHED" else T.INK_SOFT
        gfx.text(screen, f"Right now I see: {label}", T.font("strong", 22), lcol, (x, 380 if not notice else 392))
        gfx.text(screen, "Pinch ratio (lower = tighter)", T.font("body", 17), T.INK_SOFT, (x, 420))
        pygame.draw.rect(screen, T.LINE, (x, 448, 420, 10), border_radius=5)
        r = clamp(ts.pinch_ratio / 1.4, 0, 1) if ts.present else 0
        pygame.draw.circle(screen, T.TEAL, (x + int(420 * r), 453), 11)
        for v, col in ((cfg.pinch_on, T.TEAL_DEEP), (cfg.pinch_off, T.CHAMPAGNE)):
            xx = x + int(420 * clamp(v / 1.4, 0, 1))
            pygame.draw.line(screen, col, (xx, 438), (xx, 468), 3)
        gfx.text(screen, f"{ts.pinch_ratio:.2f}   fps {ts.fps:.0f}   brightness {ts.brightness:.0f}", T.font("body", 18), T.INK_SOFT, (x, 480))
        gfx.text(screen, "Esc to cancel. Nothing is saved except these numbers.", T.font("body", 17), T.MUTE, (48, H - 36))
        pygame.display.flip()
        clock.tick(60)

    tracker.stop()
    pygame.quit()
    if aborted:
        return {"aborted": True}

    # --------------------------------------------------------- analysis
    notes, rec = [], {"gestures": {}}
    enough = lambda k, n=20: len(data[k]) >= n
    if enough("open") and enough("pinch"):
        metric, gap = best_metric(data)
        idx = 0 if metric == "image" else 1
        opens, pinches = [v[idx] for v in data["open"]], [v[idx] for v in data["pinch"]]
        lo_open, hi_closed = pct(opens, 0.10), pct(pinches, 0.90)
        sep = {m: round(best_gap(data, i), 2) for m, i in (("image", 0), ("world", 1))}
        result.update(open_p10=round(lo_open, 2), pinch_p90=round(hi_closed, 2), separation=round(gap, 2), separation_by_metric=sep, metric=metric, retried=retried)
        if gap >= 0.10:
            # "On" sits just above your own pinch readings so nearly all real pinches register,
            # and well below your open hand so a relaxed hand never does.
            on = clamp(hi_closed + 0.04, 0.12, lo_open - 0.30)
            off = clamp(min(lo_open - 0.15, on + 0.22), on + 0.08, 0.90)
            rec["pinch_on"], rec["pinch_off"], rec["pinch_metric"] = round(on, 2), round(off, 2), metric
            notes.append(f"Using the {metric} measurement: open hand reads about {lo_open:.2f}, a pinch about {hi_closed:.2f}. Pinch on at {on:.2f}, release at {off:.2f}.")
            if gap < 0.25:
                notes.append("The gap between open and pinched is small. More light or a plainer background will help; hold-still selection is a good alternative.")
        else:
            notes.append(
                f"The open and pinched readings were too similar (gap {gap:.2f}, best of both measurements), so pinch thresholds are unchanged. "
                "Hold-still selection works without any pinch; set select_method to dwell in the website."
            )
            rec["suggest_select_method"] = "dwell"
    else:
        notes.append("Not enough hand data for the pinch step, so thresholds are unchanged.")

    if len(cursor_pts) >= 20:
        sx = statistics.pstdev(p[0] for p in cursor_pts)
        sy = statistics.pstdev(p[1] for p in cursor_pts)
        jitter = (sx * sx + sy * sy) ** 0.5
        smoothing = 0.32 if jitter > 10 else 0.40 if jitter > 5 else 0.50
        rec["gestures"].update(dwell_radius=int(clamp(round(3.0 * jitter / 5) * 5, 40, 110)), smoothing=smoothing, smoothing_pinch=round(smoothing * 0.6, 2))
        result["hold_still_jitter_px"] = round(jitter, 1)
        notes.append(f"While holding still your cursor wobbled about {jitter:.1f}px, so smoothing is {smoothing} and the hold-still radius {rec['gestures']['dwell_radius']}px.")
    else:
        notes.append("Not enough data for the hold-still step, so smoothing is unchanged.")

    if len(raw_pts) >= 30:
        xs, ys = [p[0] for p in raw_pts], [p[1] for p in raw_pts]
        cal = {"xmin": clamp(pct(xs, 0.03) - 0.02, 0, 1), "xmax": clamp(pct(xs, 0.97) + 0.02, 0, 1), "ymin": clamp(pct(ys, 0.03) - 0.02, 0, 1), "ymax": clamp(pct(ys, 0.97) + 0.02, 0, 1)}
        cal = {k: round(v, 3) for k, v in cal.items()}
        if cal["xmax"] - cal["xmin"] >= 0.14 and cal["ymax"] - cal["ymin"] >= 0.10:
            rec["calibration"] = cal
            notes.append(f"Comfortable range covers {int((cal['xmax'] - cal['xmin']) * 100)}% of the picture across and {int((cal['ymax'] - cal['ymin']) * 100)}% down.")
        else:
            notes.append("The range you showed was very small, so calibration is unchanged. Try again with a slightly bigger sweep.")

    if palm_frames >= 15:
        share = palm_open_frames / palm_frames
        result["open_palm_detected_pct"] = round(share * 100)
        if share > 0.9:
            rec["gestures"]["palm_hold_seconds"] = 2.4
            notes.append("Open palm was recognised almost every frame. That is reliable, but a relaxed open hand could trigger it by accident, so the hold time goes up to 2.4 seconds.")
        elif palm_best >= 1.0 or share > 0.6:
            notes.append("Open-palm pause was recognised reliably.")
        else:
            rec["gestures"]["pause"] = "off"
            notes.append(f"Open palm was recognised in only {share * 100:.0f}% of frames, so the palm-hold pause gesture is turned off. Esc, P and the on-screen Pause button still work.")
    result.update(
        camera_fps=round(statistics.mean(fps_list), 1) if fps_list else None,
        mean_brightness=round(statistics.mean(bright)) if bright else None,
        seconds=round(time.time() - started),
        notes=notes,
        recommended=rec,
    )
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "tuning_report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    if apply:
        cur = {}
        if CONFIG_PATH.exists():
            cur = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            CONFIG_PATH.with_suffix(".backup.json").write_text(json.dumps(cur, indent=2), encoding="utf-8")
        for k in ("pinch_on", "pinch_off"):
            if k in rec:
                cur[k] = rec[k]
        cur.setdefault("gestures", {}).update(rec["gestures"])
        CONFIG_PATH.write_text(json.dumps(cur, indent=2), encoding="utf-8")
        if "calibration" in rec:
            storage.save_calibration(rec["calibration"])
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write the suggested values to halcyon/config.json")
    out = run(ap.parse_args().apply)
    print(json.dumps(out, indent=2))
