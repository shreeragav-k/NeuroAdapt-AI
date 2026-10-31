# NeuroAdapt AI (Halcyon)

**Current version:** a website that trains cognitive and memory skills by age group (1-5, 6-17, 18-60). Create an account, take a 5-game assessment, get a report and a level (Easy, Medium, Hard), then play a daily 10-game session that ends with a report comparing earlier days, with charts. 105 games, none shared between groups or levels.

```bash
py main.py           # (or: py run.py)  then open http://127.0.0.1:8765/
node --test tests/flow.test.mjs
```

* How the workflow and levels work: [WORKFLOW.md](WORKFLOW.md)
* Storing accounts and results in Firebase (optional): [FIREBASE.md](FIREBASE.md)

The sections below describe the earlier PyGame + MediaPipe runtime in `game/`. The website no longer uses it.

---

Calm, short cognitive games for autistic children and adolescents, played with **hand or body movement** (MediaPipe) **or** with mouse, touch and keyboard. A website handles sign-in, onboarding, recommendations, settings, progress and privacy; a **PyGame** runtime plays the games.

> Halcyon is a prototype for usability and engagement. It does not diagnose, treat or assess any condition and makes no claim of clinical benefit. Profile choices are entered by the player or caregiver and only tailor suggestions.

## Plan

**Screens.** Website: welcome, sign-in (with guest mode), five-step onboarding, home with explained recommendations, game library with per-game settings, calibrate-and-launch, progress, settings, privacy. Game: home, camera calibration, instructions, play (with tracking indicator and recovery guidance), pause, break, summary.

**Games.** Ten, each with its own hand-drawn scene (no stock art):

| # | Game | Skill | Phase |
|---|------|-------|-------|
| 1 | Lantern Memory | Working memory | Getting to know your pace |
| 2 | Quiet Signals | Response inhibition (go / no-go) | " |
| 3 | Sorting Stones | Cognitive flexibility (cued rule switches) | " |
| 4 | Meadow Search | Focused attention (visual search) | " |
| 5 | Constellation Trace | Planning and sequencing | " |
| 6 | Echo Garden | Working memory (n-back) | Adapting to you |
| 7 | Pattern Loom | Pattern reasoning | " |
| 8 | Steady Beat | Sustained attention and timing | " |
| 9 | Mirror Match | Visual-spatial reasoning | " |
| 10 | Firefly Count | Quick counting | " |

**Architecture.**

```
halcyon/
  catalog.json        single source of truth for games, skills, profile options, age range
  run.py              local server: serves web/, shares profile + progress, launches the game
  config.example.json optional runtime settings (copy to config.json)
  web/                static site (no build step): css/, js/, fonts/, img/
  data/               profile.json, progress.json, calibration.json (created at runtime)
  game/
    halcyon_game/
      tracking/       MediaPipe hands / pose, no-camera tracker, status + guidance
      input_manager.py  mouse, touch, keyboard and camera -> one set of actions
      adaptive.py     starter estimate, ongoing adaptation, recommendations
      games/          base class + ten games + art.py (sprites)
      screens.py      home, calibrate, instructions, play, pause, break, summary
      gfx.py theme.py ui.py sound.py storage.py config.py app.py
    tests/            headless end-to-end tests
```

## Install

Requires Python 3.9 to 3.12 (MediaPipe wheels) and a webcam only if you want movement input.

```bash
cd halcyon/game
pip install -r requirements.txt
```

## Launch

```bash
cd halcyon
python run.py            # opens http://127.0.0.1:8765
```

Create a profile (or continue as a guest), pick a game, choose **Open the game window**. Or run the game directly:

```bash
cd halcyon/game
python -m halcyon_game                      # home screen
python -m halcyon_game --game echo_garden   # a specific game
python -m halcyon_game --movement pose      # hands | pose | none
python -m halcyon_game --no-camera          # never opens the camera
```

First use of **whole-body (pose)** mode makes MediaPipe download a small model once; hands mode needs no download.

## Movement input

| Mode | Cursor | Select | Other |
|------|--------|--------|-------|
| Hands (seated, small range) | between thumb and index tip | pinch, or hold still | hold an open palm to pause |
| Whole body (standing) | dominant wrist | hold still, or raise an arm (position-free games) | lean left / right to choose |
| No camera | mouse or touch | click / tap | arrows + Enter, A/D, number keys, Esc to pause |

Every game and level works with every mode. Before play, a calibration step shows the camera, finds your comfortable range, and offers a practice selection. A status chip and plain-language guidance appear if you leave the frame or the room is dark. **Skip** and **Continue without camera** are always offered. The movement range is saved as four numbers; frames are never stored.

When tracking is unreliable, a missed response is **not counted as a thinking mistake** (it is excluded from accuracy and from any difficulty change).

## Difficulty

* **Getting to know your pace**: your first five completed games are five different games, kept gentle. A small in-game staircase (up after two steady answers, down after a miss) gives each game an estimate. After the fifth, the five estimates plus comfort signals (break requests, "too easy / too hard") give a starting level for all games. This is a usability estimate, not a validated threshold.
* **Adapting to you**: after each game the engine looks at accuracy on valid trials, response time, completion, tracking reliability, breaks and feedback, then changes **at most one dimension** (speed, challenge or visual detail) by **one step** and explains why in simple words. Easing is never a penalty. Players and caregivers can override any level in the website's *Games* page.

## Configuration

* Age range, games and profile options: `catalog.json`.
* Camera index, gestures, thresholds, fullscreen: copy `config.example.json` to `config.json`.
* Per-game speed / challenge / visual detail, sound, session length, movement mode: in the website, or in `data/profile.json`.

## Test

```bash
cd halcyon/game
python -m unittest discover -s tests -v
```

The tests drive the real app through ten sessions with a synthetic player and no camera, checking five different starter games, the estimate after game five, adaptation afterward, saving, and clearing. Render screens for review with `python tests/render_screens.py OUT_DIR`. Regenerate site artwork with `python tools_export_art.py`.

## Privacy

Everything stays on this computer. Stored: profile and preferences (browser storage and `data/profile.json`), game results (`data/progress.json`), and four calibration numbers. Never stored: video, images, audio, diagnoses. Clear progress or delete everything from the website's Settings. The local server listens on `127.0.0.1` only and launches only games listed in `catalog.json`.

## Honest limits

* Camera tracking was verified on synthetic frames (statuses, guidance, geometry) and the launch handoff; it still needs a real-world pass with a webcam and with the people it is for. Gesture thresholds are first guesses and are configurable.
* Starting levels come from five games, so treat them as a comfortable place to begin.
* Difficulty dimensions and thresholds are reasoned defaults, not clinically validated, and should be reviewed with autistic players, caregivers and clinicians before wider use.
