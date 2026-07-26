/**
 * TrollPyla - the reusable examination widget.
 *
 * One overlay, one question, one accepted answer. Used by the Release The Beast
 * gate and by the border control on each section, so both behave identically:
 *
 *   - wrong answers are rejected, with a fresh insult each time;
 *   - from the second wrong answer a hint leaks out, one per attempt;
 *   - after `SURRENDER_AFTER` attempts a surrender button appears, and Escape
 *     works from that point too, so a joke can never lock anyone out.
 *
 * Answers are compared on letters and digits only, so casing, spacing, accents and
 * punctuation never decide whether someone gets into their own bot.
 */

import { escapeHtml, pick, sleep } from "./util.js";

const SURRENDER_AFTER = 3;

let openOverlay = null;

/**
 * @param {object} quiz entry from content.py (country_quiz / section_quizzes)
 * @param {{onCorrect?: Function}} [options]
 * @returns {Promise<"correct"|"surrender">} resolves once the door is open
 */
export function askQuiz(quiz, options = {}) {
    // Never stack two examinations, and never block on missing content.
    if (openOverlay || !quiz?.accepted?.length) return Promise.resolve("surrender");

    return new Promise((resolve) => {
        let attempts = 0;
        let hintIndex = 0;

        const overlay = document.createElement("div");
        overlay.className = "troll-overlay troll-gate";
        overlay.innerHTML = `
            <div class="troll-card troll-gate-card" role="dialog" aria-modal="true"
                 aria-labelledby="trollQuizTitle" tabindex="-1">
                <div class="troll-card-head">
                    <span class="troll-gate-seal" aria-hidden="true">&#9733;</span>
                    <div>
                        <p class="troll-eyebrow">${escapeHtml(quiz.eyebrow || "Ministry of Correct Opinions")}</p>
                        <h2 id="trollQuizTitle">${escapeHtml(quiz.question)}</h2>
                    </div>
                </div>
                <p class="troll-hint">${escapeHtml(quiz.subtitle || "")}</p>
                <form class="troll-field" data-troll-quiz-form>
                    <input type="text" autocomplete="off" spellcheck="false"
                           placeholder="${escapeHtml(quiz.placeholder || "Your answer")}"
                           aria-label="${escapeHtml(quiz.question)}">
                    <button type="submit" class="troll-enter">Declare</button>
                </form>
                <div class="troll-gate-feedback" data-troll-quiz-feedback aria-live="polite"></div>
                <div class="troll-card-actions">
                    <button type="button" class="troll-skip" data-troll-quiz-surrender hidden>
                        ${escapeHtml(quiz.surrender || "I give up")}
                    </button>
                    <span class="troll-progress-meta" data-troll-quiz-count>Attempts: 0</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        openOverlay = overlay;

        const form = overlay.querySelector("[data-troll-quiz-form]");
        const input = overlay.querySelector("input");
        const feedback = overlay.querySelector("[data-troll-quiz-feedback]");
        const counter = overlay.querySelector("[data-troll-quiz-count]");
        const surrender = overlay.querySelector("[data-troll-quiz-surrender]");

        input?.focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key === "Escape" && !surrender.hidden) {
                event.preventDefault();
                close("surrender");
            }
        };
        document.addEventListener("keydown", onKeyDown);

        // Keyboard focus stays inside the examination room.
        const onFocusIn = (event) => {
            if (overlay.contains(event.target)) return;
            (input?.disabled ? overlay.querySelector(".troll-card") : input)?.focus({ preventScroll: true });
        };
        document.addEventListener("focusin", onFocusIn);

        function close(outcome) {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("focusin", onFocusIn);
            overlay.classList.add("troll-closing");
            window.setTimeout(() => overlay.remove(), 240);
            openOverlay = null;
            resolve(outcome);
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const guess = normalize(input.value);
            if (!guess) return;

            if (quiz.accepted.some((answer) => normalize(answer) === guess)) {
                feedback.className = "troll-gate-feedback is-correct";
                feedback.textContent = pick(quiz.victory) || "CORRECT.";
                input.disabled = true;
                form.querySelector("button").disabled = true;
                surrender.hidden = true;
                options.onCorrect?.();
                await sleep(1400);
                close("correct");
                return;
            }

            attempts += 1;
            counter.textContent = `Attempts: ${attempts}`;
            input.value = "";
            input.focus({ preventScroll: true });

            const hints = quiz.hints || [];
            const hint = attempts >= 2 && hintIndex < hints.length ? hints[hintIndex++] : "";
            feedback.className = "troll-gate-feedback is-wrong";
            feedback.innerHTML = `<strong>${escapeHtml(pick(quiz.rejections) || "Incorrect.")}</strong>${
                hint ? `<span>${escapeHtml(hint)}</span>` : ""
            }`;

            if (attempts >= SURRENDER_AFTER) surrender.hidden = false;
        });

        surrender.addEventListener("click", async () => {
            feedback.className = "troll-gate-feedback";
            feedback.textContent = quiz.surrender_response || "Proceeding anyway.";
            await sleep(850);
            close("surrender");
        });
    });
}

/** True while an examination is on screen. */
export function quizOpen() {
    return Boolean(openOverlay);
}

/** Compare on letters and digits only: spelling should never lock anyone out. */
export function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9]/g, "");
}
