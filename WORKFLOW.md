# Halcyon workflow (age-group edition)

The website in `web/` follows one strict path. Run it with `python run.py`, then open http://127.0.0.1:8765/.
Rules live in `web/js/flow/logic.js`, the 105 games (Fruit Catcher is game 1 of each of the 9 lists) in `web/js/flow/data.js` and `engines.js`, the screens in `web/js/app.js`.

```
Create account / Sign in (name, age, optional condition, email, password)
  -> Assessment: the 5 games of the player's age group
  -> Assessment report  (name, age, group, condition, accuracy per game, overall, ability score, level)
  -> Adaptive learning plan: the 10 games of that level
  -> Daily session (one per day): those 10 games, in order. Game 1 of every list is the movement game Fruit Catcher
  -> Daily report: today vs. earlier days (graphs), level kept / raised / lowered, and "Is it working?" progress since the assessment
  -> next day: the 10 games of the (possibly new) level
```

## Accounts
The first page has **Sign in** and **Create account**. Creating an account needs name, age (1 to 60), an optional health condition, an email and a password (8+ characters, confirmed). Each account has its own profile, progress and reports. See `FIREBASE.md` for where accounts are stored (this browser, or Firebase).

## Age groups (no game is ever shared between groups)
| Group | Ages |
|-------|------|
| g1 | 1 to 5 |
| g2 | 6 to 17 |
| g3 | 18 to 60 |

Age 18 belongs to g3 so that no age sits in two groups. Change the limits in `GROUPS` in `data.js`.

## Games: 35 per group, 105 in all, no game in two sets
| Set | Games | Used for |
|-----|-------|----------|
| test | 5 | the assessment |
| easy | 10 | daily sessions at Easy |
| medium | 10 | daily sessions at Medium |
| hard | 10 | daily sessions at Hard |

**In order of difficulty.** Every game has a difficulty rank inside its set. The five assessment games are played from the easiest to the most demanding, and each daily session runs from a warm-up to the hardest game of the level. Before each game the player sees its rank (for example "game 3 of 10, easiest to hardest").

**Every game is a named cognitive task**, shown on a task card before play: the skill area, the classic task it is based on (digit span, Corsi blocks, n-back, delayed match-to-sample, paired-associate learning, Go/No-Go, Stroop, flanker, task switching, trail making, matrix reasoning and so on) and what it trains. About half of them train memory:

| Skill area | Ages 1 to 5 | Ages 6 to 17 | Ages 18 to 60 |
|---|---|---|---|
| Memory | 21 | 18 | 20 |
| Attention | 7 | 5 | 3 |
| Self-control | 2 | 3 | 2 |
| Reasoning | 2 | 4 | 4 |
| Flexible thinking | 1 | 2 | 1 |
| Spatial thinking | 0 | 2 | 2 |
| Processing speed | 2 | 1 | 3 |

**Memory games**
* Working and short-term memory: animal, fruit and position sequences that light up and play notes (Simon / Corsi), digit and letter spans forwards and backwards, mixed letter-number sequencing, n-back with animals, letters, positions and digits.
* Visual and verbal recognition: "what did you see", "what went missing", and the **memory basket** (study several pictures or words, then pick all of them among look-alikes).
* Delayed recall: the same, with a distraction in the gap (clapping, counting backwards from 10, counting backwards from 50 in threes).
* Spatial memory: where each picture, number, letter, word or symbol sat in a grid; lit-square layouts; card pairs.
* Associative memory: which colour each animal was, which number went with which word, which job with which name, word pairs, number-and-dots pairs.
* Episodic memory: short stories, news items and schedules, with a question about a detail.

**Attention, control, reasoning**: picture and letter search (cancellation), flanker, Go/No-Go with pictures, Stroop, rule switching, Trail Making B, pattern series, matrix puzzles, analogies, logic, mirror and rotation, route following, symbol coding.

**Pictures and feedback.** 26 illustrated pictures (animals, fruit, vehicles, everyday things) can take any body colour, so games can ask "what" and "which colour". Memory games show a shrinking study-time bar, correct and wrong answers play a soft chime, sequence pads play notes (switch sound off with the top-bar button), and a streak counter and star rating (1 to 3) reward a good run.

**Each game is tuned to its age group.** Ages 1 to 5: pictures, colours and small sets, large targets, no reading. Ages 6 to 17: digits, letters, words, spans up to six, stories. Ages 18 to 60: longer spans, 2-back, delays with counting backwards in threes, multi-detail schedules, relationship analogies.

**Suggestions follow the player's level.** The level (Easy, Medium, Hard) picks the 10 games; the plan page then marks the games for the player's two weakest skill areas as "focus", using the latest report.

Within a set no two games use the same engine, and no engine + content + mode combination is used twice anywhere. `tests/flow.test.mjs` checks this, the difficulty order, and that each game's answer is really right.

## Movement game: Fruit Catcher, game 1 of every list
Fruit Catcher is **game 1 of the 10** in all nine lists (3 age groups x Easy / Medium / Hard). It replaces the warm-up game that used to open each list, so a list is still 10 games. It is not in the assessment. A fruit and a chocolate fall together; be under the fruit, let the chocolate pass, and the middle lane is always safe.

* **One scored round, set by the level**: Easy 30 s, Medium 45 s, Hard 60 s, three lives; the fall speed is slow enough to follow with a hand in front of a camera: 4 / 5 / 6 pixels a step (240 to 360 px a second), one lower for ages 1 to 5, and +1 after every 5 fruit up to +2 (`sessionPlay` in `fruitcatcher.js`; free play keeps the original 8).
* **Scoring is the same as every other game.** Each fall is one trial: a fruit caught is right; a fruit missed or a chocolate touched is wrong. Accuracy = right / (right + wrong). The game counts as **Self-control** (response inhibition) in the skill charts, in the "previous vs today" bars and in the level decision.
* **The one exception to "no game in two sets":** the same game appears in nine lists (one per group and level, each with its own settings). The other 96 list games and the 15 assessment games are still all different. The user asked for this; more movement games can take game 2, 3... later (the catalogue row format and the `movement` trial kind are ready).
* **Safe to play again and again.** Only one camera stream is open at a time (an earlier one is released first; a busy camera is retried; a "Try the camera again" button appears if it still fails), the hand model is built once and kept (and preloaded while the game card is read, so the heavy start-up is not in the middle of a game), the sprites are loaded once and a plain shape is drawn if one is ever missing.
* **Text sizes.** Nothing on the screens is smaller than about 13 px: small labels were enlarged (fonts unchanged) and the chart text scales up on phones. A test checks the CSS.
* **Plays right inside the page.** Nothing to install or start. The camera follows your wrist with MediaPipe's Hand Landmarker running in the browser (files in `web/vendor/mediapipe`, offline). The arrow keys / A S D, a mouse, or a finger on the left, middle or right of the field work too.
* **Camera privacy (the video is never recorded).** Said on the game card, on the camera preview ("Live - not recorded"), under the game and on the `#/privacy` page (footer link). A "Turn camera off" button sits on the preview, and the camera stops when the round ends or the page changes. A test (`privacy: nothing in the site can record or send camera video`) fails if the code ever uses `MediaRecorder`, `captureStream`, `toBlob`, `toDataURL`, `Blob`, uploads from the camera files, or audio.
* **Optional PyGame window** (not part of the daily list): `py main.py` starts the site; `cd game/fruit_catcher && py main.py` opens the window alone (`--no-camera` for keys only). The server also keeps `/api/launch`. Its rules are in `game/fruit_catcher/logic.py`; a test checks they match `fruitcatcher.js`. Needs `pip install -r game/requirements.txt`.
* Tests: `node --test tests/flow.test.mjs` and `cd game && python -m unittest discover -s tests`.

## Reports and "Is it working?"
Daily report graphs: accuracy over time (assessment, then each day, with the 85% and 50% lines), **each game, previous session vs today** (bars), skill areas (assessment / previous / today) and progress since the assessment (start vs now per skill area).

"Is it working?" (`progressFrom` in `logic.js`) looks at three things, and calls a change real only at 5 points or more: the level (moved up since the assessment?), the **same level over time** (first vs latest session at the level played most, the fairest comparison), and each skill area (assessment vs latest day). Verdicts: too early (one session), improving, steady, mixed, slipping. It appears on the plan page and in every daily report. Wording is honest on purpose: it shows results in these games; practice can raise a game score and this is not a clinical test, so it is a trend and not proof of medical benefit.

## Assessment and level
Each assessment game has 6 rounds on a staircase from step 1 to 6, starting at 3: a right answer moves one step up, a wrong one one step down. Game ability = average of the steps played plus the step that would come next. Overall ability = average of the 5 games.

| Ability | Level |
|---------|-------|
| below 2.5 | Easy |
| 2.5 to below 4.5 | Medium |
| 4.5 or more | Hard |

## Daily session and report
One session per calendar day, made of the 10 games of the current level (8 rounds each; 2 boards for card-pair games, 12 for go/no-go). Rounds alternate between the two steps of the level (Easy 1-2, Medium 3-4, Hard 5-6). Accuracy of a session = the average of its 10 game accuracies.

After the 10th game a report is saved: today's accuracy, the previous session's accuracy and the change, each game against the last session at the same level, the history, and the level decision:

| Today's accuracy | Decision |
|------------------|----------|
| 85% or more, and not more than 5 points below the last session at this level | move up (Hard stays Hard) |
| below 50% | move down (Easy stays Easy) |
| anything else | stay (a high score that dropped by more than 5 points is repeated to confirm) |

A session that was started can be resumed after a reload. When today's session is done, the plan page offers a "pretend it is tomorrow" link for testing.

## Charts
The assessment report shows accuracy per cognitive skill area. Every daily report shows a line chart of overall accuracy (assessment, then each day, with the level played) and a bar chart per skill area comparing the assessment ("before"), the previous session and today, plus a table with the changes. The skill areas are listed in `DOMAINS` in `data.js`.

## Firebase (optional)
See `FIREBASE.md`. Without a config in `web/js/flow/firebase-config.js` everything stays in the browser.

## Interface
The web interface (`web/css/ui.css`, `web/js/app.js`, icons in `web/js/flow/icons.js`) is built as a small product shell on the Halcyon look (ivory, serif headings, one teal accent):

* **App bar** with the Halcyon mark, Plan and Reports tabs, a sound switch, the player's initials, name and age group, and Sign out. On a phone the tabs move to their own row.
* **Journey steps** (Assessment, Report, Day 1, Daily practice) above the main screens, so the player always sees where they are.
* **Sign in / Create account** as a split page: a calm brand panel on the left, a form with inline age-group hint, show-password buttons and clear errors on the right.
* **Plan dashboard**: level, day, last accuracy and sessions done; today's session with progress and the ten games in order (area chip, classic task, "focus" tags for the weakest skills); skill-area bars; an accuracy sparkline. After a finished day it shows tomorrow's session.
* **Game screens**: a segmented progress bar for the set, a task card before every game, the game inside an area-coloured frame, a finish card with stars.
* **Reports**: cover header, details, KPI strip, tables and charts; a reports list with a trend chart; print layout.
* Every page sets its own title, works from 360 px wide up, keeps keyboard focus visible and respects reduced motion.

## Tests
```
node --test tests/flow.test.mjs
```
(The older PyGame / MediaPipe runtime in `game/` is not used by this workflow.)
