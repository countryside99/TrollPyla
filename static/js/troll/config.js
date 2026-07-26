/**
 * TrollPyla - client side configuration access.
 *
 * Talks to the `/api/troll` blueprint. If that blueprint is missing (for example
 * when the humour package has been deleted to get vanilla PylaAI back) every
 * call resolves to a disabled configuration, so the UI simply behaves like
 * upstream instead of erroring.
 */

const ENDPOINT = "/api/troll/config";
const RESET_ENDPOINT = "/api/troll/config/reset";
const CACHE_KEY = "trollpyla.preshow";

/** Mirrors troll/config.py TROLL_FIELDS defaults, with humour off as fail-safe. */
export const FALLBACK = {
    config: {
        enabled: false,
        intensity: "normal",
        startup_sequence: false,
        startup_challenges: false,
        language_prompt: false,
        country_quiz: false,
        section_quizzes: false,
        console_nonsense: false,
        random_events: false,
        runtime_gags: false,
        funny_status_messages: false,
        rename_ui: false,
        fake_errors: false,
        confetti: false,
        animations: true,
        challenge_count: 2,
        skip_delay_seconds: 4,
        max_startup_seconds: 30,
        replay_every_launch: true,
    },
    preset: {
        label: "Normal",
        startup_stages: 5,
        startup_event_interval_ms: 4000,
        runtime_event_interval_ms: 75000,
        runtime_event_chance: 0.5,
        stage_duration_ms: [240, 560],
        stage_mischief_chance: 0.34,
        resolved_challenge_count: 2,
    },
    presets: {},
    intensities: ["calm", "normal", "chaotic"],
    content: {
        loading_stages: [],
        stage_interruptions: [],
        stamping_lines: [],
        backwards_lines: [],
        goblin_lines: [],
        language_prompt: null,
        certification_lines: [],
        challenges: [],
        challenge_outros: [],
        runtime_status_messages: [],
        visual_events: [],
        popups: [],
        abducted_messages: [],
        fake_errors: [],
        confetti_reasons: [],
        country_quiz: null,
        section_quizzes: {},
        challenge_rejections: [],
        challenge_surrender: null,
    },
    lexicon: {
        renames: {},
        phrases: {},
        brand_taglines: [],
    },
};

let snapshot = null;
const listeners = new Set();

/** Last known settings bundle (never null after `load()` resolves). */
export function current() {
    return snapshot || FALLBACK;
}

export function config() {
    return current().config;
}

export function preset() {
    return current().preset;
}

export function content() {
    return current().content;
}

export function lexicon() {
    return current().lexicon;
}

/**
 * Cheap synchronous guess (cached from the previous run) used before the first
 * fetch resolves, so the startup overlay can appear instantly instead of flashing
 * in after a round trip. Users who disabled the startup sequence never see it.
 */
export function probablyEnabled() {
    try {
        const cached = window.localStorage.getItem(CACHE_KEY);
        return cached === null ? true : cached === "1";
    } catch {
        return true;
    }
}

export function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function load() {
    return request(ENDPOINT, { method: "GET" });
}

export async function save(patch) {
    return request(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch || {}),
    });
}

export async function reset() {
    return request(RESET_ENDPOINT, { method: "POST" });
}

async function request(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload || payload.ok === false) throw new Error(payload?.message || "troll config rejected");
        apply(payload);
        return snapshot;
    } catch (error) {
        console.debug("[troll] humour config unavailable, staying out of the way:", error.message);
        snapshot = snapshot || FALLBACK;
        cachePreshow(snapshot.config);
        notify();
        return snapshot;
    }
}

function apply(payload) {
    snapshot = {
        config: { ...FALLBACK.config, ...(payload.config || {}) },
        preset: { ...FALLBACK.preset, ...(payload.preset || {}) },
        presets: payload.presets || {},
        intensities: payload.intensities || FALLBACK.intensities,
        content: { ...FALLBACK.content, ...(payload.content || {}) },
        lexicon: { ...FALLBACK.lexicon, ...(payload.lexicon || {}) },
    };
    cachePreshow(snapshot.config);
    notify();
}

function cachePreshow(settings) {
    const preshow = Boolean(settings.enabled && settings.startup_sequence);
    try {
        window.localStorage.setItem(CACHE_KEY, preshow ? "1" : "0");
    } catch {
        /* private browsing - ignore */
    }
}

function notify() {
    listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.warn("[troll] config listener failed", error);
        }
    });
}
