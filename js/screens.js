/**
 * screens.js
 * ---------------------------------------------------------------------------
 * Pure(ish) view layer. Each *Screen() factory returns { id, html, onMount }
 * for Router to mount. Small render* helpers below are reused across screens
 * so a batch card, a list row, etc. only has one implementation each.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Shared fragment renderers
// ---------------------------------------------------------------------------

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function renderBatchCard(b) {
  const fav = Store.isFavorite(b.id);
  return `
    <article class="batch-card rippleable" data-batch-open="${b.id}">
      <div class="batch-media">
        <img data-src="${b.thumbnail}" alt="" class="lazy-img" />
        <span class="media-fade"></span>
        <button class="fav-btn rippleable ${fav ? "is-fav" : ""}" data-fav-toggle="${b.id}" aria-pressed="${fav}" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z"/></svg>
        </button>
        <span class="track-chip">${b.track}</span>
      </div>
      <div class="batch-body">
        <h3 class="batch-title">${b.title}</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${b.progress}%"></div></div>
        <div class="batch-meta"><span>${b.subjectsCount} subjects</span><span>${b.progress}% complete</span></div>
      </div>
    </article>`;
}

function renderContinueCard(c) {
  return `
    <button class="cw-card rippleable" data-cw-open="${c.contentId}" style="--pct:${c.progressPct || 0}">
      <span class="cw-ring">
        <img data-src="${c.thumbnail}" class="lazy-img" alt="" />
      </span>
      <span class="cw-title">${c.title}</span>
    </button>`;
}

function renderRecentChip(r) {
  return `
    <button class="recent-chip rippleable" data-batch-open="${r.batchId}">
      <img data-src="${r.thumbnail}" class="lazy-img" alt="" />
      <span>${r.title}</span>
    </button>`;
}

function renderListRow({ id, title, sub, action }) {
  return `
    <button class="list-row rippleable" data-${action}="${id}">
      <span class="row-icon">◆</span>
      <span class="row-text">
        <span class="row-title">${title}</span>
        <span class="row-sub">${sub}</span>
      </span>
      <svg class="row-chevron" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
    </button>`;
}

function renderContentRow(item) {
  if (item.type === "video") {
    return `
      <button class="content-row rippleable" data-video-open="${item.id}">
        <span class="content-icon content-icon--video">▶</span>
        <span class="row-text">
          <span class="row-title">${item.title}</span>
          <span class="row-sub">${fmtDuration(item.durationSec)} · Video</span>
        </span>
        <svg class="row-chevron" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
      </button>`;
  }
  return `
    <button class="content-row rippleable" data-pdf-open="${item.id}">
      <span class="content-icon content-icon--pdf">▤</span>
      <span class="row-text">
        <span class="row-title">${item.title}</span>
        <span class="row-sub">${item.pages} pages · Notes</span>
      </span>
      <svg class="row-chevron" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
    </button>`;
}

function headerBar({ title, sub = "", back = true }) {
  return `
    <div class="screen-header">
      ${back ? `<button class="back-btn rippleable" data-go-back aria-label="Go back">
        <svg viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18"/></svg>
      </button>` : ""}
      <div class="screen-header-text">
        <h2>${title}</h2>
        ${sub ? `<p class="dim">${sub}</p>` : ""}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Root screens (swapped by bottom nav, not stacked)
// ---------------------------------------------------------------------------

function HomeScreen() {
  const name = Store.state.profile?.name?.split(" ")[0] || "there";
  return {
    id: "home",
    html: `
      <div class="pull-indicator" id="pull-indicator"><span class="pull-spinner"></span></div>
      <div class="screen-inner" id="home-scroll">
        <div class="home-hero">
          <p class="eyebrow">Welcome back</p>
          <h1>Hey, ${name} <span class="wave">👋</span></h1>
        </div>

        <section class="home-section" id="section-continue" hidden>
          <div class="section-head"><h3>Continue watching</h3></div>
          <div class="hscroll" id="continue-list"></div>
        </section>

        <section class="home-section" id="section-recent" hidden>
          <div class="section-head"><h3>Recently opened</h3></div>
          <div class="hscroll hscroll--chips" id="recent-list"></div>
        </section>

        <section class="home-section">
          <div class="section-head">
            <h3>Batches</h3>
            <span class="pill-count" id="batch-count">—</span>
          </div>
          <div class="filter-chips" id="track-filters">
            ${["All", "JEE", "NEET", "CUET"].map((t) => `<button class="chip rippleable ${t === "All" ? "chip--active" : ""}" data-track="${t}">${t}</button>`).join("")}
          </div>
          <div class="batch-grid" id="batch-grid">${UI.skeletonCards(6)}</div>
        </section>
      </div>`,
    onMount(root) {
      mountHome(root);
    },
  };
}

function FavoritesScreen() {
  return {
    id: "favorites",
    html: `
      <div class="screen-inner">
        ${headerBar({ title: "Favorites", sub: "Batches you've bookmarked", back: false })}
        <div class="batch-grid" id="fav-grid"></div>
      </div>`,
    onMount(root) {
      renderFavGrid(root);
      Store.on("favorites", () => renderFavGrid(root));
    },
  };
}

function renderFavGrid(root) {
  const grid = root.querySelector("#fav-grid");
  const favs = MOCK.batches.filter((b) => Store.isFavorite(b.id));
  grid.innerHTML = favs.length
    ? favs.map(renderBatchCard).join("")
    : UI.emptyState({ glyph: "♡", title: "No favorites yet", hint: "Tap the heart on any batch to save it here." });
  UI.lazyObserve(grid);
}

function ProfileScreen() {
  const p = Store.state.profile || { name: "Student", avatarSeed: "lumen" };
  return {
    id: "profile",
    html: `
      <div class="screen-inner">
        ${headerBar({ title: "Profile", back: false })}
        <div class="profile-card">
          <img class="profile-avatar" src="https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(p.avatarSeed || p.name)}" alt="" />
          <h2>${p.name}</h2>
          <p class="dim">Studying on LUMEN</p>
          <div class="profile-stats">
            <div><strong>${Store.state.favorites.length}</strong><span>Favorites</span></div>
            <div><strong>${Store.state.continueWatching.length}</strong><span>In progress</span></div>
            <div><strong>${Store.state.recentlyOpened.length}</strong><span>Recent</span></div>
          </div>
        </div>

        <div class="settings-list">
          <button class="list-row rippleable" id="btn-edit-profile">
            <span class="row-icon">✎</span>
            <span class="row-text"><span class="row-title">Edit profile</span><span class="row-sub">Change your display name</span></span>
            <svg class="row-chevron" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
          <div class="list-row list-row--static">
            <span class="row-icon">◐</span>
            <span class="row-text"><span class="row-title">Accent theme</span><span class="row-sub">Pick the glow that fits your mood</span></span>
          </div>
          <div class="theme-swatches" id="theme-swatches">
            ${["aurora", "nebula", "ion"].map((t) => `<button class="swatch swatch--${t} rippleable ${Store.state.theme === t ? "swatch--active" : ""}" data-theme="${t}" aria-label="${t} theme"></button>`).join("")}
          </div>
          <button class="list-row rippleable" id="btn-reset-data">
            <span class="row-icon">⟲</span>
            <span class="row-text"><span class="row-title" style="color:var(--danger)">Reset local data</span><span class="row-sub">Clears favorites, progress & profile</span></span>
          </button>
        </div>
        <p class="footnote">LUMEN template · all data stored on-device · connect your own backend in js/config.js</p>
      </div>`,
    onMount(root) {
      root.querySelector("#btn-edit-profile").addEventListener("click", () => {
        document.getElementById("edit-name").value = Store.state.profile?.name || "";
        UI.openModal("modal-edit-profile");
      });
      root.querySelector("#theme-swatches").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-theme]");
        if (!btn) return;
        Store.setTheme(btn.dataset.theme);
        applyTheme(btn.dataset.theme);
        root.querySelectorAll(".swatch").forEach((s) => s.classList.remove("swatch--active"));
        btn.classList.add("swatch--active");
      });
      root.querySelector("#btn-reset-data").addEventListener("click", () => {
        if (confirm("Reset all local data? This can't be undone.")) {
          localStorage.clear();
          location.reload();
        }
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Drill-down screens (pushed onto the stack)
// ---------------------------------------------------------------------------

function SubjectsScreen(batch) {
  return {
    id: "subjects",
    html: `
      <div class="screen-inner">
        ${headerBar({ title: batch.title, sub: `${batch.track} · ${batch.subjectsCount} subjects` })}
        <div class="list-col" id="subjects-list">${UI.skeletonRows(4)}</div>
      </div>`,
    async onMount(root) {
      const list = root.querySelector("#subjects-list");
      try {
        const subjects = await Api.getSubjects(batch.id);
        if (!subjects.length) {
          list.innerHTML = UI.emptyState({ title: "No subjects yet", hint: "Check back once this batch is populated." });
          return;
        }
        list.innerHTML = subjects
          .map((s) => renderListRow({ id: s.id, title: s.title, sub: `${s.topicsCount} topics`, action: "row-subject" }))
          .join("");
        list.addEventListener("click", (e) => {
          const row = e.target.closest("[data-row-subject]");
          if (!row) return;
          const subject = subjects.find((s) => s.id === row.dataset.rowSubject);
          Router.push(TopicsScreen(batch, subject));
        });
      } catch (err) {
        list.innerHTML = UI.errorState({ onRetryAttr: `data-retry-subjects="${batch.id}"` });
        list.querySelector(".btn-retry").addEventListener("click", () => root.dispatchEvent(new CustomEvent("noop")) || SubjectsScreen(batch).onMount(root));
      }
    },
  };
}

function TopicsScreen(batch, subject) {
  return {
    id: "topics",
    html: `
      <div class="screen-inner">
        ${headerBar({ title: subject.title, sub: batch.title })}
        <div class="list-col" id="topics-list">${UI.skeletonRows(4)}</div>
      </div>`,
    async onMount(root) {
      const list = root.querySelector("#topics-list");
      try {
        const topics = await Api.getTopics(batch.id, subject.id);
        if (!topics.length) {
          list.innerHTML = UI.emptyState({ title: "No topics yet" });
          return;
        }
        list.innerHTML = topics
          .map((t) => renderListRow({ id: t.id, title: t.title, sub: "Video & notes", action: "row-topic" }))
          .join("");
        list.addEventListener("click", (e) => {
          const row = e.target.closest("[data-row-topic]");
          if (!row) return;
          const topic = topics.find((t) => t.id === row.dataset.rowTopic);
          Router.push(ContentScreen(batch, subject, topic));
        });
      } catch {
        list.innerHTML = UI.errorState({});
      }
    },
  };
}

function ContentScreen(batch, subject, topic) {
  return {
    id: "content",
    html: `
      <div class="screen-inner">
        ${headerBar({ title: topic.title, sub: `${subject.title} · ${batch.title}` })}
        <div class="tab-switch" id="content-tabs">
          <button class="tab-btn tab-btn--active rippleable" data-type="video">Video</button>
          <button class="tab-btn rippleable" data-type="pdf">Notes (PDF)</button>
        </div>
        <div class="list-col" id="content-list">${UI.skeletonRows(3)}</div>
      </div>`,
    async onMount(root) {
      const list = root.querySelector("#content-list");
      const tabs = root.querySelector("#content-tabs");
      let items = [];
      let activeType = "video";

      function paint() {
        const filtered = items.filter((i) => i.type === activeType);
        list.innerHTML = filtered.length
          ? filtered.map(renderContentRow).join("")
          : UI.emptyState({ glyph: activeType === "video" ? "▶" : "▤", title: `No ${activeType === "video" ? "videos" : "notes"} here` });
      }

      tabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;
        activeType = btn.dataset.type;
        tabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("tab-btn--active", b === btn));
        paint();
      });

      list.addEventListener("click", (e) => {
        const v = e.target.closest("[data-video-open]");
        const p = e.target.closest("[data-pdf-open]");
        if (v) openVideoFlow(items.find((i) => i.id === v.dataset.videoOpen), { batch, subject, topic });
        if (p) openPdfFlow(items.find((i) => i.id === p.dataset.pdfOpen));
      });

      try {
        items = await Api.getContent(batch.id, subject.id, topic.id);
        paint();
      } catch {
        list.innerHTML = UI.errorState({});
      }
    },
  };
}
