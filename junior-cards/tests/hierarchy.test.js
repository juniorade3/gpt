import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descendants, roots, deckPath, orderedDecks, scopedCards } from '../hierarchy.js';

const decks = [
  { id: 'bd', name: 'Banco de Dados' },
  { id: 'errors', name: 'Caderno de Erros', parent_id: 'bd' },
  { id: 'rel', name: 'Relacional', parent_id: 'bd' },
  { id: 'sql', name: 'SQL', parent_id: 'rel' },
  { id: 'afo', name: 'AFO' }
];
const reviewed = { fsrs_card: { reps: 3, due: '2026-10-02T12:00:00Z' } };
const cards = [
  { id: '1', deck_id: 'bd' },
  { id: '2', deck_id: 'errors', review: reviewed },
  { id: '3', deck_id: 'rel' },
  { id: '4', deck_id: 'sql' },
  { id: '5', deck_id: 'afo' }
];
const data = { decks, cards };

test('whole subject includes direct and nested cards exactly once', () => {
  assert.deepEqual(scopedCards(data, 'bd').map(c => c.id), ['1', '2', '3', '4']);
  assert.deepEqual(roots(decks).map(d => d.id), ['bd', 'afo']);
});
test('category includes its descendants and excludes other categories', () => {
  assert.deepEqual(scopedCards(data, 'bd', 'rel').map(c => c.id), ['3', '4']);
  assert.deepEqual(scopedCards(data, 'bd', 'errors').map(c => c.id), ['2']);
  assert.deepEqual(scopedCards(data, 'bd', '@general').map(c => c.id), ['1']);
});
test('selection keeps the original card and FSRS state', () => {
  assert.strictEqual(scopedCards(data, 'bd', 'errors')[0], cards[1]);
  assert.strictEqual(scopedCards(data, 'bd')[1].review, reviewed);
});
test('nested paths and order preserve the hierarchy', () => {
  assert.deepEqual(deckPath(decks, 'sql').map(d => d.name), ['Banco de Dados', 'Relacional', 'SQL']);
  assert.deepEqual(orderedDecks(decks).map(d => d.id), ['bd', 'errors', 'rel', 'sql', 'afo']);
});
test('legacy flat data remains usable; invalid cached cycles terminate', () => {
  const flat = [{ id: 'old', name: 'Old deck' }];
  assert.deepEqual(roots(flat), flat);
  const cycle = [{ id: 'a', parent_id: 'b' }, { id: 'b', parent_id: 'a' }];
  assert.equal(descendants(cycle, 'a').size, 2);
  assert.equal(deckPath(cycle, 'a').length, 2);
  assert.equal(orderedDecks(cycle).length, 2);
});
