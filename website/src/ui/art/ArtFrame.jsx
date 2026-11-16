/* ==========================================================================
   ArtFrame: the shared wrapper every illustration in this folder uses.
   - One drawing space (420 x 300), so every illustration scales to any width: set the width
     with a normal class (for example "w-32 sm:w-48 lg:w-72") and the height follows.
   - Colours come only from your theme classes (text, bg, surface, accent...), so light and dark
     both work with no extra code.
   - The shared animation helpers (floating, bobbing, pulsing, twinkling) live in ART_CSS below.
   - Reduced motion: all animation is switched off and you see the finished picture.
   - decorative: pass true when the page already says what the picture shows (it is then hidden
     from screen readers). Leave it false for pictures that carry the message, like the 404.
   ========================================================================== */

const ART_CSS = `
.ar-box { transform-box: fill-box; transform-origin: 50% 50%; }
.ar-float { animation: ar-float 3.6s ease-in-out infinite; }
.ar-bob { animation: ar-bob 1.8s ease-in-out infinite; }
.ar-pulse { animation: ar-pulse 2.4s ease-in-out infinite; }
.ar-twinkle { animation: ar-twinkle 2.6s ease-in-out infinite; }
.ar-flow { animation: ar-flow 1.2s linear infinite; }
.ar-sway { animation: ar-sway 4s ease-in-out infinite; }
.ar-ping { animation: ar-ping 2.6s ease-out infinite; }
@keyframes ar-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes ar-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@keyframes ar-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes ar-twinkle { 0%, 100% { transform: scale(0.35) rotate(0deg); opacity: 0.2; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
@keyframes ar-flow { to { stroke-dashoffset: -26; } }
@keyframes ar-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
@keyframes ar-ping { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ar-root * { animation: none !important; } }
`;

export default function ArtFrame({ label, css = "", className = "", decorative = false, children }) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label };

  return (
    <svg
      viewBox="0 0 420 300"
      className={`ar-root block ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y}
    >
      <style>{`${ART_CSS}\n${css}`}</style>
      {children}
    </svg>
  );
}
