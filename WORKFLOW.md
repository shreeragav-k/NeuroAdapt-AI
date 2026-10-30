# Halcyon workflow (age-group edition)

The website in `web/` follows one strict path. Run it with `python run.py`, then open http://127.0.0.1:8765/.
Rules live in `web/js/flow/logic.js`, the 105 games in `web/js/flow/data.js` and `engines.js`, the screens in `web/js/app.js`.

```
Create account / Sign in (name, age, optional condition, email, password)
  -> Assessment: the 5 games of the player's age group
  -> Assessment report  (name, age, group, condition, accuracy per game, overall, ability score, level)
  -> Adaptive learning plan: the 10 games of that level
  -> Daily session (one per day): those 10 games, in order
  -> Daily report: today vs. earlier days, level kept / raised / lowered
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

## Tests
```
node --test tests/flow.test.mjs
```
(The older PyGame / MediaPipe runtime in `game/` is not used by this workflow.)
