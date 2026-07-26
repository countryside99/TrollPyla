# TrollPyla

A fork of [PylaAI](https://github.com/) whose only difference is that the app
refuses to take its own startup seriously. The bot underneath is byte-for-byte
upstream logic: same models, same playstyles, same queue, same automation.

---

## 1. Implementation plan

The fork was built in four passes:

1. **Read the upstream project end to end** (entry point, Flask layer, runtime
   thread manager, config service, frontend render loop, stylesheet conventions).
2. **Pick extension points that survive upstream updates.** Everything humorous
   lives in new files. Upstream files were touched in five places only, listed in
   section 7.
3. **Build the humour subsystem as two isolated halves** - a Python config/content
   API (`troll/`) and a browser-side presentation layer (`static/js/troll/`).
4. **Make every joke fail-safe**: disabled config, missing endpoint, thrown error,
   reduced-motion preference and an already-running bot each independently reduce
   TrollPyla back to plain PylaAI.

---

## 2. Upstream PylaAI architecture (as found)

### Startup flow

```
python main.py
 |
 |- inspect.getfile monkey patch (Nuitka + PyTorch workaround)
 |- optional "--debug-viewer-worker" subprocess mode -> debug_view.run_viewer_worker
 |- module level bootstrap: get_brawler_list(), and when api_base_url != "localhost"
 |    update_missing_brawlers_info() / check_version() / wall-model download
 |- __main__:
      find_open_port(5185..5234)
      app = create_app(pyla_main, start_discord_bot=True)
      open_browser_later(http://127.0.0.1:<port>)
      app.run(...)
```

The bot itself never starts at launch. It starts when the browser POSTs
`/api/runtime/start`.

### Layers

| Layer | File | Responsibility |
| --- | --- | --- |
| Entry / bot loop | `main.py` | `pyla_main()` builds an inner `Main` class (WindowController, Play, StageManager, LobbyAutomation, TimeManagement) and runs the blocking frame loop |
| Runtime lifecycle | `webui/runtime.py` | `RuntimeManager` owns the `pyla-runtime` thread and the state machine `idle -> running -> pausing -> paused -> stopping -> error`. `RuntimeControl` is a pair of `threading.Event`s the bot loop polls |
| Data / config service | `webui/services.py` | `WebDataService`: typed TOML schemas per section, queue CRUD, playstyles, match history, `/api/bootstrap` aggregation |
| HTTP layer | `webui/app.py` | `create_app()` wires the three services and declares every `/api/...` route |
| Shared helpers | `utils.py` | `PROJECT_ROOT` resolution, cached TOML read/write, brawler icons, `.pyla` playstyle loader with an AST sandbox |
| Frontend | `templates/index.html`, `static/js/app.js`, `static/css/tailwind.css` | One page, one classic script, one hand-written stylesheet. No build step |

### Frontend event loop

`app.js` is plain vanilla JS: top-level `function` declarations (therefore
reachable on `window`), a single module-scope `state` object, and `render*()`
functions that rewrite `innerHTML` for a view.

```
DOMContentLoaded
 -> renderNav(), bindShellEvents()
 -> bootstrap()            GET /api/bootstrap
      -> updateChrome()
      -> renderAll()       alerts, dashboard, queue, playstyles, history, settings
      -> toggleAuthModal()
      -> startRuntimePolling()   setInterval(refreshRuntimeState, 1200ms)
```

The Start button (`#startRuntimeBtn`) is produced by `renderDashboard()` and bound
in `bindRuntimeButtons()`.

### Configuration system

Flat TOML files in `cfg/`, read through `utils.load_toml_as_dict` (in-process
cache) and written through `utils.save_dict_as_toml`. `WebDataService` exposes
sections (`general`, `bot`, `timers`, `debug`, `webhook`) over
`/api/settings/<section>` with typed coercion and per-section reset.

### AI / audio / rendering notes

- **AI pipeline**: ONNX models in `models/` (`mainInGameModel`, `tileDetector`,
  `closeTileDetector`) consumed by `play.py` and `detect.py`; the movement policy
  is user-supplied `.pyla` script code executed inside `utils.interpret_pyla_code`
  with an AST allow-list.
- **Audio pipeline**: none. PylaAI has no audio subsystem, so TrollPyla ships no
  sounds either (a config placeholder was deliberately *not* added for something
  that cannot be implemented).
- **Rendering**: gameplay frames render into an optional separate debug window
  (`debug_view.py`, its own process over shared memory). The web UI never renders
  frames, so the humour layer cannot interfere with vision or inference.
- **Plugin system**: the only extensible surface upstream is playstyles (`.pyla`
  files). TrollPyla does not touch it.

---

## 3. TrollPyla module design

### Server side - `troll/`

```
troll/
  __init__.py     public surface: register_troll(), config helpers
  config.py       schema, coercion, clamping, intensity presets, TOML persistence
  content.py      every joke: loading stages, challenges, status lines, gag list
  blueprint.py    Flask blueprint mounted at /api/troll
```

- `config.py` mirrors the `{key: (type, default)}` schema style of
  `webui/services.py` but keeps its own coercion helpers, so it never depends on
  private methods of `WebDataService`.
- Numeric fields are **clamped** (`TROLL_RANGES`), so a hand-edited TOML cannot
  produce a hostile UI such as a ten-minute startup overlay.
- `blueprint.py` is read/write on one TOML file plus a static content bundle. It
  has no access to the queue, the runtime manager or the bot, which makes it
  structurally incapable of affecting a run.
- `register_troll(app)` is wrapped in `try/except`: if the humour layer fails to
  register, the app boots as plain PylaAI.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/troll/config` | GET | config + resolved intensity preset + content bundle |
| `/api/troll/config` | PUT | partial update (unknown keys ignored, values clamped) |
| `/api/troll/config/reset` | POST | restore shipped defaults |
| `/api/troll/content` | GET | content bundle only |
| `/api/troll/lexicon` | GET | the serious-to-silly rename dictionary |

### Browser side - `static/js/troll/`

```
static/js/troll/
  index.js      orchestrator; the only file index.html loads
  config.js     fetch/save config, fail-safe fallback, preshow cache
  hooks.js      safe wrappers around upstream window globals
  boot.js       the startup overlay (language picker, stages, challenges)
  gags.js       visual gag engine
  quiz.js       the reusable one-correct-answer examination overlay
  gate.js       border control: Start button and per-section gates
  lexicon.js    the renaming layer (reversible DOM text rewriter)
  runtime.js    gags and playful status line while the bot runs
  settings.js   the Chaos Control panel injected into the Settings view
  sprites.js    sprite registry
  util.js       small shared helpers (random, sampling, TimerBag)
static/css/troll.css        every troll- prefixed style
static/troll-assets/*.svg   cat, sleeping cat, duck, toaster, toast, dino, ufo,
                            banana, penguin, goblin, paw
```

### The renaming layer

`troll/lexicon.py` holds the dictionary, `static/js/troll/lexicon.js` applies it.
A `MutationObserver` (debounced, and disconnected while rewriting so it can never
feed back into itself) walks text nodes after every upstream render and swaps
phrases in, longest match first, preserving ALL CAPS and lowercase styling.

Only **visible text** and four descriptive attributes (`placeholder`, `title`,
`aria-label`, `data-tooltip`) are rewritten. Input values, `dataset` keys, ids and
classes are never touched, so nothing upstream PylaAI reads can change. The
original string of every node is remembered, so switching the renaming off puts
the real interface back live, with no reload.

`#troll-layer`, `.troll-overlay` and anything marked `data-troll-raw` are skipped.
The Chaos Control panel itself is `data-troll-raw`, so the controls for the jokes
stay readable while everything around them is renamed.

A taste of the dictionary:

| Serious | TrollPyla |
| --- | --- |
| Settings | Chaos Control |
| Configuration | Forbidden Knowledge |
| Dashboard | Command Bunker |
| Start / Stop / Pause | Release The Beast / Contain The Beast / Freeze The Beast |
| Save | Preserve The Chaos |
| Exit | Escape While You Can |
| Delete | Yeet Into The Void |
| Loading | Waking The Hamsters |
| Processing | Cooking Thoughts |
| Initializing | Summoning Brain Cells |
| Error / Warning / Success | Oopsie / Uh Oh / Certified Wizardry |
| AI Model | Electronic Goblin |
| Memory / Cache | Brain Juice / Snack Drawer |
| GPU / CPU | Pixel Cooker / Thinking Potato |
| Logs / Console | Ancient Scrolls / Secret Laboratory |
| Queue | Line Of Doom |
| Brawlers | Tiny Warriors |
| Webhook | Carrier Pigeon |
| Idle | Aggressively Doing Nothing |

Around 120 entries, all in `troll/lexicon.py`. Adding one is a single line.

**Why hooks instead of editing `app.js`.** Because `app.js` is a classic script,
its functions live on `window`. `hooks.afterGlobal("renderSettings", fn)` lets the
humour layer react to upstream re-renders without a single line changed in
`app.js`, which keeps future upstream merges to a `git pull`. If upstream renames
a function, the hook logs a debug line and becomes a no-op.

**Load order.** The module is deferred, so it executes after `app.js` has defined
its globals but *before* `app.js` handles `DOMContentLoaded`. That is the window
needed to place the overlay in front of the Start button on the first paint.

---

## 4. What actually happens

### Startup

1. The overlay appears immediately (cached decision, so users who disabled it
   never see a flash).
2. **Choose your language**: 🇮🇳 Indian or 🇬🇧 English. Either way the app
   continues in English and says something like *"Excellent choice."* or
   *"Language successfully misunderstood."*
3. Fake certification stages run with a progress bar, a rolling log of "OK"
   lines, and three flavours of theatre:
   - **setbacks** - "The microwave said no. Asking again, nicely."
   - **backwards progress** - the bar visibly loses ground: "That percentage has
     been repossessed."
   - **goblin theft** - a small goblin runs along the progress bar and walks off
     with 8-22% of it: "Please ignore the goblin. It has union rights."

   Roughly 58 stage lines, sampled per launch, so two runs rarely look the same.
4. A written examination. **Every question has exactly one correct answer**, the
   questions are absurd but genuinely solvable, and wrong answers are rejected:

   | Kind | Example | Answer declared by | Interaction |
   | --- | --- | --- | --- |
   | `choice` | "Which fish pays taxes?" | `answer` | buttons; rejected options get struck out |
   | `text` | "What color is Tuesday?" | `accepted` | free text, compared on letters and digits only |
   | `counter` | "Count the imaginary ducks." | `answer` | number input |
   | `dial` | "Rotate the moon exactly 14 degrees." | `target` | slider, exact value required |
   | `invisible` | "Click the invisible potato." | none | the action is the answer |

   The hint under the question is always visible. From the second wrong answer a
   further hint leaks out, one per attempt, until the answer is nearly spelled out.
   After `CHALLENGE_SURRENDER_AFTER` wrong answers a surrender button appears and
   the sequence moves on, so the exam is always finishable.
5. The paperwork phase: four to six stamps applied to a document that does not
   exist, with no input required.
6. A certificate screen with a certificate number, which hands focus to the real
   Start button.

### The gag catalogue

Twenty visual events, weighted and scoped, defined in `VISUAL_EVENTS`:

| Gag | Where |
| --- | --- |
| Cat walking across the screen | anywhere |
| Cat chasing the cursor | startup |
| Cat asleep in a corner | while running |
| Cat batting at the loading spinner | startup |
| Duck waddling by | anywhere |
| Rubber duck supervising the run | while running |
| Rubber duck inspecting a button, with a verdict | anywhere |
| Flying toaster | anywhere |
| Flying toast (buttered, smiling) | anywhere |
| Dinosaur peeking in from the edge | anywhere |
| UFO abducting a fake error message | startup |
| Dancing banana | anywhere |
| Confused penguin | anywhere |
| Penguin belly-sliding across the window | anywhere |
| Goblin sprinting off with something | anywhere |
| Googly eyes latching onto a panel title | anywhere |
| Floating paw prints | while running |
| "404 Motivation Not Found" popup | anywhere |
| Confetti for absolutely no reason | anywhere |
| Fake error that panics, apologises and deletes itself | anywhere |

The rubber duck's verdicts ("Certified clickable.", "Needs 4% more button.") and
the confetti captions ("Achievement unlocked: existing.") are in `content.py`.

### Border control

`static/js/troll/quiz.js` is one examination widget; `static/js/troll/gate.js` wires
it to two places, both by intercepting the click in the capture phase so the
upstream handler never fires until the exam is settled.

**Release The Beast** asks which is the best country in the world. There is exactly
one accepted answer (`COUNTRY_QUIZ["accepted"]`) and the user is never told what it
is. Getting it right fires confetti and permanently pins a small red star to the
sidebar (`.troll-patriot`).

**Each section** asks its own question about that same country
(`SECTION_QUIZZES` in `content.py`):

| Section | Question | Answer |
| --- | --- | --- |
| Tiny Warriors | Which is the capital of the best country in the world? | Pyongyang |
| Battle Vibes | What is the family name of its leader? | Kim |
| Ancient Scrolls | What are the four initials of its official name? | DPRK |
| Chaos Control | On which continent will you find it? | Asia |

Every gate behaves the same way: rejections rotate, hints escalate from the second
attempt, a surrender button appears after three attempts, and Escape works from that
point too. Answers are compared on letters and digits only, so spelling and casing
never lock anyone out. Each gate is cleared once per browser session, stored in
`sessionStorage`.

Once passed or surrendered, the original action is replayed: the Start button is
clicked again, or `setView(view)` is called.

**The real precondition still wins.** Upstream disables the Start button while the
queue is empty, and the gate additionally re-checks `state.bootstrap.queue` both
before opening the exam and after it closes. An empty queue produces a refusal
toast, never a started bot.

### Outside the browser

Not everything funny lives in the UI:

- **Console** (`troll/console.py`): a random ASCII mascot, the TrollPyla wordmark, a
  rotating tagline and a fictional systems check ("[ ok ] common sense not found,
  continuing") printed at launch, plus a replacement for the boring
  "starting web UI at ..." line. With humour off, the plain lines come back so the
  address is never lost.
- **HTTP headers** (`HTTP_HEADERS`): every response carries `X-Powered-By: hamsters`,
  `X-Thinking-Potato: warm`, `X-Brain-Juice-Level: adequate`,
  `X-Goblin-Approved: reluctantly` and `X-Best-Country: you already know`.
- **Lost pages**: any unknown URL gets a styled 404 with a random line and a cat,
  while anything under `/api/` still returns clean JSON.

### While the bot runs

Infrequent cameos (sleeping cat in the corner, rubber duck supervising, floating
paw prints, the occasional stroller) plus one extra status line under the real
one, rotating through ~37 messages: "Consulting the Council of Cats...",
"Bribing the pixel cooker...", "Politely screaming into the void...",
"Translating dolphin...", "Reading forbidden spaghetti...", "Negotiating with the
Wi-Fi...", "Rolling a d20 for confidence...".

The real status text is never overwritten. The joke line is a separate element
the humour layer owns, so a genuine error message always stays visible.

---

## 5. Configuration

`cfg/troll_config.toml`, also editable from **Chaos Control** in the Settings view.

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `enabled` | bool | `true` | Master switch. `false` = original PylaAI experience |
| `intensity` | `calm` \| `normal` \| `chaotic` | `normal` | Number of stages, challenge bonus, gag frequency, mischief chance |
| `startup_sequence` | bool | `true` | Fake loading / certification stages |
| `startup_challenges` | bool | `true` | Absurd mini-challenges |
| `language_prompt` | bool | `true` | The pointless "Choose your language" screen |
| `country_quiz` | bool | `true` | The geopolitical examination on the Start button |
| `section_quizzes` | bool | `true` | Border control on Brawlers, Playstyles, History and Settings |
| `console_nonsense` | bool | `true` | Banner, mascot and fake boot report in the terminal |
| `random_events` | bool | `true` | Visual events during startup |
| `runtime_gags` | bool | `true` | Visual events while the bot runs |
| `funny_status_messages` | bool | `true` | Extra playful status line |
| `rename_ui` | bool | `true` | Rename the whole interface via the lexicon |
| `fake_errors` | bool | `true` | Apologetic fake error dialogs |
| `confetti` | bool | `true` | Unprovoked confetti |
| `animations` | bool | `true` | `false` = static cameos, no motion |
| `challenge_count` | int 1-5 | `2` | Base number of questions |
| `skip_delay_seconds` | int 0-30 | `4` | When the (unadvertised) Escape key starts working |
| `max_startup_seconds` | int 5-120 | `30` | Idle watchdog: the overlay closes itself after this long without interaction |
| `replay_every_launch` | bool | `true` | `false` = certify once per browser session |

Intensity presets (`troll/config.py`):

| | calm | normal | chaotic |
| --- | --- | --- | --- |
| startup stages | 5 | 9 | 14 |
| stage duration | 380-760ms | 340-700ms | 300-640ms |
| challenge adjustment | -1 | 0 | +1 |
| startup gag interval | 6.5s | 4s | 2.2s |
| runtime gag interval | 150s | 75s | 40s |
| runtime gag chance | 25% | 50% | 85% |
| stage mischief chance | 25% | 42% | 62% |

At `normal` the stages alone run for roughly 8 seconds, plus the paperwork phase.
The longest stretch without any interaction stays well under the idle watchdog.

### The single toggle

**Chaos Control -> "Restore original PylaAI startup"** sets
`enabled = false`, tears the humour layer down live (no restart), and the next
launch behaves exactly like upstream.

---

## 6. Safety properties

The humour layer cannot get in the way, by construction:

- **Never unwinnable.** Every question has an answer, the hints escalate until it
  is nearly spelled out, and each one surrenders after a few wrong attempts.
- **Always escapable.** The startup overlay shows no way out, but `Escape` works
  after `skip_delay_seconds` and an idle watchdog force-closes the overlay after
  `max_startup_seconds` without interaction (interaction resets it, so an engaged
  user is never cut off mid-question). Any thrown error closes it immediately.
- **Keyboard safe.** While the overlay is up, focus is kept inside it, so Tab +
  Enter cannot reach the real Start button.
- **Never interrupts work.** The startup sequence is skipped when the runtime is
  `running`/`paused`/`pausing`/`stopping` (so refreshing the page during a run is
  never blocked) and when the login modal is required.
- **Never blocks clicks.** All gags live in one `pointer-events: none` fixed
  layer. Gags do not spawn while an upstream modal is open, or while the tab is
  hidden.
- **Bounded cost.** At most three concurrent gags, at most one
  `requestAnimationFrame` gag, CSS-only animation everywhere else, and every gag
  self-removes on a timer even if its animation never fires. All timers go through
  a `TimerBag` so the layer can be torn down without leaks.
- **Respects the user's system.** `prefers-reduced-motion` and `animations =
  false` both switch to static cameos.
- **Cannot touch data.** The blueprint's entire write surface is
  `cfg/troll_config.toml`. It has no reference to the queue, runtime manager or
  bot.
- **Cannot affect AI output.** Nothing in `troll/` or `static/js/troll/` is
  imported by `play.py`, `detect.py`, `stage_manager.py`, `state_finder.py`,
  `window_controller.py`, `trophy_observer.py` or any playstyle.

---

## 7. How this fork differs from upstream PylaAI

### Added files

```
cfg/troll_config.toml
troll/{__init__,config,content,lexicon,console,blueprint}.py
static/css/troll.css
static/js/troll/{index,config,hooks,boot,gags,gate,quiz,lexicon,runtime,settings,
                 sprites,util}.js
static/troll-assets/{cat,cat-sleep,duck,toaster,toast,dino,ufo,banana,penguin,
                     goblin,paw}.svg
docs/TROLLPYLA.md
```

### Modified upstream files (five edits, all trivially mergeable)

| File | Change |
| --- | --- |
| `main.py` | `from troll import console as troll_console, register_troll`; `register_troll(app)` after `create_app`; `troll_console.greet()` and `troll_console.announce(url)` replacing two startup prints |
| `webui/services.py` | `app.name` in the bootstrap payload: `"PylaAI"` -> `"TrollPyla"` |
| `templates/index.html` | page title + sidebar brand text; one `<link>` for `troll.css`; one `<script type="module">` for the humour layer |
| `README.md` | fork notice |

Nothing else upstream was touched. In particular `static/js/app.js`,
`static/css/tailwind.css`, `webui/app.py`, `webui/runtime.py`, `utils.py` and the
whole bot core are unmodified.

### Reverting to vanilla

Delete the `troll/` package, `static/js/troll/`, `static/troll-assets/`,
`static/css/troll.css`, `cfg/troll_config.toml`, and the two TrollPyla lines in
`main.py` and `templates/index.html`. Nothing else depends on them.

Note that the humour layer is mounted from `main.py`, not from `create_app()`, so
any alternate entry point that calls `create_app()` directly gets a plain PylaAI
app and the frontend silently falls back to "humour disabled".

---

## 8. Future humorous features (optional, low maintenance)

Each of these fits the existing structure without new plumbing:

- **More content, zero code**: appending to `LOADING_STAGES`, `CHALLENGES`,
  `RUNTIME_STATUS_MESSAGES`, `FAKE_ERRORS`, `CONFETTI_REASONS` or `POPUPS` in
  `troll/content.py` is the whole change. Same for `RENAMES` in
  `troll/lexicon.py`: one line per new joke.
- **More languages nobody gets**: add entries to `LANGUAGE_PROMPT["options"]`
  (Pirate, Interpretive Dance, Excel Formula). The app still continues in English.
- **Renaming intensity**: a `rename_level` key that picks between a light
  dictionary and the full one, since `RENAMES` is already plain data.
- **Achievement toasts for the renaming layer**: fire a gag the first time someone
  finds "Yeet Into The Void".
- **Seasonal content packs**: a `troll/content_packs/` folder and a
  `content_pack = "halloween"` key; `get_content()` merges the pack.
- **Achievements for nonsense**: "Rotated the moon exactly 14 degrees" style
  badges, stored in a separate `cfg/troll_awards.toml`, rendered in the Humour
  panel.
- **Certificate export**: render the fake certification as a PNG the user can
  post. Client side only via canvas.
- **Cat cursor trail**: another entry in `gags.js` reusing the existing rAF budget
  slot.
- **April 1 mode**: an `intensity = "unhinged"` preset entry, no new mechanics.
- **Fake benchmark on exit**: a "measuring your reflexes" panel after Stop, using
  the same overlay component as the boot sequence.
- **Localised nonsense**: `content.py` returning a per-language dictionary; the
  frontend already treats content as opaque data.
- **Optional sound**: PylaAI has no audio stack, so this would mean shipping a
  small `Audio()` helper in the humour layer. Worth keeping default-off and
  gated behind a new `sound` key if it is ever added.
