export const START_BUDGET = 300;
export const TIMEOUT_PRICE = 15;
export const TIMEOUT_HEALTH = 30;

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makePick(level, productIndex, msSpent, timedOut = false) {
  const product = level.products[productIndex];
  if (!product) throw new RangeError('Unknown product');
  return {
    levelId: level.id, productIndex, productId: product.id,
    isBest: !timedOut && product.isBest,
    health: timedOut ? TIMEOUT_HEALTH : product.health,
    price: timedOut ? TIMEOUT_PRICE : product.price,
    msSpent: Math.max(0, Math.round(msSpent)), timedOut
  };
}

export function summarise(picks) {
  const spent = picks.reduce((sum, pick) => sum + pick.price, 0);
  return {
    avgHealth: picks.length ? Math.round(picks.reduce((sum, pick) => sum + pick.health, 0) / picks.length) : 0,
    budgetLeft: START_BUDGET - spent, spent,
    bestCount: picks.filter(pick => pick.isBest).length,
    timeoutCount: picks.filter(pick => pick.timedOut).length
  };
}

export function verdictTier(score) { return score >= 80 ? 0 : score >= 55 ? 1 : 2; }

export function quizScore(questions, answers) {
  return questions.filter(q => answers[q.id] === q.correctId).length;
}

export function efficacyMean(values) { return values.reduce((a, b) => a + b, 0) / values.length; }

// CFS high sugar/sodium references distinguish solids and liquids, with strict >.
// Saturated fat is a deliberately labelled editorial attention cue, not an HK claim rule.
export function nutrientWarning(key, value, form) {
  if (key === 'sugarPer100') return value > (form === 'liquid' ? 7.5 : 15) ? 'high' : '';
  if (key === 'sodiumPer100') return value > (form === 'liquid' ? 300 : 600) ? 'high' : '';
  if (key === 'satFatPer100') return value >= 5 ? 'attention' : '';
  return '';
}

export function remainingSeconds(deadline, now = Date.now()) { return Math.max(0, Math.ceil((deadline - now) / 1000)); }

export function validateLevels(levels) {
  const errors = [];
  if (!Array.isArray(levels) || levels.length !== 15) return ['Expected exactly 15 levels'];
  const ids = new Set();
  const required = ['kcalPer100', 'proteinPer100', 'carbsPer100', 'fatPer100', 'satFatPer100', 'transFatPer100', 'sodiumPer100', 'sugarPer100'];
  const productIds = new Set();
  for (const [index, level] of levels.entries()) {
    const fail = message => errors.push(`Level ${level.id}: ${message}`);
    if (ids.has(level.id) || level.id !== index + 1) fail('IDs must be unique and ordered 1-15');
    ids.add(level.id);
    for (const key of ['title', 'familyFace', 'need', 'tip']) if (!level[key]?.trim()) fail(`Missing ${key}`);
    if (!['basic', 'advanced', 'challenge'].includes(level.stage)) fail('Invalid stage');
    const expectedTime = index < 4 ? 30 : index === 4 ? 20 : index < 10 ? 25 : 20;
    if (level.timeSec !== expectedTime) fail('Incorrect timer');
    if (!Array.isArray(level.products) || level.products.length !== 3) { fail('Expected 3 products'); continue; }
    const best = level.products.filter(p => p.isBest === true);
    if (best.length !== 1) fail('Expected exactly one best product');
    if (best.length === 1 && level.products.some(p => p !== best[0] && p.health >= best[0].health)) fail('Best product must have strictly highest health');
    for (const p of level.products) {
      if (!p.id || productIds.has(p.id)) fail('Missing or duplicate product ID');
      productIds.add(p.id);
      if (typeof p.isBest !== 'boolean') fail('isBest must be boolean');
      if (!Number.isFinite(p.health) || p.health < 0 || p.health > 100) fail('Health must be 0-100');
      if (!Number.isFinite(p.price) || p.price <= 0) fail('Invalid price');
      for (const key of ['name', 'emoji', 'why', 'ingredients']) if (!p[key]?.trim()) fail(`Missing product ${key}`);
      if (typeof p.claim !== 'string') fail('Missing claim string');
      if (!['solid', 'liquid'].includes(p.form)) fail('Invalid product form');
      if (!p.source?.note || !/^\d{4}-\d{2}-\d{2}$/.test(p.source?.date)) fail('Missing source note/date');
      if (!p.label?.servingSize || !Number.isFinite(p.label?.servingAmount) || p.label.servingAmount <= 0 || !Number.isFinite(p.label?.servingsPerPack) || p.label.servingsPerPack <= 0) fail('Missing serving fields');
      for (const key of required) if (!Number.isFinite(p.label?.[key]) || p.label[key] < 0) fail(`Invalid label ${key}`);
      if ((p.name + p.claim).includes('低脂') && !Number.isFinite(p.label?.cholesterolPer100)) fail('Fat claim requires cholesterol declaration');
      if (p.claim.includes('高纖') && (!Number.isFinite(p.label?.fibrePer100) || p.label.fibrePer100 < 6)) fail('High-fibre example requires declared fibre >=6g/100g');
      if (p.label?.sugarPer100 > p.label?.carbsPer100) fail('Sugar exceeds carbohydrate');
      if (p.label?.satFatPer100 + p.label?.transFatPer100 > p.label?.fatPer100 + 0.01) fail('Fat subtypes exceed total fat');
    }
  }
  const bestPath = levels.reduce((sum, l) => sum + (l.products.find(p => p.isBest)?.price || 0), 0);
  const cheapestPath = levels.reduce((sum, l) => sum + Math.min(...l.products.map(p => p.price)), 0);
  if (bestPath > START_BUDGET || bestPath - cheapestPath < 70) errors.push('Budget trade-off missing or best path exceeds budget');
  return errors;
}
