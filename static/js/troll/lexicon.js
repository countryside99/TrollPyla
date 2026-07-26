/**
 * TrollPyla - the renaming layer.
 *
 * Walks the rendered DOM and swaps every serious word for a much less serious one
 * ("Settings" -> "Chaos Control", "CPU" -> "Thinking Potato", "Start" -> "Release
 * The Beast"). The dictionary itself lives in `troll/lexicon.py`, so adding jokes
 * never means touching JavaScript.
 *
 * Safety rules, because this touches the whole interface:
 *   - only *visible text nodes* and a few descriptive attributes are rewritten.
 *     Input values, dataset keys, ids and classes are never touched, so nothing
 *     upstream PylaAI reads can change;
 *   - our own overlay and gag layer are skipped (they are already silly);
 *   - the original string of every node is remembered, so turning the renaming off
 *     restores the real interface live, without a reload;
 *   - the MutationObserver is disconnected while rewriting, so a rewrite can never
 *     trigger another rewrite.
 */

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE", "PRE"]);
const SKIP_CLOSEST = "#troll-layer, .troll-overlay, [data-troll-raw]";
const ATTRIBUTES = ["placeholder", "title", "aria-label", "data-tooltip"];
const DEBOUNCE_MS = 90;

/** Text node -> { original, rendered } so the rename is fully reversible. */
const textMemory = new WeakMap();
/** Element -> { attribute: { original, rendered } } */
const attrMemory = new WeakMap();

let renames = {};
let lookup = {};
let phrases = {};
let taglines = [];
let pattern = null;
let observer = null;
let pendingPass = null;
let active = false;

/**
 * Load a lexicon bundle from the server payload.
 * @param {{renames?: object, phrases?: object, brand_taglines?: string[]}} lexicon
 */
export function setLexicon(lexicon) {
    renames = lexicon?.renames || {};
    phrases = lexicon?.phrases || {};
    taglines = lexicon?.brand_taglines || [];

    lookup = {};
    Object.entries(renames).forEach(([from, to]) => {
        lookup[from.toLowerCase()] = to;
    });

    // Longest phrases first so "Trophy Target" beats "Target".
    const sources = Object.keys(renames)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegex);
    pattern = sources.length ? new RegExp(`\\b(?:${sources.join("|")})\\b`, "gi") : null;
}

/** A random silly tagline for the sidebar brand. */
export function randomTagline() {
    if (!taglines.length) return "Certified nonsense";
    return taglines[Math.floor(Math.random() * taglines.length)];
}

/** Start renaming, and keep renaming as upstream re-renders its views. */
export function enableRenaming() {
    if (active || !pattern) return;
    active = true;
    runPass();
    observe();
}

/** Stop renaming and put every original string back. */
export function disableRenaming() {
    if (!active) return;
    active = false;
    observer?.disconnect();
    observer = null;
    window.clearTimeout(pendingPass);
    pendingPass = null;
    restoreAll(document.body);
}

/** Rename a standalone string (used for our own generated copy). */
export function rename(text) {
    return active ? rewriteString(String(text ?? "")) : String(text ?? "");
}

// ---------------------------------------------------------------- internals

function observe() {
    observer = new MutationObserver(() => {
        if (!active) return;
        window.clearTimeout(pendingPass);
        pendingPass = window.setTimeout(runPass, DEBOUNCE_MS);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

function runPass() {
    if (!active) return;
    // Detach first: our own edits must never feed back into the observer.
    observer?.disconnect();
    try {
        rewriteTree(document.body);
    } catch (error) {
        console.warn("[troll] renaming pass failed", error);
    } finally {
        if (active && observer) {
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    }
}

function rewriteTree(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.data || !node.data.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.closest(SKIP_CLOSEST)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(rewriteTextNode);

    root.querySelectorAll(`[${ATTRIBUTES.join("],[")}]`).forEach(rewriteAttributes);
}

function rewriteTextNode(node) {
    const remembered = textMemory.get(node);
    // Already ours and untouched since the last pass: nothing to do.
    if (remembered && remembered.rendered === node.data) return;

    // Anything else is fresh output from upstream, so its current text is the
    // original we have to be able to restore later.
    const original = node.data;
    const rewritten = rewriteString(original);
    if (rewritten === original) {
        textMemory.set(node, { original, rendered: original });
        return;
    }

    node.data = rewritten;
    textMemory.set(node, { original, rendered: rewritten });
}

function rewriteAttributes(element) {
    if (element.closest(SKIP_CLOSEST)) return;
    let store = attrMemory.get(element);

    ATTRIBUTES.forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value || !value.trim()) return;

        const remembered = store?.[attribute];
        if (remembered && remembered.rendered === value) return;

        const rewritten = rewriteString(value);
        if (rewritten === value) return;

        element.setAttribute(attribute, rewritten);
        store = store || {};
        store[attribute] = { original: value, rendered: rewritten };
        attrMemory.set(element, store);
    });
}

function rewriteString(text) {
    const trimmed = text.trim();
    if (trimmed && Object.prototype.hasOwnProperty.call(phrases, trimmed)) {
        return text.replace(trimmed, phrases[trimmed]);
    }
    if (!pattern) return text;
    return text.replace(pattern, (match) => matchCase(match, lookup[match.toLowerCase()] || match));
}

/** Keep SHOUTING and lowercase text looking the way the author wrote it. */
function matchCase(match, replacement) {
    if (match === match.toUpperCase() && match !== match.toLowerCase()) return replacement.toUpperCase();
    if (match === match.toLowerCase()) return replacement.toLowerCase();
    return replacement;
}

function restoreAll(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
        const remembered = textMemory.get(node);
        if (remembered && remembered.rendered === node.data) {
            node.data = remembered.original;
            textMemory.delete(node);
        }
    });

    root.querySelectorAll(`[${ATTRIBUTES.join("],[")}]`).forEach((element) => {
        const store = attrMemory.get(element);
        if (!store) return;
        Object.entries(store).forEach(([attribute, remembered]) => {
            if (element.getAttribute(attribute) === remembered.rendered) {
                element.setAttribute(attribute, remembered.original);
            }
        });
        attrMemory.delete(element);
    });
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
