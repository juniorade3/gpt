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

const ratingMap = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy };

function hydrate(raw) {
  if (!raw) return createEmptyCard(new Date());
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined
  };
}

function serializeCard(card) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null
  };
}

function serializeLog(log) {
  return {
    ...log,
    due: log.due.toISOString(),
    review: log.review.toISOString()
  };
}

export default async function handler(req, res) {
  noStore(res);
  if (!requireAccess(req)) return res.status(401).json({ error: "access_key_required" });
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const { cardId, grade } = req.body || {};
    const rating = ratingMap[Number(grade)];
    if (!cardId || !rating) return res.status(400).json({ error: "cardId_and_grade_required" });

    const cardRows = await db(`cards?select=id&active=eq.true&id=eq.${encodeURIComponent(cardId)}&limit=1`);
    if (!cardRows?.length) return res.status(404).json({ error: "card_not_found" });

    const rows = await db(`review_state?select=fsrs_card&card_id=eq.${encodeURIComponent(cardId)}&limit=1`);
    const current = hydrate(rows?.[0]?.fsrs_card);
    const now = new Date();
    const result = scheduler.next(current, now, rating);
    const savedCard = serializeCard(result.card);
    const savedLog = serializeLog(result.log);

    await db("review_state?on_conflict=card_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        card_id: cardId,
        fsrs_card: savedCard,
        last_grade: Number(grade),
        updated_at: now.toISOString()
      })
    });

    await db("review_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        card_id: cardId,
        grade: Number(grade),
        reviewed_at: now.toISOString(),
        fsrs_log: savedLog
      })
    });

    res.status(200).json({ card: savedCard, log: savedLog });
  } catch (e) {
    res.status(500).json({ error: "review_failed", detail: e.message });
  }
}
