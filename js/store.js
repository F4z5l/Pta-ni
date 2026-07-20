/**
 * store.js
 * ---------------------------------------------------------------------------
 * Tiny state layer: safe localStorage read/write + a pub-sub so any screen
 * can react to state changes (e.g. header re-renders when profile changes)
 * without screens reaching into each other's DOM.
 * ---------------------------------------------------------------------------
 */

const Store = (() => {
  const listeners = new Map(); // key -> Set<fn>

  function k(key) {
    return `${CONFIG.STORAGE_PREFIX}${key}`;
  }

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(k(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(k(key), JSON.stringify(value));
      return true;
    } catch {
      // Storage disabled/full (common in some in-app/file:// webviews).
      // The app should keep working in-memory for the session.
      return false;
    }
  }

  function emit(key, value) {
    (listeners.get(key) || new Set()).forEach((fn) => fn(value));
  }

  function on(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  }

  // ---- domain state -------------------------------------------------------
  const state = {
    profile: safeGet("profile", null),
    favorites: safeGet("favorites", []), // array of batch IDs
    continueWatching: safeGet("continueWatching", []), // [{contentId, title, thumbnail, progressPct, updatedAt, batchId, subjectId, topicId}]
    recentlyOpened: safeGet("recentlyOpened", []), // [{batchId, title, thumbnail, openedAt}]
    theme: safeGet("theme", "aurora"), // accent theme, always dark-base
  };

  function setProfile(profile) {
    state.profile = profile;
    safeSet("profile", profile);
    emit("profile", profile);
  }

  function toggleFavorite(batchId) {
    const has = state.favorites.includes(batchId);
    state.favorites = has ? state.favorites.filter((id) => id !== batchId) : [...state.favorites, batchId];
    safeSet("favorites", state.favorites);
    emit("favorites", state.favorites);
    return !has;
  }

  function isFavorite(batchId) {
    return state.favorites.includes(batchId);
  }

  function pushRecentlyOpened(batch) {
    state.recentlyOpened = [
      { batchId: batch.id, title: batch.title, thumbnail: batch.thumbnail, openedAt: Date.now() },
      ...state.recentlyOpened.filter((r) => r.batchId !== batch.id),
    ].slice(0, 10);
    safeSet("recentlyOpened", state.recentlyOpened);
    emit("recentlyOpened", state.recentlyOpened);
  }

  function updateContinueWatching(entry) {
    state.continueWatching = [
      { ...entry, updatedAt: Date.now() },
      ...state.continueWatching.filter((c) => c.contentId !== entry.contentId),
    ].slice(0, 12);
    safeSet("continueWatching", state.continueWatching);
    emit("continueWatching", state.continueWatching);
  }

  function setTheme(theme) {
    state.theme = theme;
    safeSet("theme", theme);
    emit("theme", theme);
  }

  return {
    state,
    on,
    setProfile,
    toggleFavorite,
    isFavorite,
    pushRecentlyOpened,
    updateContinueWatching,
    setTheme,
  };
})();
