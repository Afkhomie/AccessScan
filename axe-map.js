// Pure mapping from raw axe-core analyze() results to AccessScan's trimmed
// per-page shape. No Playwright/browser dependency — unit-testable.

function mapAxeResults(axeResults, { url, status, title }) {
  const results = axeResults;

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact || 'minor',
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags.filter((t) => t.startsWith('wcag') || t.startsWith('best-practice')),
    nodes: v.nodes.slice(0, 50).map((n) => ({
      target: Array.isArray(n.target) ? n.target.join(' ') : String(n.target),
      html: (n.html || '').slice(0, 500),
      summary: (n.failureSummary || '').slice(0, 500),
    })),
    nodeCount: v.nodes.length,
  }));

  // axe "incomplete" = could not tell pass/fail — needs a human. Surface honestly.
  const incomplete = results.incomplete.slice(0, 50).map((i) => ({
    id: i.id,
    impact: i.impact || 'minor',
    help: i.help,
    helpUrl: i.helpUrl,
    nodeCount: i.nodes?.length || 0,
  }));

  return {
    url,
    status,
    title,
    violations,
    incomplete,
    incompleteCount: results.incomplete.length,
    counts: {
      critical: violations.filter((v) => v.impact === 'critical').length,
      serious: violations.filter((v) => v.impact === 'serious').length,
      moderate: violations.filter((v) => v.impact === 'moderate').length,
      minor: violations.filter((v) => v.impact === 'minor').length,
    },
    totalNodes: violations.reduce((s, v) => s + v.nodeCount, 0),
    passes: results.passes.length,
  };
}

module.exports = { mapAxeResults };
