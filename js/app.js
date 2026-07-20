/**
 * app.js
 * ---------------------------------------------------------------------------
 * Boot sequence + the bits of logic that don't belong to a single screen:
 * onboarding, bottom-nav tab switching, global search, video/PDF flows,
 * modal wiring, theme application, pull-to-refresh, and SW registration.
 * ---------------------------------------------------------------------------
 */

const AVATAR_SEEDS = ["Nova", "Orbit", "Halo", "Lyra", "Vega", "Ion"];

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  applyTheme(Store.state.theme);
  UI.attachRipple(document);
  registerModalClosers();
  registerServiceWorker();

  const hasProfile = !!Store.state.profile;
  setTimeout(() => {
    document.getElementById("splash").classList.add("splash--hide");
    setTimeout(() => {
      document.getElementById("splash").remove();
      if (hasProfile) enterApp();
      else showOnboarding();
    }, 480);
  }, 1400);
}

function showOnboarding() {
  const el = document.getElementById("onboarding");
  el.hidden = false;
  const pick = document.getElementById("avatar-pick");
  pick.innerHTML = AVATAR_SEEDS.map(
    (seed, i) => `
    <button class="avatar-opt rippleable ${i === 0 ? "avatar-opt--active" : ""}" data-seed="${seed}" role="radio" aria-checked="${i === 0}">
      <img src="https://api.dicebear.com/7.x/shapes/svg?seed=${seed}" alt="${seed} avatar" />
    </button>`
  ).join("");
  let selectedSeed = AVATAR_SEEDS[0];
  pick.addEventListener("click", (e) => {
    const btn = e.target.closest(".avatar-opt");
    if (!btn) return;
    selectedSeed = btn.dataset.seed;
    pick.querySelectorAll(".avatar-opt").forEach((b) => b.classList.remove("avatar-opt--active"));
    btn.classList.add("avatar-opt--active");
  });

  document.getElementById("onboarding-submit").addEventListener("click", () => {
    const nameInput = document.getElementById("onboarding-name");
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      nameInput.classList.add("field-error");
      UI.toast("Tell us what to call you", "error");
      return;
    }
    Store.setProfile({ name, avatarSeed: selectedSeed });
    el.hidden = true;
    enterApp();
  });
}

function enterApp() {
  document.getElementById("app").hidden = false;
  updateTopbarAvatar();
  UI.initParticles("particles");
  Router.reset(HomeScreen());
  setActiveTab("home");
  wireGlobalChrome();
}

function updateTopbarAvatar() {
  const p = Store.state.profile;
  document.getElementById("topbar-avatar").src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(p?.avatarSeed || p?.name || "lumen")}`;
}

// ---------------------------------------------------------------------------
// Bottom nav (root-level tab switching, distinct from drill-down push/pop)
// ---------------------------------------------------------------------------
function setActiveTab(tab) {
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  const glow = document.getElementById("nav-glow");
  const activeBtn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (glow && activeBtn) glow.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

function wireGlobalChrome() {
  document.querySelector(".bottom-nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    const tab = btn.dataset.tab;
    setActiveTab(tab);
    if (tab === "home") Router.reset(HomeScreen());
    if (tab === "favorites") Router.reset(FavoritesScreen());
    if (tab === "profile") Router.reset(ProfileScreen());
  });

  document.getElementById("screen-stack").addEventListener("click", (e) => {
    if (e.target.closest("[data-go-back]")) history.back();
  });

  // Profile shortcut from top bar
  document.getElementById("btn-open-profile").addEventListener("click", () => {
    setActiveTab("profile");
    Router.reset(ProfileScreen());
  });

  // Save edited profile
  document.getElementById("edit-save-btn").addEventListener("click", () => {
    const name = document.getElementById("edit-name").value.trim();
    if (!name) return UI.toast("Name can't be empty", "error");
    Store.setProfile({ ...Store.state.profile, name });
    updateTopbarAvatar();
    UI.closeModal("modal-edit-profile");
    UI.toast("Profile updated", "success");
    if (document.querySelector('.screen[data-screen="profile"]')) Router.reset(ProfileScreen());
  });

  wireSearch();
}

function registerModalClosers() {
  document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close-modal]");
    if (closer) UI.closeModal(closer.dataset.closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".modal.open").forEach((m) => UI.closeModal(m.id));
  });
}

// ---------------------------------------------------------------------------
// Home screen mounting: batches, continue watching, recents, filters, PTR
// ---------------------------------------------------------------------------
async function mountHome(root) {
  paintContinueWatching(root);
  paintRecentlyOpened(root);
  Store.on("continueWatching", () => paintContinueWatching(root));
  Store.on("recentlyOpened", () => paintRecentlyOpened(root));

  let allBatches = [];
  let activeTrack = "All";

  function paintBatches() {
    const grid = root.querySelector("#batch-grid");
    const filtered = activeTrack === "All" ? allBatches : allBatches.filter((b) => b.track === activeTrack);
    root.querySelector("#batch-count").textContent = filtered.length;
    grid.innerHTML = filtered.length
      ? filtered.map(renderBatchCard).join("")
      : UI.emptyState({ glyph: "◇", title: "No batches match", hint: "Try a different filter." });
    UI.lazyObserve(grid);
  }

  async function loadBatches() {
    const grid = root.querySelector("#batch-grid");
    grid.innerHTML = UI.skeletonCards(6);
    try {
      allBatches = await Api.getBatches();
      paintBatches();
    } catch {
      grid.innerHTML = UI.errorState({});
      grid.querySelector(".btn-retry")?.addEventListener("click", loadBatches);
    }
  }

  root.querySelector("#track-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeTrack = chip.dataset.track;
    root.querySelectorAll(".chip").forEach((c) => c.classList.toggle("chip--active", c === chip));
    paintBatches();
  });

  root.addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav-toggle]");
    if (favBtn) {
      const nowFav = Store.toggleFavorite(favBtn.dataset.favToggle);
      UI.toast(nowFav ? "Added to favorites" : "Removed from favorites", "success");
      paintBatches();
      return;
    }
    const cardOpen = e.target.closest("[data-batch-open]");
    if (cardOpen) {
      const batch = allBatches.find((b) => b.id === cardOpen.dataset.batchOpen) || MOCK.batches.find((b) => b.id === cardOpen.dataset.batchOpen);
      if (batch) openBatch(batch);
      return;
    }
    const cwOpen = e.target.closest("[data-cw-open]");
    if (cwOpen) {
      const entry = Store.state.continueWatching.find((c) => c.contentId === cwOpen.dataset.cwOpen);
      if (entry) resumeFromContinueWatching(entry);
    }
  });

  await loadBatches();
  setupPullToRefresh(root.querySelector("#home-scroll"), loadBatches);
}

function paintContinueWatching(root) {
  const section = root.querySelector("#section-continue");
  const list = root.querySelector("#continue-list");
  if (!section) return;
  const items = Store.state.continueWatching;
  section.hidden = items.length === 0;
  list.innerHTML = items.map(renderContinueCard).join("");
  UI.lazyObserve(list);
}

function paintRecentlyOpened(root) {
  const section = root.querySelector("#section-recent");
  const list = root.querySelector("#recent-list");
  if (!section) return;
  const items = Store.state.recentlyOpened;
  section.hidden = items.length === 0;
  list.innerHTML = items.map(renderRecentChip).join("");
  UI.lazyObserve(list);
}

function openBatch(batch) {
  Store.pushRecentlyOpened(batch);
  Router.push(SubjectsScreen(batch));
}

function resumeFromContinueWatching(entry) {
  const batch = MOCK.batches.find((b) => b.id === entry.batchId);
  const subject = MOCK.subjects[entry.batchId]?.find((s) => s.id === entry.subjectId);
  const topic = MOCK.topics[entry.subjectId]?.find((t) => t.id === entry.topicId);
  if (batch) Router.push(SubjectsScreen(batch));
  if (batch && subject) Router.push(TopicsScreen(batch, subject));
  if (batch && subject && topic) Router.push(ContentScreen(batch, subject, topic));
}

// ---------------------------------------------------------------------------
// Pull-to-refresh (touch-driven, no library)
// ---------------------------------------------------------------------------
function setupPullToRefresh(scrollEl, onRefresh) {
  if (!scrollEl) return;
  const indicator = document.getElementById("pull-indicator");
  let startY = 0, pulling = false, triggered = false;

  scrollEl.addEventListener("touchstart", (e) => {
    if (scrollEl.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      pulling = true;
      triggered = false;
    }
  }, { passive: true });

  scrollEl.addEventListener("touchmove", (e) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0 && scrollEl.scrollTop <= 0) {
      const pull = Math.min(delta * 0.5, 90);
      indicator.style.transform = `translateY(${pull}px)`;
      indicator.style.opacity = Math.min(pull / 60, 1);
      triggered = pull > 60;
    }
  }, { passive: true });

  scrollEl.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    if (triggered) {
      indicator.classList.add("pull-indicator--spin");
      await onRefresh();
      UI.toast("Refreshed", "success");
      indicator.classList.remove("pull-indicator--spin");
    }
    indicator.style.transform = "translateY(0)";
    indicator.style.opacity = 0;
  });
}

// ---------------------------------------------------------------------------
// Global search overlay
// ---------------------------------------------------------------------------
function wireSearch() {
  const panel = document.getElementById("search-panel");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  let debounceTimer;

  document.getElementById("btn-open-search").addEventListener("click", () => {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(() => input.focus(), 260);
  });

  document.getElementById("btn-close-search").addEventListener("click", closeSearch);
  function closeSearch() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    input.value = "";
    results.innerHTML = "";
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML = UI.skeletonRows(3);
    debounceTimer = setTimeout(async () => {
      try {
        const { batches, content } = await Api.search(q);
        if (!batches.length && !content.length) {
          results.innerHTML = UI.emptyState({ glyph: "∅", title: "Nothing found", hint: `No matches for “${q}”.` });
          return;
        }
        results.innerHTML = `
          ${batches.length ? `<p class="results-label">Batches</p>${batches.map((b) => renderListRow({ id: b.id, title: b.title, sub: b.track, action: "search-batch" })).join("")}` : ""}
          ${content.length ? `<p class="results-label">Videos & notes</p>${content.map((c) => renderListRow({ id: c.id, title: c.title, sub: c.type === "video" ? "Video" : "Notes", action: "search-content" })).join("")}` : ""}
        `;
      } catch {
        results.innerHTML = UI.errorState({ title: "Search failed" });
      }
    }, 320);
  });

  results.addEventListener("click", (e) => {
    const b = e.target.closest("[data-search-batch]");
    const c = e.target.closest("[data-search-content]");
    if (b) {
      const batch = MOCK.batches.find((x) => x.id === b.dataset.searchBatch);
      closeSearch();
      setActiveTab("home");
      Router.reset(HomeScreen());
      if (batch) openBatch(batch);
    }
    if (c) {
      const item = Object.values(MOCK.content).flat().find((x) => x.id === c.dataset.searchContent);
      if (!item) return;
      const batch = MOCK.batches.find((x) => x.id === item.batchId);
      const subject = MOCK.subjects[item.batchId]?.find((s) => s.id === item.subjectId);
      const topic = MOCK.topics[item.subjectId]?.find((t) => t.id === item.topicId);
      closeSearch();
      setActiveTab("home");
      Router.reset(HomeScreen());
      if (batch) openBatch(batch);
      if (batch && subject) Router.push(TopicsScreen(batch, subject));
      if (batch && subject && topic) Router.push(ContentScreen(batch, subject, topic));
      if (item.type === "video") setTimeout(() => openVideoFlow(item, { batch, subject, topic }), 350);
      else setTimeout(() => openPdfFlow(item), 350);
    }
  });
}

// ---------------------------------------------------------------------------
// Video flow: quality picker -> mock player -> continue-watching tracking
// ---------------------------------------------------------------------------
const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];

function openVideoFlow(item, ctx) {
  if (!item) return;
  document.getElementById("quality-title").textContent = item.title;
  document.getElementById("quality-grid").innerHTML = QUALITIES.map(
    (q, i) => `<button class="quality-opt rippleable ${i === 0 ? "quality-opt--active" : ""}" data-quality="${q}">${q}</button>`
  ).join("");
  document.getElementById("quality-grid").onclick = (e) => {
    const btn = e.target.closest(".quality-opt");
    if (!btn) return;
    UI.closeModal("modal-quality");
    playMock(item, ctx, btn.dataset.quality);
  };
  UI.openModal("modal-quality");
}

function playMock(item, ctx, quality) {
  UI.openModal("modal-player");
  document.getElementById("player-title").textContent = item.title;
  document.getElementById("player-status").textContent = `Streaming at ${quality} · demo playback`;
  const fill = document.getElementById("player-progress-fill");
  fill.style.width = "0%";

  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(100, pct + 4);
    fill.style.width = pct + "%";
    Store.updateContinueWatching({
      contentId: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      progressPct: pct,
      batchId: ctx.batch.id,
      subjectId: ctx.subject.id,
      topicId: ctx.topic.id,
    });
    if (pct >= 100) {
      clearInterval(timer);
      document.getElementById("player-status").textContent = "Finished · nice work";
    }
  }, 220);

  document.getElementById("modal-player").addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-close-modal]")) clearInterval(timer);
    },
    { once: true }
  );
}

function openPdfFlow(item) {
  if (!item) return;
  document.getElementById("pdf-title").textContent = item.title;
  document.getElementById("pdf-meta").textContent = `${item.pages} pages · Notes`;
  document.getElementById("pdf-open-btn").onclick = () => {
    UI.toast("Connect your PDF endpoint in config.js to open real files", "default");
  };
  UI.openModal("modal-pdf");
}

// ---------------------------------------------------------------------------
// PWA
// ---------------------------------------------------------------------------
function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

document.addEventListener("DOMContentLoaded", boot);
