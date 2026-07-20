/**
 * config.js
 * ---------------------------------------------------------------------------
 * Single source of truth for how LUMEN talks to a backend.
 *
 * IMPORTANT: This app never calls a third-party content API directly and
 * never stores an API key client-side. Every request goes through
 * CONFIG.API_BASE_URL, which is expected to be YOUR OWN server / serverless
 * proxy. That proxy is where you keep secrets, do auth, and talk to
 * whatever content source you own the rights to.
 *
 * Swap MOCK_MODE to false and point API_BASE_URL at your real proxy and the
 * rest of the app keeps working unchanged, because every screen reads data
 * through api.js, never straight from fetch().
 * ---------------------------------------------------------------------------
 */

const CONFIG = Object.freeze({
  // Toggle this off once a real backend exists at API_BASE_URL.
  MOCK_MODE: true,

  // Replace with your own secure proxy, e.g. "https://api.yourapp.com/v1"
  API_BASE_URL: "https://your-backend.example.com/api/v1",

  // Logical endpoint map. Keep route names generic/business-oriented so the
  // rest of the app never hardcodes a URL string.
  ENDPOINTS: {
    batches: "/batches",
    batchDetail: (batchId) => `/batches/${batchId}`,
    subjects: (batchId) => `/batches/${batchId}/subjects`,
    topics: (batchId, subjectId) => `/batches/${batchId}/subjects/${subjectId}/topics`,
    content: (batchId, subjectId, topicId) =>
      `/batches/${batchId}/subjects/${subjectId}/topics/${topicId}/content`,
    search: "/search",
    videoManifest: (contentId) => `/content/${contentId}/manifest`,
  },

  // Networking behavior for the fetch wrapper in api.js
  REQUEST: {
    timeoutMs: 10000,
    retries: 2,
    retryDelayMs: 600,
  },

  // Namespaced localStorage keys so this app never collides with anything
  // else running on the same origin.
  STORAGE_PREFIX: "lumen:",

  BRAND: {
    name: "LUMEN",
    tagline: "Study without static.",
  },
});
