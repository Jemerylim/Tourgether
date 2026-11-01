const COLOURS = ["#F6C453", "#E4761B", "#0A7C84", "#6B0A44", "#A9D9D6", "#0F4C57"];

// A short burst of paper confetti from the middle of the screen, for the happy moments
// (a new trip, a poll winner). The pieces live on <body>, so the burst carries on across
// a route change, and it's skipped for visitors who prefer reduced motion.
export const fireConfetti = ({ count = 56 } = {}) => {
  if (typeof document === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999";

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    const size = 6 + Math.random() * 8;
    piece.style.cssText = `position:absolute;left:50%;top:40%;width:${size}px;height:${size * 0.55}px;background:${
      COLOURS[i % COLOURS.length]
    };border-radius:${Math.random() > 0.6 ? "50%" : "2px"}`;
    layer.appendChild(piece);

    const angle = (Math.random() * 140 + 20) * (Math.PI / 180); // fan upwards
    const speed = 220 + Math.random() * 360;
    const dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    const rise = Math.sin(angle) * speed;
    piece.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px,${-rise}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px,${window.innerHeight * 0.5}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 1500 + Math.random() * 700, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" }
    );
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2400);
};
