/**
 * TrollPyla - sprite registry.
 *
 * All artwork lives as plain SVG in `static/troll-assets/` so it is served by the
 * existing Flask static route, stays diff-friendly, and costs a few hundred bytes
 * each. Adding a sprite means dropping an SVG in that folder and adding one line
 * here.
 */

const BASE = "/static/troll-assets";

export const SPRITES = {
    cat: { src: `${BASE}/cat.svg`, width: 130, alt: "A cat" },
    catSleep: { src: `${BASE}/cat-sleep.svg`, width: 130, alt: "A sleeping cat" },
    duck: { src: `${BASE}/duck.svg`, width: 76, alt: "A duck" },
    toaster: { src: `${BASE}/toaster.svg`, width: 112, alt: "A flying toaster" },
    dino: { src: `${BASE}/dino.svg`, width: 118, alt: "A dinosaur" },
    ufo: { src: `${BASE}/ufo.svg`, width: 136, alt: "A UFO" },
    banana: { src: `${BASE}/banana.svg`, width: 74, alt: "A dancing banana" },
    penguin: { src: `${BASE}/penguin.svg`, width: 74, alt: "A confused penguin" },
    paw: { src: `${BASE}/paw.svg`, width: 30, alt: "" },
    toast: { src: `${BASE}/toast.svg`, width: 100, alt: "Flying toast" },
    goblin: { src: `${BASE}/goblin.svg`, width: 68, alt: "A goblin" },
};

/**
 * Build a decorative sprite element.
 * Sprites are always `aria-hidden` when they carry no meaning, and always live
 * inside the pointer-events:none gag layer, so they can never block the UI or
 * confuse a screen reader.
 */
export function spriteElement(name, { scale = 1, className = "" } = {}) {
    const sprite = SPRITES[name];
    if (!sprite) return null;

    const wrapper = document.createElement("div");
    wrapper.className = `troll-sprite ${className}`.trim();
    wrapper.style.width = `${Math.round(sprite.width * scale)}px`;
    wrapper.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = sprite.src;
    image.alt = "";
    image.draggable = false;
    wrapper.appendChild(image);

    return wrapper;
}
