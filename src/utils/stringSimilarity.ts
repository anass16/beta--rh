function normalizeNameForMatching(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z\s]/g, '') // remove punctuation/digits
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function calculateNameSimilarity(name1: string, name2: string): number {
  const tokens1 = new Set(normalizeNameForMatching(name1));
  const tokens2 = new Set(normalizeNameForMatching(name2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size; // Jaccard Similarity
}
