import { db, noStore, requireAccess } from "./_db.js";

export default async function handler(req, res) {
  noStore(res);
  if (!requireAccess(req)) return res.status(401).json({ error: "access_key_required" });
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const [decks, cards, states, events] = await Promise.all([
      db("decks?select=id,name,sort_order,parent_id&active=eq.true&order=sort_order.asc"),
      db("cards?select=id,deck_id,front,back,note,tags,sort_order&active=eq.true&order=sort_order.asc"),
      db("review_state?select=card_id,fsrs_card,last_grade,updated_at"),
      db("review_events?select=reviewed_at&order=reviewed_at.desc&limit=365")
    ]);
    const stateMap = Object.fromEntries((states || []).map(s => [s.card_id, s]));
    const merged = (cards || []).map(c => ({ ...c, review: stateMap[c.id] || null }));
    res.status(200).json({ decks: decks || [], cards: merged, reviewDates: (events || []).map(e => e.reviewed_at) });
  } catch (e) {
    res.status(500).json({ error: "load_failed", detail: e.message });
  }
}
