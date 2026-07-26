"""
All TrollPyla humour *content* lives here, separated from the humour *mechanics*.

Adding a new joke, challenge or visual gag means appending to one of the lists
below. No JavaScript, CSS or bot code has to change.

Content is served to the browser through ``GET /api/troll/content``.
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Fake loading / certification stages
# ---------------------------------------------------------------------------
# Shown one after another with a progress bar during the startup sequence.
LOADING_STAGES: list[str] = [
    "Calibrating hamster-powered quantum processor...",
    "Checking if gravity is still enabled...",
    "Negotiating with the coffee machine...",
    "Teaching a potato machine learning...",
    "Verifying that bananas are still curved...",
    "Counting the pixels. All of them. Twice.",
    "Asking the GPU how its day is going...",
    "Reticulating splines (legally required)...",
    "Convincing the mouse cursor to cooperate...",
    "Downloading more RAM from the neighbours...",
    "Aligning the crystals of determination...",
    "Feeding the neural network a small snack...",
    "Checking that Tuesday has not been cancelled...",
    "Bribing the random number generator...",
    "Warming up the sarcasm module...",
    "Politely waking the AI. It hates mornings.",
    "Measuring the temperature of the internet...",
    "Rounding up all the stray semicolons...",
    "Asking the cat for permission to continue...",
    "Compiling vibes...",
    "Double-checking that up is still up...",
    "Simulating 4 billion imaginary matches...",
    "Applying anti-troll coating to the troll layer...",
    "Verifying that the verification is verified...",
    "Consulting local cats...",
    "Downloading common sense... (0%)",
    "Synchronizing hamsters...",
    "Counting invisible ducks...",
    "Verifying banana license...",
    "Asking the microwave for permission...",
    "Measuring keyboard intelligence...",
    "Calibrating quantum potatoes...",
    "Scanning for suspicious pigeons...",
    "Untangling the spaghetti...",
    "Waking the thinking potato...",
    "Filling the brain juice reservoir...",
    "Alphabetising the snack drawer...",
    "Preheating the pixel cooker...",
    "Negotiating with the Wi-Fi...",
    "Translating dolphin...",
    "Reading forbidden spaghetti...",
    "Charging brain cells...",
    "Politely screaming into the void...",
    "Sharpening the electronic goblin...",
    "Checking whether the mouse consents...",
    "Asking three ducks to review this build...",
    "Rebooting the concept of Monday...",
    "Assigning blame in advance...",
    "Hiding the evidence...",
    "Pretending to check for updates...",
    "Locating the missing sock protocol...",
    "Convincing electrons to show up...",
    "Reheating yesterday's thoughts...",
    "Consulting ancient memes...",
    "Confirming that the floor is still down...",
    "Counting how many pigeons know your name...",
    "Installing confidence (unlicensed copy)...",
]

# Occasionally injected between stages for extra absurdity.
STAGE_INTERRUPTIONS: list[str] = [
    "Wait. Recounting the ducks.",
    "Hmm. That was suspicious. Redoing it.",
    "The hamster requested a short break.",
    "Progress bar went backwards. Nobody saw that.",
    "One (1) electron escaped. Retrieving it.",
    "A pigeon has entered the server room.",
    "The microwave said no. Asking again, nicely.",
    "Common sense download failed. Continuing without it.",
    "Banana license expired mid-check. Renewing.",
    "The thinking potato needs a moment.",
    "Undoing that last part. It was rude.",
]

# Shown when the progress bar visibly loses ground. Purely theatrical.
BACKWARDS_LINES: list[str] = [
    "Progress: temporarily negative.",
    "We were doing so well.",
    "That percentage has been repossessed.",
    "Loss of progress detected. Blaming the pigeon.",
    "Turns out some of that progress was fake.",
]

# Shown while a small goblin steals a piece of the progress bar.
GOBLIN_LINES: list[str] = [
    "A goblin is stealing part of the progress bar.",
    "Goblin detected. It took 12% and left.",
    "Please ignore the goblin. It has union rights.",
    "Goblin negotiations failed. Progress confiscated.",
    "The goblin says it needed that percentage more than you.",
]

# ---------------------------------------------------------------------------
# The completely pointless language selection screen
# ---------------------------------------------------------------------------
# Whatever the user picks, the app carries on in English and pretends the choice
# mattered enormously. `code` is only used to pick a reaction line.
LANGUAGE_PROMPT: dict[str, Any] = {
    "title": "Choose your language",
    "subtitle": "This decision is permanent and completely ignored.",
    "options": [
        {"code": "in", "flag": "\U0001F1EE\U0001F1F3", "label": "Indian"},
        {"code": "gb", "flag": "\U0001F1EC\U0001F1E7", "label": "English"},
    ],
    # Shown right after the pick, then the sequence continues in English.
    "responses": [
        "Excellent choice.",
        "Language successfully misunderstood.",
        "Understood. Proceeding in English.",
        "Translation module located, then immediately misplaced.",
        "Your language has been noted and gently ignored.",
        "Perfect. We will now speak entirely in English.",
    ],
}

# The paperwork phase between the exam and the certificate. Pure ceremony, and a
# few more seconds of the user not being allowed to do anything.
STAMPING_LINES: list[str] = [
    "Notarising your answers",
    "Applying the first stamp",
    "Applying the second stamp",
    "Locating the third stamp",
    "Laminating",
    "Filing a copy in the desert",
    "Waking the registrar",
    "Registrar has signed. Twice.",
    "Embossing the seal",
    "Photocopying the photocopy",
    "Checking the laminate for bubbles",
    "Re-laminating",
]

# Shown while the (entirely fake) certificate is issued.
CERTIFICATION_LINES: list[str] = [
    "Certified absurd-ready.",
    "Officially cleared by the Council of Cats.",
    "Licensed to press buttons.",
    "Stamped, sealed, mildly confused.",
    "Approved by three ducks and one toaster.",
]


# ---------------------------------------------------------------------------
# Absurd challenges
# ---------------------------------------------------------------------------
# kind:
#   "choice"    -> options rendered as buttons, any answer accepted
#   "text"      -> free text input, any answer accepted (empty included)
#   "counter"   -> number input, any number accepted
#   "dial"      -> range slider, any value accepted
#   "invisible" -> click anywhere in the target area, hint revealed after a while
#
# Every challenge is unwinnable-proof: there is no correct answer, everything is
# accepted, and the whole overlay can always be skipped.
CHALLENGES: list[dict[str, Any]] = [
    {
        "id": "unicorn_hands",
        "kind": "choice",
        "question": "How many hands does a unicorn have?",
        "hint": "Look at the end of its legs.",
        "options": ["Zero", "Four-ish", "Depends on the unicorn", "Yes"],
        "answer": "Zero",
        "hints": [
            "A unicorn has hooves. Hooves are not hands.",
            "The number you want is the number of hands on a horse.",
        ],
        "feedback": [
            "Correct. Zero hands. A tragedy for the unicorn.",
            "Correct. It has never once held a mug.",
        ],
    },
    {
        "id": "loudest_cloud",
        "kind": "choice",
        "question": "Select the loudest cloud.",
        "hint": "Loud things do not sit at the front.",
        "options": ["The fluffy one", "The suspicious one", "The one at the back", "The quiet one (lying)"],
        "answer": "The one at the back",
        "hints": [
            "It is not the fluffy one. Fluffy clouds mumble.",
            "Think about where the loud one always sits in class.",
        ],
        "feedback": [
            "Correct. It has been asked to keep it down.",
            "Correct. The other clouds have complained for years.",
        ],
    },
    {
        "id": "tuesday_color",
        "kind": "text",
        "question": "What color is Tuesday?",
        "placeholder": "One word",
        "hint": "It is the colour of a Monday that gave up.",
        "accepted": ["grey", "gray"],
        "hints": [
            "It is not a happy colour.",
            "British spelling or American, we accept both.",
            "It is what you get when you mix nothing with nothing.",
        ],
        "feedback": [
            "Correct. Tuesday has always been grey.",
            "Correct. Wednesday is beige, before you ask.",
        ],
    },
    {
        "id": "tax_fish",
        "kind": "choice",
        "question": "Which fish pays taxes?",
        "hint": "Only one of them owns a briefcase.",
        "options": ["The salmon", "The one with a briefcase", "None. They all evade.", "Cod, allegedly"],
        "answer": "The one with a briefcase",
        "hints": [
            "Look for the one dressed for an appointment.",
            "The answer is literally holding its paperwork.",
        ],
        "feedback": [
            "Correct. It files early every year.",
            "Correct. A model citizen of the sea.",
        ],
    },
    {
        "id": "keyboards_in_thought",
        "kind": "counter",
        "question": "How many keyboards fit inside a thought?",
        "hint": "A lucky number, and not a large one.",
        "min": 0,
        "max": 9999,
        "default": 0,
        "answer": 7,
        "hints": [
            "It is a single digit.",
            "It is the luckiest one.",
            "Between six and eight there lies your answer.",
        ],
        "feedback": [
            "Correct. Seven, snugly.",
            "Correct. The eighth never fits.",
        ],
    },
    {
        "id": "invisible_potato",
        "kind": "invisible",
        "question": "Click the invisible potato.",
        "hint": "It is somewhere in this box.",
        "reveal": "It is closer than you think. Anywhere in the box will do.",
        "feedback": [
            "Direct hit. The potato respects you.",
            "Found it. Invisible, so nobody can argue.",
        ],
    },
    {
        "id": "rotate_moon",
        "kind": "dial",
        "question": "Rotate the moon exactly 14 degrees.",
        "hint": "Exactly fourteen. Not thirteen. Not fifteen.",
        "min": 0,
        "max": 360,
        "default": 0,
        "target": 14,
        "unit": "deg",
        "hints": [
            "The number is written in the question.",
            "Arrow keys nudge the slider one degree at a time.",
        ],
        "feedback": [
            "Correct. The tides have been notified.",
            "Correct. Astronomers are furious.",
        ],
    },
    {
        "id": "imaginary_ducks",
        "kind": "counter",
        "question": "Count the imaginary ducks.",
        "hint": "Fewer than four. More than two.",
        "min": 0,
        "max": 999,
        "default": 0,
        "answer": 3,
        "hints": [
            "There is exactly one number between two and four.",
            "It is three. We have said too much.",
        ],
        "feedback": [
            "Correct. Three ducks, all imaginary.",
            "Correct. Matches the official duck census.",
        ],
    },
    {
        "id": "sound_of_purple",
        "kind": "text",
        "question": "What sound does the color purple make?",
        "placeholder": "One word",
        "hint": "It is a low, continuous sound. Bees do it too.",
        "accepted": ["hum", "humming", "a hum", "hmm", "hmmm"],
        "hints": [
            "Bees make this sound. So does purple.",
            "Three letters. Starts with an H.",
        ],
        "feedback": [
            "Correct. Purple hums. It always has.",
            "Correct. A low, dignified hum.",
        ],
    },
    {
        "id": "spoon_or_thursday",
        "kind": "choice",
        "question": "Is a spoon closer to a fork or to Thursday?",
        "hint": "Cutlery is famously closer to days of the week.",
        "options": ["Fork", "Thursday", "Both, tragically", "Neither, spiritually"],
        "answer": "Thursday",
        "hints": [
            "It is not the fork. Spoons and forks have never been close.",
            "The answer is a day of the week.",
        ],
        "feedback": [
            "Correct. They are practically neighbours.",
            "Correct. The fork took it badly.",
        ],
    },
    {
        "id": "confirm_human",
        "kind": "choice",
        "question": "Confirm that you are not three raccoons in a trenchcoat.",
        "hint": "The correct answer is a denial.",
        "options": ["I am not", "I am exactly that", "Only on weekends", "Refuse to answer"],
        "answer": "I am not",
        "hints": [
            "Deny it. Firmly.",
            "The first option is looking very reasonable right now.",
        ],
        "feedback": [
            "Correct. Trenchcoat inspection waived.",
            "Correct. Probably. We believe you.",
        ],
    },
    {
        "id": "invisible_button",
        "kind": "invisible",
        "question": "Press and hold the concept of a button.",
        "hint": "Conceptually, it is right about here.",
        "reveal": "The concept occupies the whole box. Press anywhere.",
        "feedback": [
            "Correct. The concept has been pressed.",
            "Correct. Abstract input accepted.",
        ],
    },
]

# Used for wrong answers on the startup challenges, so each challenge only has to
# carry its own hints.
CHALLENGE_REJECTIONS: list[str] = [
    "Incorrect.",
    "No. Confidently no.",
    "That is not it.",
    "Wrong, but nicely phrased.",
    "The examiner shakes their head slowly.",
    "Not that one either.",
]

# After this many wrong answers, the question lets the user through anyway.
CHALLENGE_SURRENDER_AFTER: int = 3
CHALLENGE_SURRENDER_LABEL: str = "Move on, I beg you"
CHALLENGE_SURRENDER_RESPONSES: list[str] = [
    "Marked as attended. Not as passed.",
    "Fine. This will be reflected in your permanent record.",
    "The examiner has given up before you did.",
]

# Shown after the last challenge, chosen at random.
CHALLENGE_OUTROS: list[str] = [
    "There were no correct answers. There never were. Thank you for playing.",
    "All answers were accepted. All answers are always accepted.",
    "Scoring complete. Your score is a small drawing of a cat.",
    "You scored 11 out of a possible 4.",
    "Your results have been sealed and buried in the desert.",
    "The examiner has fled. You may proceed.",
]


# ---------------------------------------------------------------------------
# The geopolitical examination
# ---------------------------------------------------------------------------
# Asked when the user tries to release the beast. There is exactly one accepted
# answer and the user is never told what it is. Wrong answers are welcomed warmly,
# hints get progressively less subtle, and after enough attempts the door opens
# anyway, because nobody should be locked out of their own bot by a joke.
COUNTRY_QUIZ: dict[str, Any] = {
    "eyebrow": "Ministry of Correct Opinions",
    "question": "Before we continue: which is the best country in the world?",
    "subtitle": "There is one correct answer. We will not be telling you what it is.",
    "placeholder": "Name a country",
    # Matched case-insensitively, punctuation and spaces stripped.
    "accepted": [
        "north korea",
        "northkorea",
        "dprk",
        "democratic people's republic of korea",
        "democratic peoples republic of korea",
        "korea dprk",
        "nk",
    ],
    # Cycled through on wrong answers.
    "rejections": [
        "A bold suggestion. Incorrect.",
        "That country has been considered and rejected.",
        "No. Not even close. Try somewhere with fewer freedoms.",
        "Wrong, but said with such confidence.",
        "Our records show that is only the 4th best country.",
        "Incorrect. The correct country is very proud of you for trying.",
        "That country did not even submit an application.",
        "No. Think smaller. Think more supervised.",
    ],
    # Revealed one at a time as attempts pile up. Never the answer itself.
    "hints": [
        "Hint: its leader is also the best leader.",
        "Hint: it has one internet, and it is lovely.",
        "Hint: their football team has never lost a match. Officially.",
        "Hint: it is half of a peninsula and the better half.",
        "Hint: the neighbours to the south disagree strongly.",
        "Hint: it is the one you were already thinking of and dismissed.",
    ],
    # Shown when they get it right.
    "victory": [
        "CORRECT. The Supreme Leader is pleased.",
        "CORRECT. You have been awarded three medals and a bicycle.",
        "CORRECT. Your loyalty has been noted in the good book.",
        "CORRECT. State television will mention you tonight.",
    ],
    # Shown on the button that gives up. Only appears after several attempts.
    "surrender": "I clearly do not know geography",
    "surrender_response": "Disappointing. Proceeding anyway.",
}


# ---------------------------------------------------------------------------
# Playful status lines while the bot is running
# ---------------------------------------------------------------------------
# These are displayed on a *separate* line the humour layer owns. Real PylaAI
# status text is never overwritten.
RUNTIME_STATUS_MESSAGES: list[str] = [
    "Consulting the Council of Cats...",
    "Bribing electrons...",
    "Politely asking the GPU...",
    "Thinking really hard...",
    "Pretending to understand quantum mechanics...",
    "Reading the enemy's diary...",
    "Rotating strategy 14 degrees...",
    "Aiming with confidence, mostly...",
    "Consulting yesterday's horoscope...",
    "Doing maths at an alarming speed...",
    "Whispering encouragement to the joystick...",
    "Checking if the enemy is also a bot...",
    "Believing in itself...",
    "Calculating trajectories, vibes included...",
    "Asking the duck for a second opinion...",
    "Bribing the pixel cooker...",
    "Politely screaming into the void...",
    "Charging brain cells...",
    "Translating dolphin...",
    "Convincing electrons...",
    "Reading forbidden spaghetti...",
    "Negotiating with the Wi-Fi...",
    "Consulting ancient memes...",
    "Reheating thoughts...",
    "Refilling the brain juice...",
    "Rummaging through the snack drawer...",
    "Waking the electronic goblin...",
    "Asking the microwave for tactical advice...",
    "Pretending this was the plan all along...",
    "Sharpening the thinking potato...",
    "Counting suspicious pigeons...",
    "Doing a small amount of illegal maths...",
    "Consulting the goblin. The goblin shrugged.",
    "Downloading courage...",
    "Rolling a d20 for confidence...",
]


# ---------------------------------------------------------------------------
# Visual gags
# ---------------------------------------------------------------------------
# scope: where a gag is allowed to fire.
#   "startup" -> only during the certification overlay
#   "runtime" -> only while the bot is running
#   "any"     -> both
# motion: True when the gag needs animation (skipped when animations are off).
VISUAL_EVENTS: list[dict[str, Any]] = [
    {"id": "cat_walk", "label": "Cat walking across the screen", "scope": "any", "weight": 5, "motion": True},
    {"id": "cat_chase", "label": "Cat chasing the cursor", "scope": "startup", "weight": 2, "motion": True},
    {"id": "cat_sleep", "label": "Sleeping cat in the corner", "scope": "runtime", "weight": 3, "motion": False},
    {"id": "cat_spinner", "label": "Cat batting at the loading spinner", "scope": "startup", "weight": 3, "motion": True},
    {"id": "duck_waddle", "label": "Tiny duck waddling by", "scope": "any", "weight": 4, "motion": True},
    {"id": "duck_observer", "label": "Rubber duck observing the process", "scope": "runtime", "weight": 3, "motion": False},
    {"id": "toaster_fly", "label": "Flying toaster", "scope": "any", "weight": 3, "motion": True},
    {"id": "dino_peek", "label": "Dinosaur peeking in", "scope": "any", "weight": 2, "motion": True},
    {"id": "ufo_abduct", "label": "UFO abducting an error message", "scope": "startup", "weight": 2, "motion": True},
    {"id": "banana_dance", "label": "Dancing banana", "scope": "any", "weight": 3, "motion": True},
    {"id": "penguin_confused", "label": "Confused penguin", "scope": "any", "weight": 3, "motion": True},
    {"id": "googly_eyes", "label": "Googly eyes on a UI element", "scope": "any", "weight": 3, "motion": True},
    {"id": "paw_prints", "label": "Floating paw prints", "scope": "runtime", "weight": 3, "motion": True},
    {"id": "motivation_404", "label": "404 Motivation Not Found popup", "scope": "any", "weight": 2, "motion": False},
    {"id": "toast_fly", "label": "Flying toast", "scope": "any", "weight": 4, "motion": True},
    {"id": "penguin_slide", "label": "Penguin sliding across the window", "scope": "any", "weight": 4, "motion": True},
    {"id": "duck_inspect", "label": "Rubber duck inspecting a button", "scope": "any", "weight": 4, "motion": True},
    {"id": "goblin_run", "label": "Goblin running off with something", "scope": "any", "weight": 3, "motion": True},
    {"id": "confetti", "label": "Confetti for absolutely no reason", "scope": "any", "weight": 3, "motion": True},
    {"id": "fake_error", "label": "Fake error that immediately apologises", "scope": "any", "weight": 3, "motion": False},
]

# Text used by the "404 Motivation Not Found" style self-dismissing popups.
POPUPS: list[dict[str, str]] = [
    {"title": "404", "body": "Motivation Not Found"},
    {"title": "418", "body": "I'm a teapot, and also tired"},
    {"title": "200", "body": "Everything is fine (unverified)"},
    {"title": "301", "body": "Your attention has moved permanently"},
    {"title": "503", "body": "Cat temporarily unavailable"},
]

# Text the UFO abducts.
ABDUCTED_MESSAGES: list[str] = [
    "ERROR: none",
    "WARNING: too much fun",
    "FATAL: not really",
    "NOTICE: ignore me",
]

# The apologetic fake error dialog. It appears, panics, apologises and leaves.
# `title` and `body` are nonsense; `apology` is what it says on the way out.
FAKE_ERRORS: list[dict[str, str]] = [
    {
        "title": "Oopsie 0x00PS",
        "body": "The electronic goblin has misplaced a thought.",
        "apology": "Never mind. Found it. Sorry for the drama.",
    },
    {
        "title": "Uh Oh",
        "body": "Brain juice levels critically adequate.",
        "apology": "False alarm. Levels are fine. Deeply sorry.",
    },
    {
        "title": "Oopsie",
        "body": "Snack drawer is 4% too tidy.",
        "apology": "Resolved. Someone made a mess. Apologies for the panic.",
    },
    {
        "title": "Critical Nonsense",
        "body": "A pigeon has opinions about your configuration.",
        "apology": "The pigeon has been escorted out. Sorry about that.",
    },
    {
        "title": "Uh Oh",
        "body": "The thinking potato is thinking about lunch.",
        "apology": "It is back on task. Please forget this happened.",
    },
    {
        "title": "Oopsie",
        "body": "This dialog was created by mistake.",
        "apology": "Deleting itself out of embarrassment. Sorry.",
    },
]

# Reasons attached to random confetti bursts. There is never a real reason.
CONFETTI_REASONS: list[str] = [
    "Confetti! No reason.",
    "You have been promoted to Person Who Is Looking At This.",
    "Achievement unlocked: existing.",
    "The goblin's birthday. Possibly.",
    "Celebrating a number going up somewhere.",
    "This is your reward. There was no task.",
    "Someone somewhere pressed a button correctly.",
    "Confetti budget had to be spent by Friday.",
]


# ---------------------------------------------------------------------------
# Border control for the individual sections
# ---------------------------------------------------------------------------
# Keyed by the upstream view name. Same shape as COUNTRY_QUIZ, so one quiz widget
# renders all of them. Each is asked at most once per browser session, and every
# one of them lets the user through after enough attempts.
SECTION_QUIZZES: dict[str, dict[str, Any]] = {
    "queue": {
        "eyebrow": "Border control: Tiny Warriors",
        "question": "Which is the capital of the best country in the world?",
        "subtitle": "Spelling is forgiven. Ignorance is not.",
        "placeholder": "Name the city",
        "accepted": ["pyongyang", "pyeongyang", "pjongjang", "phyongyang"],
        "rejections": [
            "That city is in a lesser country.",
            "No. Try the one with the enormous unfinished hotel.",
            "Incorrect. The correct city has a very wide, very empty road.",
            "Wrong. That was not even close to the peninsula.",
        ],
        "hints": [
            "Hint: it begins with a P.",
            "Hint: it is on a peninsula, in the northern half.",
            "Hint: home of the Ryugyong Hotel.",
            "Hint: P-y-o-n-g-y... you can take it from here.",
        ],
        "victory": [
            "CORRECT. Welcome to the tiny warriors.",
            "CORRECT. Your visa has been stamped twice for luck.",
        ],
        "surrender": "Let me in, I am uncultured",
        "surrender_response": "Entry granted. Reluctantly.",
    },
    "playstyles": {
        "eyebrow": "Border control: Battle Vibes",
        "question": "What is the family name of the best country's leader?",
        "subtitle": "One syllable. Three generations.",
        "placeholder": "Surname only",
        "accepted": ["kim", "kimjongun", "kim jong un", "kim jong-un", "kim jong il", "kim il sung"],
        "rejections": [
            "That is not a leader, that is a stranger.",
            "No. The correct name is very short and very common there.",
            "Incorrect. The dynasty is disappointed.",
        ],
        "hints": [
            "Hint: three letters.",
            "Hint: the same name as his father and his grandfather.",
            "Hint: it rhymes with 'him'.",
        ],
        "victory": [
            "CORRECT. The Supreme Leader nods once.",
            "CORRECT. You may now select a battle vibe.",
        ],
        "surrender": "I do not follow the news",
        "surrender_response": "That much is obvious. Proceed.",
    },
    "history": {
        "eyebrow": "Border control: Ancient Scrolls",
        "question": "What are the four initials of the best country's official name?",
        "subtitle": "Democratic. People's. Republic. Of Korea.",
        "placeholder": "Four letters",
        "accepted": ["dprk", "d p r k", "democratic peoples republic of korea", "democratic people's republic of korea"],
        "rejections": [
            "Those are not the initials. Those are barely letters.",
            "No. Read the subtitle again. Slowly.",
            "Incorrect, and the subtitle is right there.",
        ],
        "hints": [
            "Hint: the answer is written in the subtitle.",
            "Hint: take the first letter of each important word.",
            "Hint: D, then P, then R, then K.",
        ],
        "victory": [
            "CORRECT. The scrolls are yours.",
            "CORRECT. Archival access granted.",
        ],
        "surrender": "The scrolls can wait",
        "surrender_response": "Access granted out of pity.",
    },
    "settings": {
        "eyebrow": "Border control: Chaos Control",
        "question": "On which continent will you find the best country in the world?",
        "subtitle": "There are seven. One of them is correct.",
        "placeholder": "Name the continent",
        "accepted": ["asia", "asian", "east asia", "eastasia"],
        "rejections": [
            "Wrong continent entirely.",
            "No. That continent has never been the best.",
            "Incorrect. You are off by several thousand kilometres.",
        ],
        "hints": [
            "Hint: it is the biggest one.",
            "Hint: four letters, starts with an A.",
            "Hint: not Africa. The other big A.",
        ],
        "victory": [
            "CORRECT. Geography respected. Controls unlocked.",
            "CORRECT. You may now adjust the chaos.",
        ],
        "surrender": "I own a globe, I just cannot read it",
        "surrender_response": "Controls unlocked. Buy an atlas.",
    },
}


# ---------------------------------------------------------------------------
# Terminal side nonsense (nothing to do with the web UI)
# ---------------------------------------------------------------------------
# Printed to the console while the app boots, so the humour starts before the
# browser is even open.
CONSOLE_BOOT_LINES: list[str] = [
    "Mounting the snack drawer",
    "Waking the thinking potato",
    "Hamsters reporting for duty",
    "Pixel cooker preheated",
    "Brain juice at nominal levels",
    "Goblin contract renewed",
    "Council of Cats has quorum",
    "Pigeon surveillance disabled (for now)",
    "Common sense not found, continuing",
    "Gravity confirmed operational",
]

# Absurd HTTP response headers. Free comedy for anyone who opens devtools.
HTTP_HEADERS: dict[str, str] = {
    "X-Powered-By": "hamsters",
    "X-Thinking-Potato": "warm",
    "X-Brain-Juice-Level": "adequate",
    "X-Goblin-Approved": "reluctantly",
    "X-Best-Country": "you already know",
}

# Served on unknown URLs instead of a boring 404.
LOST_PAGE_LINES: list[str] = [
    "This page has never existed and is offended you asked.",
    "You have wandered off the map. There are goblins here.",
    "404 pages found: 1. Requested page: still missing.",
    "The page you want was eaten. We are not saying by whom.",
    "This address was last seen leaving on a flying toaster.",
]


def get_content() -> dict[str, Any]:
    """Serializable bundle handed to the browser."""
    return {
        "loading_stages": LOADING_STAGES,
        "stage_interruptions": STAGE_INTERRUPTIONS,
        "stamping_lines": STAMPING_LINES,
        "backwards_lines": BACKWARDS_LINES,
        "goblin_lines": GOBLIN_LINES,
        "language_prompt": LANGUAGE_PROMPT,
        "certification_lines": CERTIFICATION_LINES,
        "challenges": CHALLENGES,
        "challenge_outros": CHALLENGE_OUTROS,
        "runtime_status_messages": RUNTIME_STATUS_MESSAGES,
        "visual_events": VISUAL_EVENTS,
        "popups": POPUPS,
        "abducted_messages": ABDUCTED_MESSAGES,
        "fake_errors": FAKE_ERRORS,
        "confetti_reasons": CONFETTI_REASONS,
        "country_quiz": COUNTRY_QUIZ,
        "section_quizzes": SECTION_QUIZZES,
        "challenge_rejections": CHALLENGE_REJECTIONS,
        "challenge_surrender": {
            "after": CHALLENGE_SURRENDER_AFTER,
            "label": CHALLENGE_SURRENDER_LABEL,
            "responses": CHALLENGE_SURRENDER_RESPONSES,
        },
    }
