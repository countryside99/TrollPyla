/**
 * TrollPyla - soft hooks into the upstream PylaAI frontend.
 *
 * `static/js/app.js` is a classic script whose top level `function` declarations
 * therefore live on `window`. Wrapping those globals lets the humour layer react
 * to upstream re-renders without editing a single line of app.js, which keeps
 * merges with upstream PylaAI trivial.
 *
 * Every hook is defensive: if upstream renames or removes a function the wrapper
 * silently becomes a no-op instead of breaking the UI.
 */

const wrapped = new Set();

/**
 * Run `callback()` after the upstream global `name` finishes.
 * @param {string} name  Global function name, e.g. "renderSettings".
 * @param {Function} callback  Called with the same arguments as the original.
 * @returns {boolean} true when the hook was installed.
 */
export function afterGlobal(name, callback) {
    const original = window[name];
    if (typeof original !== "function") {
        console.debug(`[troll] upstream global "${name}" not found - hook skipped`);
        return false;
    }
    if (wrapped.has(name)) {
        // Already wrapped once; chain onto the current wrapper instead.
        const current = window[name];
        window[name] = function trollChained(...args) {
            const result = current.apply(this, args);
            safely(callback, args, name);
            return result;
        };
        return true;
    }

    window[name] = function trollWrapped(...args) {
        const result = original.apply(this, args);
        safely(callback, args, name);
        return result;
    };
    wrapped.add(name);
    return true;
}

/** Read the upstream app state without ever throwing. */
export function upstreamState() {
    return (typeof window.state === "object" && window.state) || null;
}

/** Current runtime snapshot from upstream polling, or null. */
export function runtimeSnapshot() {
    return upstreamState()?.bootstrap?.runtime || null;
}

/** True while an upstream modal (login / early access) is on screen. */
export function upstreamModalVisible() {
    return Array.from(document.querySelectorAll(".modal-overlay")).some(
        (node) => !node.classList.contains("hidden"),
    );
}

/** Upstream toast helper when available, console fallback otherwise. */
export function toast(message, variant = "success") {
    if (typeof window.showToast === "function") {
        window.showToast(message, variant);
        return;
    }
    console.info(`[troll] ${variant}: ${message}`);
}

function safely(callback, args, name) {
    try {
        callback(...args);
    } catch (error) {
        console.warn(`[troll] hook for "${name}" failed`, error);
    }
}
