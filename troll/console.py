"""
Terminal side of TrollPyla.

The web UI is not the only place worth ruining. This module handles everything the
user sees in the console: the launch banner, the fake boot report, and the silly
log lines that replace the usual startup chatter.

It only ever prints. Nothing here touches the bot, the config or the network.
"""

from __future__ import annotations

import random
import sys

from utils import cprint

from .config import get_config
from .content import CONSOLE_BOOT_LINES

# Little friends who introduce the app. One is picked at random per launch.
MASCOTS = [
    [r"   /\_/\  ", r"  ( o.o ) ", r"   > ^ <  "],
    [r"   ,_,    ", r"  (o,o)   ", r"  /)_)    ", r"   ' '    "],
    [r"   \(o)<  ", r"    \_/   ", r"    | |   "],
    [r"   (o_o)  ", r"  <( . )> ", r"   /   \  "],
]

WORDMARK = [
    "  T R O L L P Y L A",
    "  -------------------",
]

TAGLINES = [
    "hamster powered, goblin approved",
    "now with 30% more ducks",
    "the thinking potato is warm",
    "certified by nobody in particular",
    "runs on vibes and electricity",
    "brain juice: adequate",
]

# TrollPyla red, matching the UI accent, and a warm goblin green.
_RED = "#ff2a44"
_GREEN = "#7fc45a"
_DIM = "#5e6473"


def _supports_output() -> bool:
    return bool(getattr(sys, "stdout", None))


def print_banner() -> None:
    """A small friend, a wordmark and a random tagline."""
    if not _supports_output():
        return

    mascot = random.choice(MASCOTS)
    print()
    for index, art in enumerate(mascot):
        suffix = WORDMARK[index] if index < len(WORDMARK) else ""
        cprint(f"{art}{suffix}", _RED)
    cprint(f"   {random.choice(TAGLINES)}", _DIM)
    print()


def print_boot_report(lines: int = 5) -> None:
    """A short, entirely fictional systems check."""
    if not _supports_output():
        return
    for line in random.sample(CONSOLE_BOOT_LINES, min(lines, len(CONSOLE_BOOT_LINES))):
        cprint(f"   [ ok ] {line}", _GREEN)
    cprint("   [ ok ] all systems nominal, none of them checked", _GREEN)


def announce(url: str) -> None:
    """
    Replaces the usual 'starting web UI at ...' line with something worse.
    Falls back to the plain line when the humour layer is off, because the user
    still needs the address.
    """
    if not _supports_output():
        return
    if not _humour_on():
        print(f"Starting web UI at {url}")
        return
    cprint(f"   the control bunker is open at {url}", _RED)
    cprint("   press the big button when you feel brave", _DIM)


def _humour_on() -> bool:
    try:
        settings = get_config()
        return bool(settings.get("enabled") and settings.get("console_nonsense"))
    except Exception:
        return False


def greet() -> None:
    """Full console routine, called once from main.py."""
    try:
        if not _humour_on():
            print("Starting TrollPyla, a PylaAI fork")
            return
        print_banner()
        print_boot_report()
    except Exception:
        # A joke is never worth a failed launch.
        pass
