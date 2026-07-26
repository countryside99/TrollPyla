/**
 * TrollPyla - border control.
 *
 * Two gates, one mechanic (`quiz.js`):
 *
 *   1. Release The Beast asks which is the best country in the world.
 *   2. Each section (Tiny Warriors, Battle Vibes, Ancient Scrolls, Chaos Control)
 *      asks its own question about that same country.
 *
 * Both intercept the click in the capture phase, so the upstream handler never
 * fires until the exam is settled, then replay the original action. Each gate is
 * asked at most once per browser session.
 *
 * The Start gate also re-checks the real precondition: with an empty queue the bot
 * cannot start, exam or no exam, and the user is told so instead of being quizzed.
 */

import { config, content } from "./config.js";
import { toast, upstreamState } from "./hooks.js";
import { askQuiz, quizOpen } from "./quiz.js";

const START_SELECTOR = "#startRuntimeBtn, #resumeRuntimeBtn";
const START_KEY = "trollpyla.geography";
const SECTION_KEY_PREFIX = "trollpyla.border.";

/** Dashboard shortcuts that jump to a view without a [data-view] attribute. */
const SHORTCUT_VIEWS = {
    goToBrawlersBtn: "queue",
    browsePlaystylesBtn: "playstyles",
};

const EMPTY_QUEUE_LINES = [
    "The Line Of Doom is empty. Recruit a tiny warrior first.",
    "No tiny warriors enlisted. The beast refuses to leave its cage.",
    "You cannot release the beast with nobody to fight. Pick a brawler.",
];

let installed = false;
let onConfetti = null;

export function installStartGate(confettiCallback) {
    onConfetti = confettiCallback || null;
    if (installed) return;
    installed = true;
    document.addEventListener("click", intercept, true);
}

/** Ask every gate again (used by "Replay the certification"). */
export function forgetGate() {
    try {
        window.sessionStorage.removeItem(START_KEY);
        Object.keys(content().section_quizzes || {}).forEach((view) => {
            window.sessionStorage.removeItem(SECTION_KEY_PREFIX + view);
        });
    } catch {
        /* ignore */
    }
}

function cleared(key) {
    try {
        return window.sessionStorage.getItem(key) === "1";
    } catch {
        return false;
    }
}

function markCleared(key) {
    try {
        window.sessionStorage.setItem(key, "1");
    } catch {
        /* ignore */
    }
}

// ------------------------------------------------------------------ dispatch

function intercept(event) {
    const settings = config();
    if (!settings.enabled || quizOpen()) return;

    const startButton = event.target.closest?.(START_SELECTOR);
    if (startButton) {
        handleStart(event, startButton, settings);
        return;
    }

    if (!settings.section_quizzes) return;

    const navButton = event.target.closest?.("[data-view]");
    const shortcut = event.target.closest?.("#goToBrawlersBtn, #browsePlaystylesBtn");
    const view = navButton?.dataset.view || (shortcut ? SHORTCUT_VIEWS[shortcut.id] : null);
    if (view) handleSection(event, view);
}

// --------------------------------------------------------------- start gate

function handleStart(event, button, settings) {
    // Upstream disables the button when it cannot start. Respect that first.
    if (button.classList.contains("is-disabled")) return;

    // And re-check the real rule, so the exam can never smuggle an empty queue
    // past the runtime.
    if (button.id === "startRuntimeBtn" && queueIsEmpty()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toast(EMPTY_QUEUE_LINES[Math.floor(Math.random() * EMPTY_QUEUE_LINES.length)], "error");
        return;
    }

    if (!settings.country_quiz || cleared(START_KEY)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    runGate(content().country_quiz, START_KEY, (outcome) => {
        if (outcome === "correct") document.documentElement.classList.add("troll-patriot");
        // Bail out if the queue emptied while the exam was open.
        if (queueIsEmpty()) {
            toast(EMPTY_QUEUE_LINES[0], "error");
            return;
        }
        replay(() => document.getElementById(button.id)?.click());
    });
}

function queueIsEmpty() {
    const queue = upstreamState()?.bootstrap?.queue;
    // Unknown queue state is treated as fine: never block on missing information.
    return Array.isArray(queue) && queue.length === 0;
}

// ------------------------------------------------------------- section gates

function handleSection(event, view) {
    const quiz = (content().section_quizzes || {})[view];
    const key = SECTION_KEY_PREFIX + view;
    if (!quiz || cleared(key)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    runGate(quiz, key, () => {
        replay(() => window.setView?.(view));
    });
}

// ------------------------------------------------------------------ plumbing

function runGate(quiz, key, done) {
    askQuiz(quiz, { onCorrect: () => onConfetti?.() })
        .then((outcome) => {
            markCleared(key);
            done(outcome);
        })
        .catch((error) => {
            // A broken joke must never cost the user the click they made.
            console.warn("[troll] gate failed, letting the user through", error);
            markCleared(key);
            done("surrender");
        });
}

function replay(action) {
    window.setTimeout(() => {
        try {
            action();
        } catch (error) {
            console.warn("[troll] could not replay the original action", error);
        }
    }, 60);
}
