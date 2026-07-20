/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Reusable presentation helpers shared by every screen: toasts, modal
 * shell, skeleton generators, ripple micro-interaction, empty/error states,
 * and the ambient particle canvas.
 * ---------------------------------------------------------------------------
 */

const UI = (() => {
  // ---- toast ---------------------------------------------------------------
  let toastTimer = null;
  function toast(message, tone = "default") {
    const el = document.getElementById("toast");
    const icon = el.querySelector(".toast-icon");
    const msg = el.querySelector(".toast-msg");
    msg.textContent = message;
    el.dataset.tone = tone;
    icon.textContent = tone === "success" ? "✓" : tone === "error" ? "!" : "✦";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---- modal shell -----------------------------------------------------
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    document.body.classList.add("modal-lock");
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    if (!document.querySelector(".modal.open")) document.body.classList.remove("modal-lock");
  }

  // ---- skeletons -------------------------------------------------------
  function skeletonCards(count = 4, variant = "batch") {
    return Array.from({ length: count })
      .map(
        () => `
      <div class="skeleton-card skeleton-card--${variant}">
        <div class="sk sk-media"></div>
        <div class="sk sk-line" style="width:78%"></div>
        <div class="sk sk-line" style="width:45%"></div>
      </div>`
      )
      .join("");
  }

  function skeletonRows(count = 5) {
    return Array.from({ length: count })
      .map(
        () => `
      <div class="skeleton-row">
        <div class="sk sk-icon"></div>
        <div class="sk sk-line" style="width:60%"></div>
      </div>`
      )
      .join("");
  }

  // ---- empty / error states ---------------------------------------------
  function emptyState({ glyph = "◇", title, hint }) {
    return `
      <div class="state-block" role="status">
        <div class="state-glyph">${glyph}</div>
        <p class="state-title">${title}</p>
        ${hint ? `<p class="state-hint">${hint}</p>` : ""}
      </div>`;
  }

  function errorState({ title = "Couldn't load this", hint = "Check your connection and try again.", retryLabel = "Retry", onRetryAttr = "" }) {
    return `
      <div class="state-block state-block--error" role="alert">
        <div class="state-glyph">!</div>
        <p class="state-title">${title}</p>
        <p class="state-hint">${hint}</p>
        <button class="btn-retry" ${onRetryAttr}>${retryLabel}</button>
      </div>`;
  }

  // ---- ripple ------------------------------------------------------------
  function attachRipple(root = document) {
    root.addEventListener("pointerdown", (e) => {
      const target = e.target.closest(".rippleable");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  }

  // ---- lazy images ---------------------------------------------------------
  let imgObserver = null;
  function lazyObserve(root = document) {
    if (!imgObserver) {
      imgObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
            imgObserver.unobserve(img);
          });
        },
        { rootMargin: "120px" }
      );
    }
    root.querySelectorAll("img[data-src]").forEach((img) => imgObserver.observe(img));
  }

  // ---- ambient particle field ---------------------------------------------
  function initParticles(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    }

    function seed() {
      const count = Math.min(36, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (0.6 + Math.random() * 1.6) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
        hue: Math.random() > 0.5 ? "79,124,255" : "139,92,246",
        a: 0.15 + Math.random() * 0.35,
      }));
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},${p.a})`;
        ctx.fill();
      });
      if (!reduceMotion) requestAnimationFrame(tick);
    }

    resize();
    seed();
    tick();
    window.addEventListener("resize", () => {
      resize();
      seed();
    });
  }

  return { toast, openModal, closeModal, skeletonCards, skeletonRows, emptyState, errorState, attachRipple, lazyObserve, initParticles };
})();
