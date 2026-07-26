/**
 * TrollPyla - gags while the bot is actually working.
 *
 * Deliberately passive: it *reads* the runtime state that upstream PylaAI already
 * polls (`state.bootstrap.runtime`) and never calls a runtime endpoint itself.
 * It also never overwrites upstream text - the playful status line is a separate
 * element the humour layer owns, inserted after the real status note - so a real
 * error message is always still visible.
 */

import { config, content } from "./config.js";
import { runtimeSnapshot } from "./hooks.js";
import { pick, TimerBag } from "./util.js";

const STATUS_CLASS = "troll-status-line";
const TICK_MS = 2000;
const MESSAGE_ROTATION_MS = 6000;

export class RuntimeGags {
    constructor(gags) {
        this.gags = gags;
        this.timers = new TimerBag();
        this.wasRunning = false;
        this.lastMessageAt = 0;
    }

    start() {
        this.stop();
        this.timers.setInterval(() => this.tick(), TICK_MS);
        this.tick();
    }

    stop() {
        this.timers.clearAll();
        this.gags?.stopAmbient?.();
        this.removeStatusLine();
        this.wasRunning = false;
    }

    tick() {
        const settings = config();
        if (!settings.enabled) {
            this.stop();
            return;
        }

        const running = runtimeSnapshot()?.state === "running";

        if (running && !this.wasRunning) {
            this.wasRunning = true;
            if (settings.runtime_gags) this.gags?.startAmbient?.("runtime");
        } else if (!running && this.wasRunning) {
            this.wasRunning = false;
            this.gags?.stopAmbient?.();
            this.removeStatusLine();
        }

        if (running && settings.funny_status_messages) {
            this.syncStatusLine();
        } else {
            this.removeStatusLine();
        }
    }

    /** Keep our own status line alive across upstream dashboard re-renders. */
    syncStatusLine() {
        const anchor = document.querySelector("#view-dashboard .runtime-note");
        if (!anchor) return;

        let line = document.querySelector(`#view-dashboard .${STATUS_CLASS}`);
        if (!line) {
            line = document.createElement("p");
            line.className = STATUS_CLASS;
            line.setAttribute("aria-live", "polite");
            anchor.insertAdjacentElement("afterend", line);
            this.lastMessageAt = 0;
        }

        const now = Date.now();
        if (now - this.lastMessageAt < MESSAGE_ROTATION_MS) return;
        this.lastMessageAt = now;
        line.textContent = pick(content().runtime_status_messages) || "Thinking really hard...";
    }

    removeStatusLine() {
        document.querySelectorAll(`.${STATUS_CLASS}`).forEach((node) => node.remove());
    }
}
