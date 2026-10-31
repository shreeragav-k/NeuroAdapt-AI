# Halcyon workflow (age-group edition)

The website in `web/` follows one strict path. Run it with `python run.py`, then open http://127.0.0.1:8765/.
Rules live in `web/js/flow/logic.js`, the 105 games (games 1 to 3 of each of the 9 lists are the movement games) in `web/js/flow/data.js` and `engines.js`, the screens in `web/js/app.js`.

```
Create account / Sign in (name, age, optional condition, email, password)
  -> Assessment: the 5 games of the player's age group
  -> Assessment report  (name, age, group, condition, accuracy per game, overall, ability score, level)
  -> Adaptive learning plan: the 10 games of that level
  -> Daily session (one per day): those 10 games, in order. Games 1 to 3 of every list are the movement games Fruit Catcher, Paint the Path and Feed the Animal
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

## Movement games: games 1, 2 and 3 of every list
**Fruit Catcher** (1), **Paint the Path** (2) and **Feed the Animal** (3) open every one of the nine lists (3 age groups x Easy / Medium / Hard). They replace the first three games that used to be there, so a list is still 10 games, in difficulty order. None is in the assessment. Each is played with your hand in front of the camera, a mouse, or a finger, and each is scored like every other game: every game turns into right / wrong trials, so it counts in the session accuracy, the per-game "previous vs today" chart, the skill areas and the level decision.

| # | Game | Skill area | One scored round | What is right / wrong |
|---|------|-----------|------------------|-----------------------|
| 1 | Fruit Catcher | Self-control (response inhibition) | 3 rounds (a round is one fall of a fruit and a chocolate), 3 lives, ends early if time (30 / 45 / 60 s) runs out | each fall: fruit caught = right; fruit missed or chocolate touched = wrong |
| 2 | Paint the Path | Spatial thinking (visuomotor control) | 2 shapes (Easy line + circle, Medium circle + zigzag, Hard zigzag + crown), 35 to 45 s each (15 s more for ages 1 to 5) | each shape is cut into 10 stretches; a stretch is right if it was reached and the fingertip stayed within 70% of the tolerance of the line on average |
| 3 | Feed the Animal | Memory (associative memory) | 3 animals (3 rounds); Easy: 3 foods, hint always; Medium: 4 foods, hint for 3.5 s; Hard: 5 foods, no hint | each try that reaches the mouth: right food = right, wrong food = wrong (it goes back, no penalty) |

* **Also shown, from the original games' scoring:** Fruit Catcher (fruit caught); Paint the Path (stars 1 to 3 from accuracy and completion, points = 1000 + accuracy x 12 + a first-try bonus, tracing accuracy %); Feed the Animal (10 points a feed, stars from accuracy). They are shown on the cards between and after the shapes, while the saved score is the right / wrong trials above.
* **They come from the supplied games** (`mediapipe.zip` for Fruit Catcher, `py_game2.zip` for Paint the Path, `rabbit.zip` for Feed the Animal). Rules were ported into `fruitcatcher.js`, `tracepath.js` and `feedanimal.js` (pure, tested without a browser); the drawing and the look (ivory, serif, teal) are in `fruitgame.js`, `paintgame.js`, `feedgame.js` on a shared frame `moveshell.js`. Animal and food pictures are in `web/img/feed/`.
* **The one exception to "no game in two sets":** these three games appear in nine lists each (one per group and level, with their own settings). The other 63 list games and the 15 assessment games are all different (a test checks it).
* **Hand tracking in the page.** MediaPipe's Hand Landmarker runs in the browser (files in `web/vendor/mediapipe`, offline). Fruit Catcher uses the wrist (left / centre / right); Paint the Path uses the index fingertip; Feed the Animal uses the fingertip plus the thumb-to-index distance for a pinch (squeeze below 0.085, let go above 0.13, as in the original). A mouse or a finger always works: hover or drag along the line, press-drag-release a food, arrow keys or taps for the fruit.
* **Camera consent and lifecycle (`camera.js`).** Every movement game opens with "Start with camera" or "Play without camera" and a link to the privacy page. The camera is asked for only after "Start with camera"; only one stream exists at a time (an earlier one is released first, a busy camera is retried); the preview shows "Live - not recorded" with a "Turn camera off" button; every track is stopped when the round ends, when the player turns it off, when the page changes, or if the player leaves while it is still starting. If the camera is blocked or missing the player simply plays with the mouse or a finger. `cameraLog` (names and times of camera events, never any picture) is shown on the privacy page.
* **The video is never recorded.** Said on every game card, on the camera preview, under each game and on `#/privacy` (footer link). Only a few numbers per moment come out of a picture (wrist, fingertip, thumb distance); the picture itself is never kept. Tests fail if the code ever uses `MediaRecorder`, `captureStream`, `toBlob`, `toDataURL`, `Blob`, a request from the files that see the video, or turns audio on. The saved result of a game is only right / wrong, the level step and a short label.
* **Safe to play again and again.** The hand model is built once, kept, and preloaded while the game card is read; the sprites are loaded once and a plain shape is drawn if one is missing; the fall of Fruit Catcher is slow enough to follow (4 / 5 / 6 pixels a step, one lower for ages 1 to 5, +1 after every 5 fruit up to +2).
* **Text sizes.** Nothing on the screens is smaller than about 13 px (fonts unchanged); a test checks the CSS.
* **Optional PyGame window** (not part of the daily list): `py main.py` starts the site; `cd game/fruit_catcher && py main.py` opens the Fruit Catcher window alone (`--no-camera` for keys only). Its rules are in `game/fruit_catcher/logic.py`; a test checks they match `fruitcatcher.js`.
* Tests: `node --test tests/flow.test.mjs` and `cd game && python -m unittest discover -s tests`.

## Suggested games: Make a Face and Cut the Fruit
Two more movement games (from the supplied `co game.zip` and `cut_the_fruit.zip`) are **not** part of the 10 games of a level. They are offered as optional **extras** on the plan page ("Suggested for you") when a player has the problem they help with. Each one is 3 rounds, is scored like every other game (right / wrong trials), is saved in the player's list and appears in that day's daily report ("Suggested games played today"), and **never changes the level**.

| Game | Skill area | Suggested when | Rounds | Right / wrong |
|------|-----------|----------------|--------|---------------|
| Make a Face | Social thinking (social cognition) | Attention or Flexible thinking is among the 3 lowest skill areas (latest report, below 85%), **or** the condition typed at sign-up has a word like autism, ASD, Asperger, social, emotion, communication, speech, selective mutism, anxiety | 3 faces; Easy 2 faces to choose from (6 s each), Medium 4 faces (5 s), Hard 5 faces (4 s); +2 s for ages 1 to 5; the face is held 0.5 to 0.6 s | a face matched in time = right; time ran out = wrong |
| Cut the Fruit | Processing speed (hand-eye coordination) | Self-control, Processing speed or Spatial thinking is among the 3 lowest skill areas, **or** the condition has a word like ADHD, attention, hyperactive, impulsive, dyspraxia, coordination, motor, cerebral palsy | 3 waves; Easy 2 fruit + 1 bomb, Medium 3 + 1, Hard 4 + 2; 3 lives; slower than the original | every thing thrown: fruit cut = right, fruit missed = wrong, bomb cut = wrong (and a life), bomb left alone = right |

* Nothing is suggested when nothing points to it (all skill areas fine and no matching condition). The reason is written on the card ("Attention is among your lowest skill areas, and it also fits the condition you told us about"). The rules are `suggestionsFor` in `logic.js` and `SUGGESTIONS` in `data.js`; results are kept by `recordExtra`.
* **Make a Face** uses MediaPipe's Face Landmarker (`web/vendor/mediapipe/face_landmarker.task`, from the supplied zip, offline) in the page. The camera picture gives a list of numbers (smile, jaw open, eye blink ...); the expression rules and thresholds are those of the original game (`expressions.js`). The faces are drawn from shapes (no emoji). Without a camera the player taps the matching face. **Cut the Fruit** follows the fingertip (as Paint the Path does), a mouse or a finger; fruit and halves are the supplied pictures (`web/img/slice`); rules in `slicerules.js`.
* Camera rules are the same as for games 1 to 3: "Start with camera" / "Play without camera", stopped at the end of the round, never recorded; a test scans the new files too. A suggested game is only playable by a player it is suggested to.
* They are the second deliberate exception to "no game in two sets": they are not in the lists at all (`SUGGESTIONS`, not `CATALOG`).

## Reports and "Is it working?"
Daily report graphs: accuracy over time (assessment, then each day, with the 85% and 50% lines), **each game, previous session vs today** (bars), skill areas (assessment / previous / today) and progress since the assessment (start vs now per skill area).

"Is it working?" (`progressFrom` in `logic.js`) looks at three things, and calls a change real only at 5 points or more: the level (moved up since the assessment?), the **same level over time** (first vs latest session at the level played most, the fairest comparison), and each skill area (assessment vs latest day). Verdicts: too early (one session), improving, steady, mixed, slipping. It appears on the plan page and in every daily report. Wording is honest on purpose: it shows results in these games; practice can raise a game score and this is not a clinical test, so it is a trend and not proof of medical benefit.

## Assessment and level
Each assessment game has 3 rounds on a staircase from step 1 to 6, starting at 3: a right answer moves one step up, a wrong one one step down. Game ability = average of the steps played plus the step that would come next. Overall ability = average of the 5 games.

| Ability | Level |
|---------|-------|
| below 2.5 | Easy |
| 2.5 to below 4.5 | Medium |
| 4.5 or more | Hard |

## Daily session and report
One session per calendar day, made of the 10 games of the current level (3 rounds each; 2 boards for card-pair games). Rounds alternate between the two steps of the level (Easy 1-2, Medium 3-4, Hard 5-6). Accuracy of a session = the average of its 10 game accuracies.

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
