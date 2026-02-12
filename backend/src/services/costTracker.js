export class CostTracker {
  constructor() {
    this.entries = [];
  }

  log({ testCaseIndex, strategy, component, model, tokens = 0, cost = 0 }) {
    this.entries.push({ testCaseIndex, strategy, component, model, tokens, cost });
  }

  getSummary() {
    const costByStrategy = {};
    const strategyCounts = {};
    let totalCost = 0;

    for (const entry of this.entries) {
      totalCost += entry.cost;
      costByStrategy[entry.strategy] = (costByStrategy[entry.strategy] || 0) + entry.cost;
    }

    // Count unique test cases per strategy
    const testCaseStrategies = {};
    for (const entry of this.entries) {
      if (!testCaseStrategies[entry.testCaseIndex]) {
        testCaseStrategies[entry.testCaseIndex] = entry.strategy;
      }
    }
    for (const strategy of Object.values(testCaseStrategies)) {
      strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    }

    // Round costs
    for (const key of Object.keys(costByStrategy)) {
      costByStrategy[key] = Math.round(costByStrategy[key] * 1000000) / 1000000;
    }

    return {
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      costByStrategy,
      strategyCounts,
      entries: this.entries,
    };
  }
}
