const store = new Map();

export const demoStore = {
  save(doc) {
    store.set(doc.jobId, { ...doc, createdAt: new Date(), updatedAt: new Date() });
  },

  get(jobId) {
    return store.get(jobId) || null;
  },

  pushEvent(jobId, event) {
    const doc = store.get(jobId);
    if (!doc) return;
    if (!doc.events) doc.events = [];
    doc.events.push(event);
  },

  update(jobId, updates) {
    const doc = store.get(jobId);
    if (!doc) return;
    Object.assign(doc, updates, { updatedAt: new Date() });
  },

  list() {
    return [...store.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  count() {
    return store.size;
  },
};
