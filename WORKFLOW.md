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

Every game is a standard cognitive task, and about half of them train memory. Games by skill area:

| Skill area | Ages 1 to 5 | Ages 6 to 17 | Ages 18 to 60 |
|---|---|---|---|
| Memory | 18 | 17 | 19 |
| Attention | 9 | 5 | 3 |
| Self-control | 2 | 3 | 2 |
| Reasoning | 3 | 6 | 5 |
| Flexible thinking | 1 | 1 | 1 |
| Spatial thinking | 0 | 2 | 2 |
| Processing speed | 2 | 1 | 3 |

The memory tasks are: short-term and span tasks (colour, shape and position sequences, Corsi blocks, digits and letters forwards and backwards, letter-number sequencing), visual and verbal recognition (what did you see, what went missing), delayed recall after a distraction (clapping or counting backwards), object-location memory, spatial layout recall, story recall, paired associates (shape-colour, word-number, name-job, word pairs), card-pair concentration and n-back. The rest train selective attention (visual search, flanker), response inhibition (go/no-go, Stroop), mental flexibility (task switching), reasoning (pattern series, matrices, analogies, logic), spatial thinking (mirror, rotation, route following) and processing speed (symbol coding, reaction, timing).

Each game is tuned to its age group: for ages 1 to 5 only shapes, colours and small sets with big touch targets and no reading; for 6 to 17 digits, letters and words with spans up to six; for 18 to 60 longer spans, 2-back, delays with counting backwards in threes, and multi-detail stories. Within a set no two games use the same engine, and no engine + content + mode combination is used twice anywhere. `tests/flow.test.mjs` checks this and that each game's answer is really right.

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
