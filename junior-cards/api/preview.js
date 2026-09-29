import { createEmptyCard, fsrs, Rating } from "ts-fsrs";
import { db, noStore, requireAccess } from "./_db.js";

const scheduler = fsrs({
  request_retention: 0.90,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"]
});

function hydrate(raw) {
  if (!raw) return createEmptyCard(new Date());
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined
  };
}

export default async function handler(req, res) {
  noStore(res);
  if (!requireAccess(req)) return res.status(401).json({ error: "access_key_required" });
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const { cardId } = req.body || {};
    if (!cardId) return res.status(400).json({ error: "cardId_required" });
    const rows = await db(`review_state?select=fsrs_card&card_id=eq.${encodeURIComponent(cardId)}&limit=1`);
    const card = hydrate(rows?.[0]?.fsrs_card);
    const now = new Date();
    const p = scheduler.repeat(card, now);
    const out = {};
    for (const [name, grade] of [["again", Rating.Again], ["hard", Rating.Hard], ["good", Rating.Good], ["easy", Rating.Easy]]) {
      const next = p[grade].card;
      out[name] = {
        due: next.due.toISOString(),
        scheduledDays: next.scheduled_days,
        state: next.state
      };
    }
    res.status(200).json({ preview: out });
  } catch (e) {
    res.status(500).json({ error: "preview_failed", detail: e.message });
  }
}
