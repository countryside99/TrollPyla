/**
 * TrollPyla - visual gag engine.
 *
 * Rules the engine enforces so humour can never hurt the app:
 *   - everything is rendered inside a single `pointer-events: none` fixed layer,
 *     so no gag can ever intercept a click;
 *   - at most `MAX_CONCURRENT` gags exist at once, and at most one uses
 *     requestAnimationFrame;
 *   - every gag removes itself on a timer, even if its animation never fires;
 *   - nothing spawns while an upstream modal (login / early access) is open;
 *   - when `animations` is off, gags render as short static cameos instead.
 */

import { config, content, preset } from "./config.js";
import { upstreamModalVisible } from "./hooks.js";
import { spriteElement } from "./sprites.js";
import { escapeHtml, pick, prefersReducedMotion, randomFloat, randomInt, TimerBag, weightedPick } from "./util.js";

const LAYER_ID = "troll-layer";
const MAX_CONCURRENT = 3;

export class GagEngine {
    constructor() {
        this.timers = new TimerBag();
        this.ambient = null;
        this.activeCount = 0;
        this.rafBusy = false;
        this.handlers = {
            cat_walk: (ctx) => this.crossing(ctx, "cat", { bottomBand: true, inner: "troll-inner-bob", seconds: [6, 9] }),
            duck_waddle: (ctx) => this.crossing(ctx, "duck", { bottomBand: true, inner: "troll-inner-waddle", seconds: [7, 10], scale: 0.8 }),
            toaster_fly: (ctx) => this.flying(ctx),
            dino_peek: (ctx) => this.peeking(ctx),
            ufo_abduct: (ctx) => this.abduction(ctx),
            banana_dance: (ctx) => this.idle(ctx, "banana", "troll-dance", 4200),
            penguin_confused: (ctx) => this.idle(ctx, "penguin", "troll-confused", 4600),
            toast_fly: (ctx) => this.flying(ctx, "toast"),
            penguin_slide: (ctx) => this.penguinSlide(ctx),
            duck_inspect: (ctx) => this.duckInspector(ctx),
            goblin_run: (ctx) => this.goblinRun(ctx),
            confetti: (ctx) => this.confetti(ctx),
            fake_error: (ctx) => this.fakeError(ctx),
            cat_chase: (ctx) => this.cursorChase(ctx),
            cat_sleep: (ctx) => this.cornerNap(ctx),
            duck_observer: (ctx) => this.cornerObserver(ctx),
            cat_spinner: (ctx) => this.spinnerCat(ctx),
            paw_prints: (ctx) => this.pawPrints(ctx),
            googly_eyes: (ctx) => this.googlyEyes(ctx),
            motivation_404: (ctx) => this.popup(ctx),
        };
    }

    // ---------------------------------------------------------------- lifecycle

    layer() {
        let node = document.getElementById(LAYER_ID);
        if (!node) {
            node = document.createElement("div");
            node.id = LAYER_ID;
            node.setAttribute("aria-hidden", "true");
            document.body.appendChild(node);
        }
        return node;
    }

    /** Start firing random gags for a scope ("startup" or "runtime"). */
    startAmbient(scope) {
        this.stopAmbient();
        const intervalKey = scope === "runtime" ? "runtime_event_interval_ms" : "startup_event_interval_ms";
        const interval = Math.max(1500, Number(preset()[intervalKey]) || 5000);
        const chance = scope === "runtime" ? Number(preset().runtime_event_chance ?? 0.5) : 1;

        this.ambient = this.timers.setInterval(() => {
            if (Math.random() > chance) return;
            this.spawnRandom(scope);
        }, interval);
    }

    stopAmbient() {
        if (this.ambient) {
            window.clearInterval(this.ambient);
            this.ambient = null;
        }
    }

    /** Remove every gag and timer. Called when humour is turned off live. */
    destroy() {
        this.stopAmbient();
        this.timers.clearAll();
        document.getElementById(LAYER_ID)?.remove();
        this.activeCount = 0;
        this.rafBusy = false;
    }

    // ------------------------------------------------------------- spawn logic

    spawnRandom(scope) {
        const candidates = (content().visual_events || []).filter(
            (event) => event.scope === scope || event.scope === "any",
        );
        const chosen = weightedPick(candidates);
        if (chosen) this.spawn(chosen.id, { motion: chosen.motion !== false });
    }

    /**
     * @param {string} id gag id from content.py VISUAL_EVENTS
     * @param {{motion?: boolean}} [options] `motion:false` marks gags that are
     *        already static, purely for documentation purposes.
     */
    spawn(id, options = {}) {
        const handler = this.handlers[id];
        if (!handler) return false;
        if (this.activeCount >= MAX_CONCURRENT) return false;
        if (upstreamModalVisible()) return false;
        if (document.hidden) return false;

        // `animate === false` turns every motion gag into a short static cameo.
        const ctx = { animate: this.animationsAllowed(), motion: options.motion !== false };

        try {
            const node = handler(ctx);
            if (!node) return false;
            this.activeCount += 1;
            return true;
        } catch (error) {
            console.warn(`[troll] gag "${id}" failed`, error);
            return false;
        }
    }

    animationsAllowed() {
        return Boolean(config().animations) && !prefersReducedMotion();
    }

    /** Mount an actor and guarantee its removal. */
    mount(node, lifetimeMs) {
        this.layer().appendChild(node);
        this.timers.setTimeout(() => {
            node.remove();
            this.activeCount = Math.max(0, this.activeCount - 1);
        }, lifetimeMs);
        return node;
    }

    actor(className = "") {
        const node = document.createElement("div");
        node.className = `troll-actor ${className}`.trim();
        return node;
    }

    // ------------------------------------------------------------------- gags

    /** Cat / duck strolling across the bottom of the window. */
    crossing(ctx, spriteName, { bottomBand, inner, seconds, scale = 1 }) {
        const actor = this.actor();
        const sprite = spriteElement(spriteName, { scale, className: ctx.animate ? inner : "" });
        if (!sprite) return null;
        actor.appendChild(sprite);

        if (bottomBand) {
            actor.style.bottom = `${randomInt(12, 120)}px`;
        } else {
            actor.style.top = `${randomInt(12, 70)}vh`;
        }

        if (!ctx.animate) {
            actor.style.left = `${randomInt(12, 68)}vw`;
            return this.mount(actor, 2600);
        }

        const duration = randomFloat(seconds[0], seconds[1]);
        const goesRight = Math.random() > 0.5;
        actor.classList.add(goesRight ? "troll-cross-right" : "troll-cross-left");
        actor.style.animationDuration = `${duration}s`;
        actor.style.left = "0";
        return this.mount(actor, duration * 1000 + 400);
    }

    /** Toaster (or a slice of toast) flying diagonally across the window. */
    flying(ctx, spriteName = "toaster") {
        const actor = this.actor();
        const sprite = spriteElement(spriteName, { scale: 0.9 });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.top = `${randomInt(18, 62)}vh`;
        actor.style.left = "0";

        if (!ctx.animate) {
            actor.style.left = `${randomInt(20, 65)}vw`;
            return this.mount(actor, 2400);
        }

        actor.classList.add("troll-fly");
        actor.style.animationDuration = `${randomFloat(4.5, 6.5)}s`;
        return this.mount(actor, 7200);
    }

    /** Dinosaur rising briefly from the bottom edge. */
    peeking(ctx) {
        const actor = this.actor();
        const sprite = spriteElement("dino", { scale: 0.95 });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.bottom = "0";
        actor.style.left = `${randomInt(8, 78)}vw`;

        if (!ctx.animate) return this.mount(actor, 2400);

        actor.classList.add("troll-peek");
        return this.mount(actor, 4800);
    }

    /** UFO lifting a harmless fake error message out of the window. */
    abduction(ctx) {
        const actor = this.actor("troll-abduct");
        const sprite = spriteElement("ufo", { scale: 0.8, className: ctx.animate ? "troll-hover" : "" });
        if (!sprite) return null;

        const message = document.createElement("div");
        message.className = "troll-abduct-target";
        message.textContent = pick(content().abducted_messages) || "ERROR: none";

        actor.appendChild(sprite);
        actor.appendChild(message);
        actor.style.top = `${randomInt(14, 52)}vh`;
        actor.style.left = `${randomInt(12, 62)}vw`;

        if (!ctx.animate) return this.mount(actor, 2600);

        this.timers.setTimeout(() => actor.classList.add("troll-vanish"), 3400);
        return this.mount(actor, 4200);
    }

    /** Something standing around doing a silly idle animation. */
    idle(ctx, spriteName, animationClass, lifetimeMs) {
        const actor = this.actor();
        const sprite = spriteElement(spriteName, { scale: 1, className: ctx.animate ? animationClass : "" });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.bottom = `${randomInt(20, 140)}px`;
        actor.style.left = `${randomInt(10, 80)}vw`;
        return this.mount(actor, ctx.animate ? lifetimeMs : 2400);
    }

    /**
     * Cat lazily chasing the cursor. The only rAF driven gag, and only one of
     * them can exist at a time so the frame budget stays untouched.
     */
    cursorChase(ctx) {
        if (!ctx.animate || this.rafBusy) return null;

        const actor = this.actor();
        const sprite = spriteElement("cat", { scale: 0.55, className: "troll-inner-bob" });
        if (!sprite) return null;
        actor.appendChild(sprite);

        let x = window.innerWidth / 2;
        let y = window.innerHeight - 140;
        let targetX = x;
        let targetY = y;
        actor.style.left = "0";
        actor.style.top = "0";

        const onMove = (event) => {
            targetX = event.clientX - 40;
            targetY = event.clientY + 12;
        };
        window.addEventListener("mousemove", onMove, { passive: true });

        this.rafBusy = true;
        let running = true;
        const step = () => {
            if (!running) return;
            x += (targetX - x) * 0.055;
            y += (targetY - y) * 0.055;
            const facingLeft = targetX < x;
            actor.style.transform = `translate3d(${x}px, ${y}px, 0)${facingLeft ? " scaleX(-1)" : ""}`;
            window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);

        const node = this.mount(actor, 7000);
        this.timers.setTimeout(() => {
            running = false;
            this.rafBusy = false;
            window.removeEventListener("mousemove", onMove);
        }, 7000);
        return node;
    }

    /** Cat asleep in the corner, minding its own business. */
    cornerNap() {
        const actor = this.actor();
        const sprite = spriteElement("catSleep", { scale: 0.9 });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.right = "26px";
        actor.style.bottom = "104px";
        return this.mount(actor, 14000);
    }

    /** Rubber duck quietly supervising the run. */
    cornerObserver() {
        const actor = this.actor();
        const sprite = spriteElement("duck", { scale: 0.75 });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.left = "18px";
        actor.style.bottom = "96px";
        return this.mount(actor, 11000);
    }

    /** Tiny cat batting at whatever spinner is currently on screen. */
    spinnerCat(ctx) {
        const spinner = document.querySelector(".troll-spinner, .player-pill-spinner");
        if (!spinner) return null;
        const rect = spinner.getBoundingClientRect();
        if (!rect.width) return null;

        const actor = this.actor();
        const sprite = spriteElement("cat", { scale: 0.42, className: ctx.animate ? "troll-bat" : "" });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.left = `${Math.max(4, rect.left - 58)}px`;
        actor.style.top = `${Math.max(4, rect.top - 26)}px`;
        return this.mount(actor, 3800);
    }

    /** A short trail of floating paw prints. */
    pawPrints(ctx) {
        const group = this.actor();
        group.style.inset = "0";
        group.style.width = "100%";
        group.style.height = "100%";

        const startX = randomInt(14, 78);
        const total = 5;
        for (let index = 0; index < total; index += 1) {
            const paw = spriteElement("paw", { scale: randomFloat(0.7, 1) });
            if (!paw) continue;
            paw.style.position = "absolute";
            paw.style.left = `${startX + index * randomFloat(1.6, 3)}vw`;
            paw.style.bottom = `${40 + index * 26}px`;
            paw.style.setProperty("--troll-paw-rot", `${randomInt(-28, 28)}deg`);
            if (ctx.animate) {
                paw.classList.add("troll-paw");
                paw.style.animationDelay = `${index * 240}ms`;
            } else {
                paw.style.opacity = "0.7";
            }
            group.appendChild(paw);
        }

        return this.mount(group, ctx.animate ? 5200 : 2400);
    }

    /** Googly eyes stuck onto a random panel, following the cursor. */
    googlyEyes(ctx) {
        const targets = Array.from(document.querySelectorAll(".panel-title, .brand-title, .queue-title"))
            .filter((node) => node.getBoundingClientRect().width > 40);
        const target = pick(targets);
        if (!target) return null;

        const rect = target.getBoundingClientRect();
        const actor = this.actor("troll-googly");
        actor.innerHTML = '<div class="troll-eye"><i class="troll-pupil"></i></div><div class="troll-eye"><i class="troll-pupil"></i></div>';
        actor.style.left = `${rect.left + rect.width + 8}px`;
        actor.style.top = `${rect.top - 4}px`;

        const node = this.mount(actor, 6500);

        if (!ctx.animate) return node;

        const pupils = Array.from(actor.querySelectorAll(".troll-pupil"));
        const onMove = (event) => {
            pupils.forEach((pupil) => {
                const eye = pupil.parentElement.getBoundingClientRect();
                const dx = event.clientX - (eye.left + eye.width / 2);
                const dy = event.clientY - (eye.top + eye.height / 2);
                const distance = Math.hypot(dx, dy) || 1;
                const reach = Math.min(4.5, distance / 26);
                pupil.style.transform = `translate(${(dx / distance) * reach}px, ${(dy / distance) * reach}px)`;
            });
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        this.timers.setTimeout(() => window.removeEventListener("mousemove", onMove), 6500);
        return node;
    }

    /** Penguin belly-sliding across the bottom of the window. */
    penguinSlide(ctx) {
        const actor = this.actor();
        const sprite = spriteElement("penguin", { scale: 0.85, className: ctx.animate ? "troll-slide-tilt" : "" });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.bottom = `${randomInt(8, 60)}px`;
        actor.style.left = "0";

        if (!ctx.animate) {
            actor.style.left = `${randomInt(15, 65)}vw`;
            return this.mount(actor, 2400);
        }

        const duration = randomFloat(2.6, 4);
        actor.classList.add(Math.random() > 0.5 ? "troll-cross-right" : "troll-cross-left");
        actor.style.animationDuration = `${duration}s`;
        actor.style.animationTimingFunction = "cubic-bezier(0.15, 0.85, 0.25, 1)";
        return this.mount(actor, duration * 1000 + 400);
    }

    /**
     * A rubber duck waddles up to a random button and inspects it, complete with
     * a tiny clipboard verdict. It never covers the button's click target: the
     * whole gag layer is pointer-events: none.
     */
    duckInspector(ctx) {
        const buttons = Array.from(document.querySelectorAll(".btn, .nav-item, .seg-btn")).filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 60 && rect.top > 40 && rect.bottom < window.innerHeight - 20;
        });
        const target = pick(buttons);
        if (!target) return null;

        const rect = target.getBoundingClientRect();
        const actor = this.actor("troll-inspector");
        const sprite = spriteElement("duck", { scale: 0.6, className: ctx.animate ? "troll-inner-waddle" : "" });
        if (!sprite) return null;

        const verdict = document.createElement("span");
        verdict.className = "troll-verdict";
        verdict.textContent = pick([
            "Button: acceptable.",
            "Slightly crooked. Approved.",
            "This button smells fine.",
            "Certified clickable.",
            "Needs 4% more button.",
            "Under investigation.",
        ]);

        actor.appendChild(sprite);
        actor.appendChild(verdict);
        actor.style.left = `${Math.max(6, rect.left - 26)}px`;
        actor.style.top = `${Math.max(6, rect.top - 44)}px`;
        return this.mount(actor, ctx.animate ? 5200 : 2600);
    }

    /** A goblin sprints across the window carrying something it should not have. */
    goblinRun(ctx) {
        const actor = this.actor();
        const sprite = spriteElement("goblin", { scale: 0.8, className: ctx.animate ? "troll-inner-bob" : "" });
        if (!sprite) return null;
        actor.appendChild(sprite);
        actor.style.bottom = `${randomInt(14, 90)}px`;
        actor.style.left = "0";

        if (!ctx.animate) {
            actor.style.left = `${randomInt(15, 68)}vw`;
            return this.mount(actor, 2400);
        }

        const duration = randomFloat(2.2, 3.4);
        actor.classList.add(Math.random() > 0.5 ? "troll-cross-right" : "troll-cross-left");
        actor.style.animationDuration = `${duration}s`;
        return this.mount(actor, duration * 1000 + 400);
    }

    /** Confetti, for absolutely no reason, with a caption admitting as much. */
    confetti(ctx) {
        if (!config().confetti) return null;

        const group = this.actor();
        group.style.inset = "0";
        group.style.width = "100%";
        group.style.height = "100%";

        const colors = ["#ff2a44", "#ffd23f", "#6fcf7f", "#7fc4ff", "#c78bff", "#ff9f1a"];
        const total = ctx.animate ? 46 : 14;
        for (let index = 0; index < total; index += 1) {
            const piece = document.createElement("i");
            piece.className = "troll-confetti-piece";
            piece.style.left = `${randomFloat(2, 98)}vw`;
            piece.style.background = pick(colors);
            piece.style.width = `${randomInt(5, 10)}px`;
            piece.style.height = `${randomInt(8, 16)}px`;
            if (ctx.animate) {
                piece.style.animationDuration = `${randomFloat(2.2, 3.8)}s`;
                piece.style.animationDelay = `${randomInt(0, 900)}ms`;
                piece.style.setProperty("--troll-drift", `${randomInt(-140, 140)}px`);
                piece.style.setProperty("--troll-spin", `${randomInt(-720, 720)}deg`);
            } else {
                piece.style.top = `${randomFloat(10, 80)}vh`;
                piece.style.opacity = "0.85";
            }
            group.appendChild(piece);
        }

        const reason = pick(content().confetti_reasons);
        if (reason) {
            const caption = document.createElement("div");
            caption.className = "troll-confetti-caption";
            caption.textContent = reason;
            group.appendChild(caption);
        }

        return this.mount(group, ctx.animate ? 5200 : 2800);
    }

    /**
     * A fake error dialog that panics, immediately apologises and deletes itself.
     * It is a plain div in the gag layer, so it can never be mistaken for a real
     * modal: it cannot be clicked and it never blocks anything.
     */
    fakeError(ctx) {
        if (!config().fake_errors) return null;

        const entry = pick(content().fake_errors);
        if (!entry) return null;

        const node = document.createElement("div");
        node.className = "troll-fake-error";
        node.innerHTML = `
            <div class="troll-fake-error-head">
                <span class="troll-fake-error-icon" aria-hidden="true">!</span>
                <strong>${escapeHtml(entry.title)}</strong>
            </div>
            <p data-troll-error-body>${escapeHtml(entry.body)}</p>
            <div class="troll-fake-error-actions" aria-hidden="true">
                <span class="troll-fake-btn">Panic</span>
                <span class="troll-fake-btn primary">Also Panic</span>
            </div>
        `;
        node.style.left = `${randomInt(18, 58)}vw`;
        node.style.top = `${randomInt(18, 58)}vh`;

        const mounted = this.mount(node, ctx.animate ? 4600 : 3000);

        // Then it thinks better of it.
        this.timers.setTimeout(() => {
            const body = node.querySelector("[data-troll-error-body]");
            if (!body) return;
            node.classList.add("troll-apologising");
            body.textContent = entry.apology;
            const actions = node.querySelector(".troll-fake-error-actions");
            if (actions) actions.innerHTML = '<span class="troll-fake-btn">Sorry</span>';
        }, 1700);

        return mounted;
    }

    /** "404 Motivation Not Found" style popup that dismisses itself. */
    popup() {
        const entry = pick(content().popups) || { title: "404", body: "Motivation Not Found" };
        const node = document.createElement("div");
        node.className = "troll-popup";
        node.innerHTML = `
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(entry.body)}</span>
            <em>No action required. No action possible.</em>
        `;
        node.style.left = `${randomInt(16, 62)}vw`;
        node.style.top = `${randomInt(16, 66)}vh`;
        return this.mount(node, 4600);
    }
}
