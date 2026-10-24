(function () {
  "use strict";
  const scene = document.getElementById("bookAnimationScene");
  if (!scene) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let frame = 0;

  function applyMotionPreference() {
    scene.classList.toggle("is-animated", !reduceMotion.matches && !document.hidden);
    scene.classList.toggle("is-static", reduceMotion.matches);
    if (reduceMotion.matches || !finePointer.matches) {
      scene.style.removeProperty("--pointer-x");
      scene.style.removeProperty("--pointer-y");
    }
  }

  applyMotionPreference();
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", applyMotionPreference);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(applyMotionPreference);
  }

  document.addEventListener("visibilitychange", applyMotionPreference);

  if (finePointer.matches && !reduceMotion.matches) {
    scene.addEventListener("pointermove", function (event) {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        const bounds = scene.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        scene.style.setProperty("--pointer-x", (x * 3).toFixed(2) + "deg");
        scene.style.setProperty("--pointer-y", (y * -3).toFixed(2) + "deg");
        frame = 0;
      });
    }, { passive: true });

    scene.addEventListener("pointerleave", function () {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      scene.style.setProperty("--pointer-x", "0deg");
      scene.style.setProperty("--pointer-y", "0deg");
    }, { passive: true });
  }
})();