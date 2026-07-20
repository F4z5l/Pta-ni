/**
 * api.js
 * ---------------------------------------------------------------------------
 * Every network call in the app funnels through `Api.request()`. It handles:
 *   - timeout               (aborts a hung request)
 *   - retry w/ backoff      (transient network errors only)
 *   - normalized errors     (ApiError with a `.userMessage`)
 *   - a mock-mode branch    (so the UI is fully demoable with no server)
 *
 * Screens never call fetch() directly and never see the MOCK_MODE branch —
 * they just call e.g. Api.getBatches() and get a promise back.
 * ---------------------------------------------------------------------------
 */

class ApiError extends Error {
  constructor(message, { userMessage, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? null;
    this.userMessage = userMessage || "Something went wrong. Pull down to retry.";
  }
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ApiError("Request timed out", { userMessage: "Taking too long. Check your connection." })), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core wrapper. `resolver` is only used in MOCK_MODE and should synchronously
 * (or async) return the mock payload for this call.
 */
async function request(path, { method = "GET", resolver = null } = {}) {
  if (CONFIG.MOCK_MODE) {
    // Simulate real network latency + the occasional hiccup so loading/error
    // states in the UI are exercised honestly, not just happy-path.
    await delay(280 + Math.random() * 420);
    if (Math.random() < 0.03) {
      throw new ApiError("Simulated network failure", { userMessage: "Network hiccup. Pull down to try again." });
    }
    if (typeof resolver !== "function") {
      throw new ApiError("No mock resolver provided for " + path);
    }
    return resolver();
  }

  const url = `${CONFIG.API_BASE_URL}${typeof path === "string" ? path : ""}`;
  let lastError;
  for (let attempt = 0; attempt <= CONFIG.REQUEST.retries; attempt++) {
    try {
      const res = await withTimeout(
        fetch(url, { method, headers: { Accept: "application/json" } }),
        CONFIG.REQUEST.timeoutMs
      );
      if (!res.ok) {
        throw new ApiError(`HTTP ${res.status}`, {
          status: res.status,
          userMessage: res.status >= 500 ? "Server is having trouble. Try again shortly." : "Couldn't load that. Try again.",
        });
      }
      return await res.json();
    } catch (err) {
      lastError = err instanceof ApiError ? err : new ApiError(err.message);
      if (attempt < CONFIG.REQUEST.retries) await delay(CONFIG.REQUEST.retryDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}

const Api = {
  ApiError,

  getBatches() {
    return request(CONFIG.ENDPOINTS.batches, { resolver: () => MOCK.batches });
  },

  getSubjects(batchId) {
    return request(CONFIG.ENDPOINTS.subjects(batchId), {
      resolver: () => MOCK.subjects[batchId] || [],
    });
  },

  getTopics(batchId, subjectId) {
    return request(CONFIG.ENDPOINTS.topics(batchId, subjectId), {
      resolver: () => MOCK.topics[subjectId] || [],
    });
  },

  getContent(batchId, subjectId, topicId) {
    return request(CONFIG.ENDPOINTS.content(batchId, subjectId, topicId), {
      resolver: () => MOCK.content[topicId] || [],
    });
  },

  search(query) {
    return request(CONFIG.ENDPOINTS.search, {
      resolver: () => {
        const q = query.trim().toLowerCase();
        if (!q) return { batches: [], content: [] };
        const batches = MOCK.batches.filter((b) => b.title.toLowerCase().includes(q));
        const content = Object.values(MOCK.content)
          .flat()
          .filter((c) => c.title.toLowerCase().includes(q))
          .slice(0, 20);
        return { batches, content };
      },
    });
  },

  // Stand-in for a real DRM/CDN manifest lookup. A production backend would
  // return a signed URL scoped to the requesting user, never a raw link.
  getVideoManifest(contentId, quality) {
    return request(CONFIG.ENDPOINTS.videoManifest(contentId), {
      resolver: () => ({ contentId, quality, note: "Wire this up to your own signed-URL endpoint." }),
    });
  },
};
