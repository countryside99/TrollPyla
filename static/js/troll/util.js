/** Tiny shared helpers for the TrollPyla humour layer. */

export const randomInt = (low, high) => low + Math.floor(Math.random() * (high - low + 1));

export const randomFloat = (low, high) => low + Math.random() * (high - low);

export const pick = (list) => (list && list.length ? list[Math.floor(Math.random() * list.length)] : undefined);

/** Fisher-Yates, returns up to `count` distinct entries. */
export function sample(list, count) {
    const pool = Array.isArray(list) ? [...list] : [];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.max(0, count));
}

/** Weighted pick over `[{weight}]` entries. Falls back to uniform. */
export function weightedPick(entries) {
    const list = (entries || []).filter(Boolean);
    if (!list.length) return undefined;
    const total = list.reduce((sum, entry) => sum + (Number(entry.weight) || 1), 0);
    let roll = Math.random() * total;
    for (const entry of list) {
        roll -= Number(entry.weight) || 1;
        if (roll <= 0) return entry;
    }
    return list[list.length - 1];
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/**
 * Managed timers so the whole humour layer can be torn down in one call.
 * Prevents leaked intervals when the user disables humour at runtime.
 */
export class TimerBag {
    constructor() {
        this.timeouts = new Set();
        this.intervals = new Set();
    }

    setTimeout(fn, ms) {
        const id = window.setTimeout(() => {
            this.timeouts.delete(id);
            fn();
        }, ms);
        this.timeouts.add(id);
        return id;
    }

    setInterval(fn, ms) {
        const id = window.setInterval(fn, ms);
        this.intervals.add(id);
        return id;
    }

    clearAll() {
        this.timeouts.forEach((id) => window.clearTimeout(id));
        this.intervals.forEach((id) => window.clearInterval(id));
        this.timeouts.clear();
        this.intervals.clear();
    }
}
