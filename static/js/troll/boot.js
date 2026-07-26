/**
 * TrollPyla - startup "certification" sequence.
 *
 * Sits on top of the PylaAI dashboard as a modal overlay, so the Start button is
 * physically unreachable until the nonsense is over. It never blocks the app in a
 * way the user cannot escape:
 *
 *   - Escape starts working after `skip_delay_seconds`, with nothing on screen
 *     advertising it;
 *   - an idle watchdog closes the overlay after `max_startup_seconds` without any
 *     interaction (interacting resets it, so nobody is cut off mid-question);
 *   - any thrown error closes the overlay immediately;
 *   - it never runs while the bot is already running or while the login modal is
 *     required, so reconnecting to a live session is never interrupted.
 *
 * No challenge has a correct answer. Every answer is accepted.
 */

import { config, content, preset } from "./config.js";
import { normalize } from "./quiz.js";
import { escapeHtml, pick, randomInt, sample, sleep } from "./util.js";

/**
 * Does this answer satisfy the challenge?
 *
 * A challenge declares its answer in exactly one way:
 *   `accepted` - list of acceptable strings (compared on letters and digits only)
 *   `answer`   - a single option string or number
 *   `target`   - the exact slider value
 * A challenge with none of these has no wrong answer, so any action passes.
 */
function isCorrectAnswer(challenge, value) {
    if (Array.isArray(challenge.accepted) && challenge.accepted.length) {
        const guess = normalize(value);
        return Boolean(guess) && challenge.accepted.some((answer) => normalize(answer) === guess);
    }
    if (challenge.answer !== undefined && challenge.answer !== null) {
        if (typeof challenge.answer === "number") return Number(value) === challenge.answer;
        return normalize(value) === normalize(challenge.answer);
    }
    if (challenge.target !== undefined && challenge.target !== null) {
        return Number(value) === Number(challenge.target);
    }
    return true;
}

const SESSION_KEY = "trollpyla.certified";
const LOGO = "/api/assets/support/logo.png";

export class BootSequence {
    /**
     * @param {{spawnRandom?: Function, startAmbient?: Function, stopAmbient?: Function}} gags
     */
    constructor(gags) {
        this.gags = gags;
        this.overlay = null;
        this.cancelled = false;
        this.finished = false;
        this.watchdog = null;
        this.watchdogMs = 30000;
        this.skipTimer = null;
        this.onKeyDown = null;
        this.onFocusIn = null;
        this.skipAllowed = false;
        this.pendingResolve = null;
    }

    // ------------------------------------------------------------- gating

    static alreadyCertified() {
        try {
            return window.sessionStorage.getItem(SESSION_KEY) === "1";
        } catch {
            return false;
        }
    }

    static markCertified() {
        try {
            window.sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
            /* private browsing - ignore */
        }
    }

    /** Let the user replay the sequence from the settings panel. */
    static forgetCertification() {
        try {
            window.sessionStorage.removeItem(SESSION_KEY);
        } catch {
            /* ignore */
        }
    }

    /**
     * @param {object|null} bootstrap upstream `state.bootstrap`
     */
    shouldRun(bootstrap) {
        const settings = config();
        if (!settings.enabled || !settings.startup_sequence) return false;

        // Never interrupt a live session (page refresh while the bot works).
        const runtimeState = bootstrap?.runtime?.state;
        if (runtimeState && !["idle", "error"].includes(runtimeState)) return false;

        // Never stack on top of the login modal.
        const auth = bootstrap?.auth;
        if (auth?.required && !auth?.authenticated) return false;

        if (BootSequence.alreadyCertified() && !settings.replay_every_launch) return false;
        return true;
    }

    // ------------------------------------------------------------- overlay

    /**
     * Paint the overlay immediately, before the config round trip resolves, so
     * the user can never sneak a click on Start. Cheap: one div, no content yet.
     */
    showShell() {
        if (this.overlay) return this.overlay;

        const overlay = document.createElement("div");
        overlay.className = "troll-overlay";
        overlay.id = "trollBootOverlay";
        overlay.innerHTML = `
            <div class="troll-card" role="dialog" aria-modal="true" aria-labelledby="trollBootTitle" tabindex="-1">
                <div class="troll-card-head">
                    <img src="${LOGO}" alt="">
                    <div>
                        <p class="troll-eyebrow">TrollPyla certification</p>
                        <h2 id="trollBootTitle">Preparing the verification process</h2>
                    </div>
                </div>
                <div class="troll-body" data-troll-body>
                    <div class="troll-stage-line"><span class="troll-spinner"></span><span>Waking up the paperwork...</span></div>
                </div>
                <div class="troll-card-actions">
                    <span class="troll-progress-meta" data-troll-footnote>Do not adjust your monitor.</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
        return overlay;
    }

    /** Close the shell without running anything (humour disabled, bot running). */
    dismissShell() {
        this.teardown();
    }

    // ----------------------------------------------------------------- run

    async run() {
        if (!this.overlay) this.showShell();
        const settings = config();

        this.armSkip(settings.skip_delay_seconds);
        this.armFocusTrap();
        this.armWatchdog(settings.max_startup_seconds);

        if (settings.random_events) {
            this.gags?.startAmbient?.("startup");
            this.gags?.spawnRandom?.("startup");
        }

        try {
            if (settings.language_prompt) {
                await this.askLanguage();
            }
            if (!this.cancelled) {
                await this.runStages();
            }
            if (!this.cancelled && settings.startup_challenges) {
                await this.runChallenges();
            }
            if (!this.cancelled) {
                await this.stampPaperwork();
            }
            if (!this.cancelled) {
                await this.showCertificate();
            }
        } catch (error) {
            console.warn("[troll] certification sequence failed, closing overlay", error);
            this.finish("error");
        }
    }

    // ------------------------------------------------------------ language

    /**
     * The language picker. Both options lead to English. The app then behaves as
     * if the choice were deeply meaningful.
     */
    askLanguage() {
        const prompt = content().language_prompt;
        if (!prompt?.options?.length) return Promise.resolve();

        return new Promise((resolve) => {
            const body = this.body();
            this.setTitle(prompt.title || "Choose your language");
            body.innerHTML = `
                <p class="troll-hint">${escapeHtml(prompt.subtitle || "")}</p>
                <div class="troll-lang-grid" data-troll-langs>
                    ${prompt.options
                        .map(
                            (option) => `
                        <button type="button" class="troll-lang" data-troll-lang="${escapeHtml(option.code || "")}">
                            <span class="troll-lang-flag" aria-hidden="true">${escapeHtml(option.flag || "")}</span>
                            <span class="troll-lang-label">${escapeHtml(option.label || "")}</span>
                        </button>
                    `,
                        )
                        .join("")}
                </div>
                <div data-troll-feedback aria-live="polite"></div>
            `;

            const feedbackHost = body.querySelector("[data-troll-feedback]");
            let settled = false;

            const choose = async () => {
                if (settled || this.cancelled) return;
                settled = true;
                body.querySelectorAll("[data-troll-lang]").forEach((node) => {
                    node.disabled = true;
                });
                const response = pick(prompt.responses) || "Excellent choice.";
                feedbackHost.innerHTML = `<div class="troll-feedback">${escapeHtml(response)}</div>`;
                await sleep(1000);
                resolve();
            };

            body.querySelectorAll("[data-troll-lang]").forEach((button) => {
                button.addEventListener("click", choose);
            });

            // Skip / watchdog must be able to unwind this screen too.
            this.pendingResolve = () => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            body.querySelector("[data-troll-lang]")?.focus({ preventScroll: true });
        });
    }

    // -------------------------------------------------------------- stages

    async runStages() {
        const stages = sample(content().loading_stages, Math.max(1, Number(preset().startup_stages) || 4));
        if (!stages.length) return;

        const [minMs, maxMs] = preset().stage_duration_ms || [240, 560];
        const body = this.body();
        body.innerHTML = `
            <div class="troll-progress-track"><div class="troll-progress-fill" data-troll-fill></div></div>
            <div class="troll-progress-meta">
                <span data-troll-step>Stage 1 of ${stages.length}</span>
                <span data-troll-percent>0%</span>
            </div>
            <div class="troll-stage-line" aria-live="polite" data-troll-stage>
                <span class="troll-spinner"></span><span data-troll-stage-text></span>
            </div>
            <ul class="troll-stage-log" data-troll-log></ul>
        `;
        this.setTitle("Running mandatory absurdity checks");

        const fill = body.querySelector("[data-troll-fill]");
        const stepLabel = body.querySelector("[data-troll-step]");
        const percentLabel = body.querySelector("[data-troll-percent]");
        const stageText = body.querySelector("[data-troll-stage-text]");
        const log = body.querySelector("[data-troll-log]");

        const track = body.querySelector(".troll-progress-track");
        const stageLine = body.querySelector("[data-troll-stage]");
        const mischiefChance = Number(preset().stage_mischief_chance ?? 0.3);

        // Progress is tracked separately from the loop index, because it is allowed
        // to go down again. It is dragged back to 100% at the end regardless.
        let progress = 0;
        const paint = (value) => {
            progress = Math.max(0, Math.min(100, Math.round(value)));
            fill.style.width = `${progress}%`;
            percentLabel.textContent = `${progress}%`;
        };

        for (let index = 0; index < stages.length; index += 1) {
            if (this.cancelled) return;

            stageText.textContent = stages[index];
            stepLabel.textContent = `Stage ${index + 1} of ${stages.length}`;
            paint(((index + 1) / stages.length) * 100);

            await sleep(randomInt(minMs, maxMs));
            if (this.cancelled) return;

            // Occasionally something goes theatrically wrong. Nothing is wrong.
            const isLastStage = index === stages.length - 1;
            if (!isLastStage && Math.random() < mischiefChance) {
                await this.stageMischief({ stageLine, stageText, track, paint, progress });
                if (this.cancelled) return;
            }

            const entry = document.createElement("li");
            entry.innerHTML = `<b>OK</b><span>${escapeHtml(stages[index])}</span>`;
            log.prepend(entry);
            while (log.children.length > 4) log.lastElementChild.remove();
        }

        paint(100);
    }

    /**
     * One randomly chosen piece of progress-bar theatre: a fake setback, the bar
     * losing ground, or a goblin walking off with a chunk of it.
     */
    async stageMischief({ stageLine, stageText, track, paint, progress }) {
        const kind = pick(["interrupt", "backwards", "goblin"]);

        if (kind === "goblin" && track) {
            const line = pick(content().goblin_lines) || "A goblin is stealing part of the progress bar.";
            stageText.textContent = line;
            stageLine?.classList.add("troll-interrupt");

            const goblin = document.createElement("img");
            goblin.className = "troll-goblin-thief";
            goblin.src = "/static/troll-assets/goblin.svg";
            goblin.alt = "";
            goblin.setAttribute("aria-hidden", "true");
            track.appendChild(goblin);

            await sleep(560);
            paint(Math.max(4, progress - randomInt(8, 22)));
            await sleep(620);
            goblin.remove();
            stageLine?.classList.remove("troll-interrupt");
            return;
        }

        if (kind === "backwards") {
            const line = pick(content().backwards_lines) || "Progress: temporarily negative.";
            stageText.textContent = line;
            stageLine?.classList.add("troll-interrupt");
            paint(Math.max(3, progress - randomInt(6, 18)));
            await sleep(randomInt(500, 820));
            stageLine?.classList.remove("troll-interrupt");
            return;
        }

        const interruption = pick(content().stage_interruptions);
        if (!interruption) return;
        stageText.textContent = interruption;
        stageLine?.classList.add("troll-interrupt");
        await sleep(randomInt(420, 760));
        stageLine?.classList.remove("troll-interrupt");
    }

    // ---------------------------------------------------------- challenges

    async runChallenges() {
        const count = Math.max(1, Number(preset().resolved_challenge_count) || config().challenge_count || 1);
        const challenges = sample(content().challenges, count);
        if (!challenges.length) return;

        this.setTitle("Written examination. There are correct answers.");

        for (let index = 0; index < challenges.length; index += 1) {
            if (this.cancelled) return;
            await this.askChallenge(challenges[index], index + 1, challenges.length);
        }
    }

    /**
     * Render one challenge. Each has exactly one correct answer; wrong answers are
     * rejected and hints leak out one at a time. After a few attempts the question
     * gives up and lets the user move on, so the sequence is always finishable.
     */
    askChallenge(challenge, position, total) {
        return new Promise((resolve) => {
            const surrenderCfg = content().challenge_surrender || {};
            const surrenderAfter = Math.max(1, Number(surrenderCfg.after) || 3);

            const body = this.body();
            body.innerHTML = `
                <div class="troll-challenge">
                    <span class="troll-challenge-count">Question ${position} of ${total}</span>
                    <p class="troll-question">${escapeHtml(challenge.question)}</p>
                    ${challenge.hint ? `<p class="troll-hint">${escapeHtml(challenge.hint)}</p>` : ""}
                    <div data-troll-input></div>
                    <div data-troll-feedback aria-live="polite"></div>
                    <div class="troll-challenge-foot">
                        <button type="button" class="troll-skip" data-troll-challenge-surrender hidden>
                            ${escapeHtml(surrenderCfg.label || "Move on")}
                        </button>
                        <span class="troll-progress-meta" data-troll-challenge-count></span>
                    </div>
                </div>
            `;

            const host = body.querySelector("[data-troll-input]");
            const feedbackHost = body.querySelector("[data-troll-feedback]");
            const surrender = body.querySelector("[data-troll-challenge-surrender]");
            const counter = body.querySelector("[data-troll-challenge-count]");

            let settled = false;
            let attempts = 0;
            let hintIndex = 0;

            const conclude = async (message, variant) => {
                settled = true;
                host.querySelectorAll("button, input").forEach((node) => {
                    node.disabled = true;
                });
                surrender.hidden = true;
                feedbackHost.innerHTML = `<div class="troll-feedback ${variant}">${escapeHtml(message)}</div>`;
                await sleep(1250);
                resolve();
            };

            /** Called by every input kind with whatever the user chose. */
            const submit = (value) => {
                if (settled || this.cancelled) return;

                if (isCorrectAnswer(challenge, value)) {
                    conclude(pick(challenge.feedback) || "Correct.", "");
                    return;
                }

                attempts += 1;
                counter.textContent = `Wrong answers: ${attempts}`;

                const hints = challenge.hints || [];
                const hint = attempts >= 2 && hintIndex < hints.length ? hints[hintIndex++] : "";
                const rejection = pick(content().challenge_rejections) || "Incorrect.";
                feedbackHost.innerHTML = `
                    <div class="troll-feedback is-wrong">
                        <strong>${escapeHtml(rejection)}</strong>
                        ${hint ? `<span>${escapeHtml(hint)}</span>` : ""}
                    </div>
                `;

                if (attempts >= surrenderAfter) surrender.hidden = false;
            };

            surrender.addEventListener("click", () => {
                if (settled) return;
                conclude(pick(surrenderCfg.responses) || "Marked as attended.", "is-surrender");
            });

            this.renderChallengeInput(challenge, host, submit);

            // If the watchdog or skip fires mid-question, resolve so run() unwinds.
            this.pendingResolve = () => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            host.querySelector("button, input, [tabindex]")?.focus({ preventScroll: true });
        });
    }

    /**
     * Build the input for one challenge kind. Every kind reports back through the
     * same `submit(value)` callback, which decides whether the answer was right.
     */
    renderChallengeInput(challenge, host, submit) {
        switch (challenge.kind) {
            case "choice": {
                host.className = "troll-options";
                (challenge.options || []).forEach((option) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "troll-option";
                    button.textContent = option;
                    button.addEventListener("click", () => {
                        // Wrong options are struck out rather than removed, so the
                        // user can see what they have already ruled out.
                        if (!isCorrectAnswer(challenge, option)) button.classList.add("is-ruled-out");
                        submit(option);
                    });
                    host.appendChild(button);
                });
                break;
            }

            case "text":
            case "counter": {
                const isNumber = challenge.kind === "counter";
                host.className = "troll-field";
                host.innerHTML = `
                    <input type="${isNumber ? "number" : "text"}" autocomplete="off" spellcheck="false"
                           ${isNumber ? `min="${challenge.min ?? 0}" max="${challenge.max ?? 9999}"` : ""}
                           placeholder="${escapeHtml(challenge.placeholder || "Your answer")}"
                           aria-label="${escapeHtml(challenge.question)}">
                    <button type="button" class="troll-enter">Answer</button>
                `;
                const input = host.querySelector("input");
                const button = host.querySelector("button");
                const send = () => submit(isNumber ? Number(input.value) : input.value);
                button.addEventListener("click", send);
                input.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        send();
                    }
                });
                break;
            }

            case "invisible": {
                // The only kind with no wrong answer: the action itself is correct.
                const zone = document.createElement("button");
                zone.type = "button";
                zone.className = "troll-invisible-zone";
                zone.setAttribute("aria-label", `${challenge.question} Click anywhere in this area.`);
                zone.addEventListener("click", () => submit(null));
                host.appendChild(zone);

                window.setTimeout(() => {
                    if (!zone.isConnected || zone.disabled) return;
                    zone.classList.add("troll-revealed");
                    zone.textContent = challenge.reveal || "Click anywhere in here.";
                }, 3000);
                break;
            }

            case "dial": {
                const min = Number(challenge.min ?? 0);
                const max = Number(challenge.max ?? 360);
                const start = Number(challenge.default ?? min);
                host.className = "troll-dial";
                host.innerHTML = `
                    <div class="troll-moon" data-troll-moon aria-hidden="true"></div>
                    <input type="range" min="${min}" max="${max}" value="${start}" step="1"
                           aria-label="${escapeHtml(challenge.question)}">
                    <span class="troll-dial-value" data-troll-dial-value>${start} ${escapeHtml(challenge.unit || "deg")}</span>
                    <button type="button" class="troll-enter">Lock it in</button>
                `;
                const range = host.querySelector("input");
                const moon = host.querySelector("[data-troll-moon]");
                const readout = host.querySelector("[data-troll-dial-value]");
                range.addEventListener("input", () => {
                    moon.style.transform = `rotate(${range.value}deg)`;
                    readout.textContent = `${range.value} ${challenge.unit || "deg"}`;
                });
                host.querySelector("button").addEventListener("click", () => submit(Number(range.value)));
                break;
            }

            default: {
                // Unknown kind from a future content pack: degrade to a button.
                host.className = "troll-options";
                const button = document.createElement("button");
                button.type = "button";
                button.className = "troll-option";
                button.textContent = "Sure";
                button.addEventListener("click", () => submit(null));
                host.appendChild(button);
            }
        }
    }

    // ---------------------------------------------------------- paperwork

    /**
     * The bureaucracy phase. No input, no progress bar, just a queue of stamps
     * being applied to a document that does not exist.
     */
    async stampPaperwork() {
        const lines = sample(content().stamping_lines, randomInt(4, 6));
        if (!lines.length) return;

        const body = this.body();
        this.setTitle("Processing your paperwork");
        body.innerHTML = `
            <div class="troll-stage-line" aria-live="polite" data-troll-stamp>
                <span class="troll-spinner"></span><span data-troll-stamp-text></span>
            </div>
            <ul class="troll-stage-log" data-troll-stamp-log></ul>
        `;

        const text = body.querySelector("[data-troll-stamp-text]");
        const log = body.querySelector("[data-troll-stamp-log]");

        for (const line of lines) {
            if (this.cancelled) return;
            text.textContent = `${line}...`;
            await sleep(randomInt(360, 640));
            if (this.cancelled) return;

            const entry = document.createElement("li");
            entry.innerHTML = `<b>OK</b><span>${escapeHtml(line)}</span>`;
            log.prepend(entry);
            while (log.children.length > 4) log.lastElementChild.remove();
        }

        text.textContent = "Paperwork complete.";
        await sleep(420);
    }

    // --------------------------------------------------------- certificate

    async showCertificate() {
        const body = this.body();
        const line = pick(content().certification_lines) || "Certified absurd-ready.";
        const outro = pick(content().challenge_outros) || "There were no correct answers.";

        this.setTitle("Certification complete");
        body.innerHTML = `
            <div class="troll-seal">
                <div class="troll-seal-badge" aria-hidden="true">&#10003;</div>
                <div class="troll-seal-copy">
                    <strong>${escapeHtml(line)}</strong>
                    <span>${escapeHtml(outro)}</span>
                </div>
            </div>
            <p class="troll-hint">Certificate number ${randomInt(1000, 9999)}-B. Do not lose it.</p>
        `;

        const enter = document.createElement("button");
        enter.type = "button";
        enter.className = "troll-enter";
        enter.textContent = "Let me at the Start button";
        enter.addEventListener("click", () => this.finish("completed"));

        const actions = this.overlay.querySelector(".troll-card-actions");
        actions.appendChild(enter);
        enter.focus({ preventScroll: true });

        // Even the final screen closes itself if the user walks away.
        await sleep(0);
    }

    // -------------------------------------------------------------- guards

    /**
     * There is no visible way out of the certification, which is the point.
     * Escape still works after `skip_delay_seconds`, undocumented and unadvertised,
     * and the idle watchdog closes the overlay on its own, so nobody can end up
     * genuinely stuck.
     */
    armSkip(delaySeconds) {
        const delay = Math.max(0, Number(delaySeconds) || 0) * 1000;
        this.skipTimer = window.setTimeout(() => {
            this.skipAllowed = true;
        }, delay);

        this.onKeyDown = (event) => {
            if (event.key === "Escape" && this.skipAllowed) {
                event.preventDefault();
                this.finish("skipped");
            }
        };
        document.addEventListener("keydown", this.onKeyDown);
    }

    /**
     * Keep keyboard focus inside the overlay so Tab + Enter cannot reach the real
     * Start button while the certification is on screen.
     */
    armFocusTrap() {
        this.onFocusIn = (event) => {
            if (!this.overlay || this.overlay.contains(event.target)) return;
            const candidates = Array.from(
                this.overlay.querySelectorAll("button:not([disabled]):not([hidden]), input:not([disabled])"),
            );
            const fallback = this.overlay.querySelector(".troll-card");
            (candidates[0] || fallback)?.focus({ preventScroll: true });
        };
        document.addEventListener("focusin", this.onFocusIn);
    }

    /**
     * Idle watchdog: the overlay always closes itself after `maxSeconds` without
     * interaction. Interacting resets it, so a user who is enjoying the nonsense is
     * never cut off mid-question, while a user who walked away is never stuck.
     */
    armWatchdog(maxSeconds) {
        this.watchdogMs = Math.max(5, Number(maxSeconds) || 30) * 1000;
        const bump = () => this.resetWatchdog();
        ["click", "keydown", "input"].forEach((eventName) => {
            this.overlay?.addEventListener(eventName, bump);
        });
        this.resetWatchdog();
    }

    resetWatchdog() {
        if (this.finished) return;
        window.clearTimeout(this.watchdog);
        this.watchdog = window.setTimeout(() => this.finish("watchdog"), this.watchdogMs);
    }

    // ------------------------------------------------------------- teardown

    finish(reason) {
        if (this.finished) return;
        this.finished = true;
        this.cancelled = true;
        this.pendingResolve?.();
        BootSequence.markCertified();
        this.gags?.stopAmbient?.();

        const overlay = this.overlay;
        if (overlay) {
            overlay.classList.add("troll-closing");
            window.setTimeout(() => this.teardown(), 260);
        } else {
            this.teardown();
        }

        if (reason !== "error") {
            // Hand focus to the real Start button so keyboard users land somewhere useful.
            window.setTimeout(() => {
                document.getElementById("startRuntimeBtn")?.focus({ preventScroll: true });
            }, 320);
        }
        console.debug(`[troll] certification closed (${reason})`);
    }

    teardown() {
        window.clearTimeout(this.watchdog);
        window.clearTimeout(this.skipTimer);
        if (this.onKeyDown) document.removeEventListener("keydown", this.onKeyDown);
        if (this.onFocusIn) document.removeEventListener("focusin", this.onFocusIn);
        this.onKeyDown = null;
        this.onFocusIn = null;
        this.overlay?.remove();
        this.overlay = null;
        this.cancelled = true;
        this.finished = true;
    }

    // ------------------------------------------------------------- helpers

    body() {
        return this.overlay.querySelector("[data-troll-body]");
    }

    setTitle(text) {
        const title = this.overlay?.querySelector("#trollBootTitle");
        if (title) title.textContent = text;
    }
}
