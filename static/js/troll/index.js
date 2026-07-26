/**
 * TrollPyla - humour layer entry point.
 *
 * Loaded from `templates/index.html` as a single ES module, after the upstream
 * `app.js` classic script. Module scripts are deferred, so this runs after app.js
 * has defined its globals but before its DOMContentLoaded handler fires - the
 * exact window needed to put an overlay in front of the Start button.
 *
 * The whole file is wrapped in error handling: if any part of the humour layer
 * fails, TrollPyla degrades into plain PylaAI instead of breaking the UI.
 */

import { BootSequence } from "./boot.js";
import * as trollConfig from "./config.js";
import { GagEngine } from "./gags.js";
import { forgetGate, installStartGate } from "./gate.js";
import { upstreamState } from "./hooks.js";
import { disableRenaming, enableRenaming, randomTagline, setLexicon } from "./lexicon.js";
import { RuntimeGags } from "./runtime.js";
import { installSettingsPanel } from "./settings.js";
import { prefersReducedMotion } from "./util.js";

const BOOTSTRAP_WAIT_MS = 5000;
const BOOTSTRAP_POLL_MS = 60;
const TAGLINE_ROTATION_MS = 24000;

const layer = {
    gags: null,
    runtime: null,
    sequence: null,
    taglineTimer: null,
};

/** Public handle, handy for debugging from the browser console. */
window.TrollPyla = {
    config: trollConfig,
    layer,
    replayCertification,
    reapply,
};

start();

async function start() {
    try {
        // Put the shell up before anything else so Start is unreachable from the
        // very first paint. Skipped for users who turned humour off previously.
        if (trollConfig.probablyEnabled() && !BootSequence.alreadyCertified()) {
            layer.sequence = new BootSequence(null);
            layer.sequence.showShell();
        }

        await trollConfig.load();
        setLexicon(trollConfig.lexicon());
        installSettingsPanel(reapply);
        applyPresentation();

        const settings = trollConfig.config();
        if (!settings.enabled) {
            layer.sequence?.dismissShell();
            layer.sequence = null;
            return;
        }

        layer.gags = new GagEngine();
        layer.runtime = new RuntimeGags(layer.gags);
        layer.runtime.start();
        startTaglineRotation();
        installStartGate(() => layer.gags?.spawn("confetti"));

        if (!settings.startup_sequence) {
            layer.sequence?.dismissShell();
            layer.sequence = null;
            return;
        }

        const bootstrap = await waitForBootstrap();
        const sequence = layer.sequence || new BootSequence(layer.gags);
        sequence.gags = layer.gags;
        layer.sequence = sequence;

        if (!sequence.shouldRun(bootstrap)) {
            sequence.dismissShell();
            layer.sequence = null;
            return;
        }

        await sequence.run();
    } catch (error) {
        console.warn("[troll] humour layer disabled after an unexpected error", error);
        teardown();
    }
}

/**
 * Re-evaluate the whole layer after a settings change.
 * @param {{replay?: boolean}} [options]
 */
function reapply(options = {}) {
    try {
        applyPresentation();
        const settings = trollConfig.config();

        if (!settings.enabled) {
            teardown();
            return;
        }

        if (!layer.gags) layer.gags = new GagEngine();
        if (!layer.runtime) layer.runtime = new RuntimeGags(layer.gags);
        // Restarting picks up the new intensity / toggle values immediately.
        layer.runtime.start();
        startTaglineRotation();
        installStartGate(() => layer.gags?.spawn("confetti"));

        if (options.replay) {
            forgetGate();
            replayCertification();
        }
    } catch (error) {
        console.warn("[troll] failed to apply humour settings", error);
    }
}

/** Run the certification again on demand (settings panel button). */
function replayCertification() {
    const settings = trollConfig.config();
    if (!settings.enabled || !settings.startup_sequence) return;

    layer.sequence?.teardown();
    if (!layer.gags) layer.gags = new GagEngine();

    const sequence = new BootSequence(layer.gags);
    layer.sequence = sequence;
    sequence.showShell();
    sequence.run();
}

function teardown() {
    disableRenaming();
    document.querySelector(".troll-brand-tagline")?.remove();
    layer.sequence?.teardown();
    layer.sequence = null;
    layer.runtime?.stop();
    layer.runtime = null;
    layer.gags?.destroy();
    layer.gags = null;
    window.clearInterval(layer.taglineTimer);
    layer.taglineTimer = null;
}

/** Motion opt-out, the renaming layer, and the rotating brand tagline. */
function applyPresentation() {
    const settings = trollConfig.config();
    const staticMode = !settings.enabled || !settings.animations || prefersReducedMotion();
    document.documentElement.classList.toggle("troll-no-anim", staticMode);

    // Renaming is fully reversible, so this can be toggled live without a reload.
    if (settings.enabled && settings.rename_ui) {
        enableRenaming();
    } else {
        disableRenaming();
    }

    const brand = document.querySelector(".brand-copy");
    const existing = brand?.querySelector(".troll-brand-tagline");

    if (!brand || !settings.enabled) {
        existing?.remove();
        return;
    }
    if (!existing) {
        const tagline = document.createElement("span");
        tagline.className = "troll-brand-tagline";
        // Marked raw so the renaming pass leaves our own joke alone.
        tagline.setAttribute("data-troll-raw", "");
        tagline.textContent = randomTagline();
        brand.appendChild(tagline);
    }
}

/** Swap the sidebar tagline for a different bit of nonsense now and then. */
function startTaglineRotation() {
    if (layer.taglineTimer) return;
    layer.taglineTimer = window.setInterval(() => {
        if (!trollConfig.config().enabled) return;
        const tagline = document.querySelector(".troll-brand-tagline");
        if (tagline) tagline.textContent = randomTagline();
    }, TAGLINE_ROTATION_MS);
}

/** Wait for upstream `/api/bootstrap` so runtime and auth gating can be honoured. */
async function waitForBootstrap() {
    const deadline = Date.now() + BOOTSTRAP_WAIT_MS;
    while (Date.now() < deadline) {
        const bootstrap = upstreamState()?.bootstrap;
        if (bootstrap) return bootstrap;
        await new Promise((resolve) => window.setTimeout(resolve, BOOTSTRAP_POLL_MS));
    }
    return null;
}
