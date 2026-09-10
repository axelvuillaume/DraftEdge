// Compare two patch segments: numerically when both are numbers, otherwise as strings
function compareSegment(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

// Compare two patch strings segment by segment (e.g. "15.9" < "15.10" < "25.S1")
function comparePatch(a, b) {
  const sa = a.split('.');
  const sb = b.split('.');
  const len = Math.max(sa.length, sb.length);
  for (let i = 0; i < len; i++) {
    if (sa[i] === undefined) return -1;
    if (sb[i] === undefined) return 1;
    const diff = compareSegment(sa[i], sb[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Reduce raw patch strings to unique "major.minor" prefixes, newest first
function getPatchPrefixes(patches) {
  const prefixes = patches.filter(Boolean).map((p) => p.split('.').slice(0, 2).join('.'));
  return [...new Set(prefixes)].sort((a, b) => comparePatch(b, a));
}

module.exports = { comparePatch, getPatchPrefixes };
