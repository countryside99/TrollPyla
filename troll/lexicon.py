"""
The TrollPyla lexicon: every serious word in the UI and its far less serious
replacement.

This is pure data. The browser side (``static/js/troll/lexicon.js``) walks the
rendered DOM and swaps these phrases in after each upstream render, which means
the entire interface can be renamed without touching a single line of
``static/js/app.js``.

Rules for adding entries
------------------------
* Keep the replacement *understandable*. "Chaos Control" still reads as settings.
* Longer phrases win over shorter ones (the client sorts by length), so
  ``"Trophy Target"`` is safe to add even though ``"Target"`` also exists.
* Matching is word-boundary and case-insensitive, and the client restores the
  original capitalisation style, so only write entries in Title Case.
* Never rename anything the bot logic parses. The client only rewrites visible
  text and a few descriptive attributes, never input values, so this is mostly a
  matter of taste rather than safety.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Phrase renames, applied to visible text and descriptive attributes.
# ---------------------------------------------------------------------------
RENAMES: dict[str, str] = {
    # --- navigation and page furniture ---------------------------------------
    "Dashboard": "Command Bunker",
    "Settings": "Chaos Control",
    "Configuration": "Forbidden Knowledge",
    "Preferences": "Personal Superstitions",
    "Brawlers": "Tiny Warriors",
    "Playstyles": "Battle Vibes",
    "Playstyle": "Battle Vibe",
    "History": "Ancient Scrolls",
    "Match History": "Scrolls Of Past Violence",
    "Library": "Hoard",
    "Community": "The Gathering",
    "Integrations": "Suspicious Alliances",
    "Diagnostics": "Vibe Check",
    "Behavior": "Personality Disorder",
    "Timers": "Time Wizardry",
    "General": "Miscellaneous Sorcery",
    "Runtime": "Beast Status",
    "Overview": "The Big Picture (Blurry)",

    # --- actions -------------------------------------------------------------
    "Start": "Release The Beast",
    "Stop": "Contain The Beast",
    "Pause": "Freeze The Beast",
    "Resume": "Unfreeze The Beast",
    "Save": "Preserve The Chaos",
    "Submit": "Fling It",
    "Cancel": "Abandon Ship",
    "Exit": "Escape While You Can",
    "Close": "Slam Shut",
    "Delete": "Yeet Into The Void",
    "Remove": "Yeet",
    "Clear": "Vaporize",
    "Reset": "Undo My Mistakes",
    "Import": "Smuggle In",
    "Export": "Smuggle Out",
    "Browse": "Rummage",
    "Search": "Squint At",
    "Refresh": "Poke Again",
    "Update": "Meddle With",
    "Apply": "Make It So",
    "Confirm": "Swear An Oath",
    "Retry": "Try Again, Coward",
    "Login": "Prove Yourself",
    "Log In": "Prove Yourself",
    "Logout": "Flee",
    "Unlock": "Pick The Lock",
    "Enable": "Unleash",
    "Disable": "Muzzle",
    "Download": "Yoink",
    "Upload": "Launch Skyward",

    # --- states and messages -------------------------------------------------
    "Loading": "Waking The Hamsters",
    "Processing": "Cooking Thoughts",
    "Initializing": "Summoning Brain Cells",
    "Initialising": "Summoning Brain Cells",
    "Idle": "Aggressively Doing Nothing",
    "Running": "Beast Loose",
    "Pausing": "Slowing The Beast",
    "Paused": "Beast Napping",
    "Stopping": "Wrestling The Beast",
    "Error": "Oopsie",
    "Errors": "Oopsies",
    "Failed": "Went Sideways",
    "Failure": "Spectacular Oopsie",
    "Warning": "Uh Oh",
    "Success": "Certified Wizardry",
    "Successful": "Certified Wizardry",
    "Complete": "Gloriously Finished",
    "Completed": "Gloriously Finished",
    "Pending": "Procrastinating",
    "Connected": "Holding Hands",
    "Disconnected": "Ghosted",
    "Offline": "Hiding",
    "Online": "Suspiciously Awake",
    "Unavailable": "Off Buying Snacks",
    "Invalid": "Deeply Wrong",
    "Required": "Non-Negotiable",
    "Authenticated": "Vouched For",
    "Authentication": "Bouncer Check",
    "Local Mode": "Basement Mode",
    "Login Required": "Bouncer Says No",

    # --- machinery -----------------------------------------------------------
    "AI Model": "Electronic Goblin",
    "Model": "Electronic Goblin",
    "Models": "Electronic Goblins",
    "Memory": "Brain Juice",
    "Cache": "Snack Drawer",
    "GPU": "Pixel Cooker",
    "CPU": "Thinking Potato",
    "Threads": "Thinking Potato Slices",
    "Thread Count": "Potato Slice Count",
    "Logs": "Ancient Scrolls",
    "Console": "Secret Laboratory",
    "Terminal": "Secret Laboratory",
    "Debug": "Gremlin Hunting",
    "Debugging": "Gremlin Hunting",
    "Verbose Debug": "Extremely Loud Gremlin Hunting",
    "Performance": "Zoominess",
    "Latency": "Sluggishness",
    "Detection": "Squinting",
    "Confidence": "Self-Esteem",
    "Emulator": "Fake Phone",
    "Package Name": "Secret Identity",
    "Webhook": "Carrier Pigeon",
    "Notification": "Pigeon Delivery",
    "Notifications": "Pigeon Deliveries",
    "API Key": "Magic Password",
    "Version": "Vintage",
    "Queue": "Line Of Doom",
    "Statistics": "Numbers Nobody Reads",
    "Stats": "Numbers Nobody Reads",
    "Target": "Dream",
    "Trophy Target": "Trophy Dream",
    "Threshold": "Line In The Sand",
    "Advanced": "Reckless",
    "Automatically": "Without Asking",
    "Manual": "Hand-Crafted, Artisanal",
    "Wins": "Glorious Victories",
    "Losses": "Learning Experiences",
    "Win Rate": "Glory Percentage",
    "Loss Rate": "Humility Percentage",
    "Win Streak": "Unstoppable Rampage",
}


# ---------------------------------------------------------------------------
# Whole-string replacements, used when an element's entire text matches.
# Applied before RENAMES so a full sentence can be swapped wholesale.
# ---------------------------------------------------------------------------
PHRASES: dict[str, str] = {
    "Queue is ready. Start PylaAI from here.":
        "The Line Of Doom is loaded. Release the beast whenever you feel brave.",
    "Add at least one brawler to the queue before starting.":
        "The Line Of Doom is tragically empty. Feed it at least one tiny warrior.",
    "No brawlers queued yet.":
        "Zero tiny warriors. The goblin is disappointed in you.",
    "Build a queue from the Brawlers tab to see it here.":
        "Recruit some tiny warriors and they shall appear in this sacred box.",
    "Choose a brawler to configure it.":
        "Pick a tiny warrior so we may meddle with its destiny.",
    "No playstyle selected": "No battle vibe detected",
    "Universal": "Works On Everything (Allegedly)",
    "No description provided.": "The author refused to explain themselves.",
    "No metadata": "Suspiciously undocumented",
    "Unknown": "Nobody Knows",
    "Preparing local session...": "Bribing the local hamsters...",
}


# ---------------------------------------------------------------------------
# Extra sillification for the app's own name in a few chrome slots.
# ---------------------------------------------------------------------------
BRAND_TAGLINES: list[str] = [
    "Certified nonsense",
    "Powered by hamsters",
    "Thinking potato inside",
    "Goblin approved",
    "Now with 30% more ducks",
    "Legally distinct from sanity",
    "Runs on vibes and electricity",
]


def get_lexicon() -> dict[str, object]:
    """Serializable bundle handed to the browser."""
    return {
        "renames": RENAMES,
        "phrases": PHRASES,
        "brand_taglines": BRAND_TAGLINES,
    }
