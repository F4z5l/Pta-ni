/**
 * mockData.js
 * ---------------------------------------------------------------------------
 * 100% original placeholder data. Shapes mirror what a real backend would
 * return through the endpoints in config.js, so swapping MOCK_MODE off
 * requires zero changes to rendering code — only api.js's fetch calls
 * change from "resolve mock" to "actually fetch".
 * ---------------------------------------------------------------------------
 */

const MOCK = (() => {
  const img = (seed, w = 480, h = 270) =>
    `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

  const batches = [
    { id: "b1", title: "Orbit Physics — Foundations", track: "JEE", thumbnail: img("orbit-physics"), subjectsCount: 4, progress: 62 },
    { id: "b2", title: "Carbon & Reactions", track: "NEET", thumbnail: img("carbon-reactions"), subjectsCount: 3, progress: 18 },
    { id: "b3", title: "Vector Calculus Intensive", track: "JEE", thumbnail: img("vector-calc"), subjectsCount: 5, progress: 0 },
    { id: "b4", title: "Human Systems Deep Dive", track: "NEET", thumbnail: img("human-systems"), subjectsCount: 6, progress: 41 },
    { id: "b5", title: "Critical Reading Lab", track: "CUET", thumbnail: img("critical-reading"), subjectsCount: 2, progress: 87 },
    { id: "b6", title: "Applied Thermodynamics", track: "JEE", thumbnail: img("thermo"), subjectsCount: 4, progress: 5 },
    { id: "b7", title: "Genetics & Evolution", track: "NEET", thumbnail: img("genetics"), subjectsCount: 3, progress: 0 },
    { id: "b8", title: "Quantitative Aptitude Sprint", track: "CUET", thumbnail: img("quant"), subjectsCount: 3, progress: 29 },
  ];

  const subjectNames = ["Core Concepts", "Problem Drills", "Numericals Lab", "Previous Years", "Rapid Revision", "Mock Assessments"];
  const subjects = {};
  batches.forEach((b) => {
    subjects[b.id] = Array.from({ length: b.subjectsCount }, (_, i) => ({
      id: `${b.id}-s${i + 1}`,
      title: subjectNames[i % subjectNames.length],
      batchId: b.id,
      topicsCount: 3 + (i % 3),
    }));
  });

  const topicNames = ["Introduction & Scope", "Core Derivations", "Worked Examples", "Common Traps", "Speed Techniques", "Chapter Test"];
  const topics = {};
  Object.values(subjects).flat().forEach((s) => {
    topics[s.id] = Array.from({ length: s.topicsCount }, (_, i) => ({
      id: `${s.id}-t${i + 1}`,
      title: topicNames[i % topicNames.length],
      subjectId: s.id,
      batchId: s.batchId,
    }));
  });

  const content = {};
  Object.values(topics).flat().forEach((t) => {
    const videoCount = 2 + Math.floor(Math.random() * 3);
    const pdfCount = 1 + Math.floor(Math.random() * 2);
    const items = [];
    for (let i = 0; i < videoCount; i++) {
      items.push({
        id: `${t.id}-v${i + 1}`,
        type: "video",
        title: `${t.title} — Part ${i + 1}`,
        durationSec: 300 + Math.floor(Math.random() * 2400),
        thumbnail: img(`${t.id}-v${i + 1}`),
        topicId: t.id,
        subjectId: t.subjectId,
        batchId: t.batchId,
      });
    }
    for (let i = 0; i < pdfCount; i++) {
      items.push({
        id: `${t.id}-p${i + 1}`,
        type: "pdf",
        title: `${t.title} — Notes ${i + 1}`,
        pages: 4 + Math.floor(Math.random() * 20),
        topicId: t.id,
        subjectId: t.subjectId,
        batchId: t.batchId,
      });
    }
    content[t.id] = items;
  });

  return { batches, subjects, topics, content };
})();
