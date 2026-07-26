/**
 * TrollPyla - the Humour settings panel.
 *
 * Injected into the existing Settings view after every upstream render, using the
 * same markup classes as the native sections so it looks and behaves like part of
 * PylaAI. Nothing in `app.js` or `SETTINGS_META` has to change.
 */

import { config, current, save, reset } from "./config.js";
import { afterGlobal, toast } from "./hooks.js";
import { BootSequence } from "./boot.js";
import { escapeHtml } from "./util.js";

const PANEL_ID = "trollSettingsPanel";

const TOGGLES = [
    {
        key: "enabled",
        label: "Enable TrollPyla humour",
        help: "Master switch. Turn this off to get the plain PylaAI experience back.",
        master: true,
    },
    {
        key: "startup_sequence",
        label: "Fake loading stages",
        help: "The absurd certification checks shown before Start becomes available.",
    },
    {
        key: "startup_challenges",
        label: "Startup challenges",
        help: "Unanswerable questions asked during the certification. Always skippable.",
    },
    {
        key: "language_prompt",
        label: "Pointless language picker",
        help: "Asks you to choose a language, then continues in English regardless.",
    },
    {
        key: "country_quiz",
        label: "Geopolitical examination",
        help: "One question before the beast is released. There is a correct answer.",
    },
    {
        key: "section_quizzes",
        label: "Border control on each section",
        help: "One question to enter each section. Asked once per session.",
    },
    {
        key: "rename_ui",
        label: "Rename the whole interface",
        help: "Chaos Control, Thinking Potato, Release The Beast, Oopsies, Line Of Doom.",
    },
    {
        key: "console_nonsense",
        label: "Terminal theatrics",
        help: "Banner, mascot and a fictional systems check in the console at launch.",
    },
    {
        key: "random_events",
        label: "Random visual events",
        help: "Cats, ducks, toasters and UFOs wandering across the startup screen.",
    },
    {
        key: "runtime_gags",
        label: "Gags while the bot runs",
        help: "Occasional, non-blocking cameos during an active run.",
    },
    {
        key: "funny_status_messages",
        label: "Playful status messages",
        help: "An extra line of commentary while the beast is loose.",
    },
    {
        key: "fake_errors",
        label: "Apologetic fake errors",
        help: "Error dialogs that panic, apologise and delete themselves.",
    },
    {
        key: "confetti",
        label: "Unprovoked confetti",
        help: "Confetti. No reason. No warning.",
    },
    {
        key: "animations",
        label: "Animations",
        help: "Turn off for static cameos only. Reduced-motion system settings are always respected.",
    },
];

const NUMBERS = [
    {
        key: "challenge_count",
        label: "Challenges asked",
        help: "How many nonsense questions to ask (1-5). Intensity adjusts this slightly.",
        min: 1,
        max: 5,
    },
    {
        key: "skip_delay_seconds",
        label: "Escape delay",
        help: "Seconds before the Escape key starts working during the certification.",
        min: 0,
        max: 30,
        suffix: "s",
    },
    {
        key: "max_startup_seconds",
        label: "Startup watchdog",
        help: "Hard limit. The certification overlay always closes itself after this long.",
        min: 5,
        max: 120,
        suffix: "s",
    },
];

let saveTimer = null;
let applyCallback = null;

/**
 * @param {Function} onApply called after any config change so the humour layer
 *                           can re-evaluate itself immediately.
 */
export function installSettingsPanel(onApply) {
    applyCallback = onApply;
    inject();
    afterGlobal("renderSettings", inject);
}

function inject() {
    const view = document.getElementById("view-settings");
    if (!view) return;
    // The view is fully re-rendered by upstream, so a stale panel is impossible,
    // but guard anyway in case inject() runs twice in one frame.
    view.querySelector(`#${PANEL_ID}`)?.remove();

    const grid = view.querySelector(".set-grid") || view;
    grid.insertAdjacentHTML("beforeend", panelMarkup());
    bind(view);
}

function panelMarkup() {
    const settings = config();
    const { presets, intensities } = current();
    const locked = !settings.enabled;

    return `
        <!-- data-troll-raw: the renaming layer skips this panel, so the controls for
             the jokes always stay readable even while everything else is renamed. -->
        <section class="panel settings-section" id="${PANEL_ID}" data-troll-raw>
            <div class="panel-header compact-header">
                <div>
                    <p class="eyebrow">TrollPyla</p>
                    <h3 class="panel-title">Chaos Control</h3>
                </div>
                <button class="btn-reset-settings" type="button" data-troll-reset>Reset Settings</button>
            </div>
            <p class="troll-settings-hint">Dials for the nonsense. Turn them up.</p>
            <div class="settings-list">
                ${TOGGLES.map((field) => toggleMarkup(field, settings, locked)).join("")}
                ${intensityMarkup(settings, presets, intensities, locked)}
                ${NUMBERS.map((field) => numberMarkup(field, settings, locked)).join("")}
            </div>
            <div class="troll-settings-actions">
                <button class="btn" type="button" data-troll-replay ${locked ? "disabled" : ""}>Replay the certification</button>
                <button class="btn" type="button" data-troll-original>Restore original PylaAI startup</button>
            </div>
        </section>
    `;
}

function toggleMarkup(field, settings, locked) {
    const disabled = !field.master && locked;
    return `
        <label class="setting-row check-card check-card-right">
            <span class="check-info">
                <strong>${escapeHtml(field.label)}</strong>
                <span>${escapeHtml(field.help)}</span>
            </span>
            <span class="check-control">
                <input type="checkbox" data-troll-key="${field.key}" ${settings[field.key] ? "checked" : ""} ${disabled ? "disabled" : ""}>
                <span class="check-box"></span>
            </span>
        </label>
    `;
}

function intensityMarkup(settings, presets, intensities, locked) {
    const options = (intensities || [])
        .map((value) => {
            const label = presets?.[value]?.label || value;
            const description = presets?.[value]?.description || "";
            const text = description ? `${label} - ${description}` : label;
            return `<option value="${escapeHtml(value)}" ${settings.intensity === value ? "selected" : ""}>${escapeHtml(text)}</option>`;
        })
        .join("");

    return `
        <div class="setting-row">
            <div class="setting-copy">
                <div class="setting-label">
                    <strong>Humour intensity</strong>
                    <span class="tooltip-anchor" data-tooltip="Controls how many stages are shown and how often gags fire.">?</span>
                </div>
                <p class="help-text">How much nonsense per session.</p>
            </div>
            <div class="setting-input-wrap">
                <select data-troll-key="intensity" ${locked ? "disabled" : ""}>${options}</select>
            </div>
        </div>
    `;
}

function numberMarkup(field, settings, locked) {
    return `
        <div class="setting-row">
            <div class="setting-copy">
                <div class="setting-label">
                    <strong>${escapeHtml(field.label)}</strong>
                    <span class="tooltip-anchor" data-tooltip="${escapeHtml(field.help)}">?</span>
                </div>
                <p class="help-text">${escapeHtml(field.help)}</p>
            </div>
            <div class="setting-input-wrap ${field.suffix ? "has-suffix" : ""}">
                <input type="number" min="${field.min}" max="${field.max}" step="1"
                       data-troll-key="${field.key}" value="${settings[field.key]}" ${locked ? "disabled" : ""}>
                ${field.suffix ? `<span class="input-suffix">${escapeHtml(field.suffix)}</span>` : ""}
            </div>
        </div>
    `;
}

function bind(view) {
    const panel = view.querySelector(`#${PANEL_ID}`);
    if (!panel) return;

    panel.querySelectorAll("[data-troll-key]").forEach((input) => {
        // "change" everywhere (not "input"): the panel re-renders after a save, and
        // re-rendering mid-keystroke would steal focus from the number fields.
        input.addEventListener("change", () => {
            const key = input.dataset.trollKey;
            const value = input.type === "checkbox" ? input.checked : input.value;
            queueSave({ [key]: value });
        });
    });

    panel.querySelector("[data-troll-reset]")?.addEventListener("click", async () => {
        await reset();
        BootSequence.forgetCertification();
        applyCallback?.();
        inject();
        toast("Humour settings reset to defaults.", "success");
    });

    panel.querySelector("[data-troll-replay]")?.addEventListener("click", () => {
        BootSequence.forgetCertification();
        applyCallback?.({ replay: true });
        toast("Certification queued. Enjoy.", "success");
    });

    panel.querySelector("[data-troll-original]")?.addEventListener("click", async () => {
        await save({ enabled: false });
        BootSequence.forgetCertification();
        applyCallback?.();
        inject();
        toast("Original PylaAI experience restored.", "success");
    });
}

function queueSave(patch) {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
        await save(patch);
        applyCallback?.();
        inject();
    }, 260);
}
