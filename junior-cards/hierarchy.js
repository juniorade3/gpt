// Hierarchy helpers shared by the study selector and organization screen.
export function descendants(decks, id) {
  const ids = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parent = pending.shift();
    for (const deck of decks) {
      if (deck.parent_id === parent && !ids.has(deck.id)) {
        ids.add(deck.id);
        pending.push(deck.id);
      }
    }
  }
  return ids;
}

export function roots(decks) {
  const ids = new Set(decks.map(d => d.id));
  return decks.filter(d => !d.parent_id || !ids.has(d.parent_id));
}

export function deckPath(decks, id) {
  const map = new Map(decks.map(d => [d.id, d]));
  const path = [], seen = new Set();
  let deck = map.get(id);
  while (deck && !seen.has(deck.id)) {
    path.unshift(deck);
    seen.add(deck.id);
    deck = map.get(deck.parent_id);
  }
  return path;
}

export function orderedDecks(decks) {
  const result = [], seen = new Set();
  function visit(deck) {
    if (seen.has(deck.id)) return;
    seen.add(deck.id);
    result.push(deck);
    decks.filter(d => d.parent_id === deck.id).forEach(visit);
  }
  roots(decks).forEach(visit);
  decks.forEach(visit);
  return result;
}

export function scopedCards(data, rootId, categoryId = null) {
  if (!rootId) return [];
  if (categoryId === '@general') return data.cards.filter(c => c.deck_id === rootId);
  const ids = descendants(data.decks, categoryId || rootId);
  return data.cards.filter(c => ids.has(c.deck_id));
}
