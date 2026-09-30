import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createEmptyCard, fsrs, Rating } from "npm:ts-fsrs@5.4.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-junior-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const secretKey = secretKeys["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const scheduler = fsrs({
  request_retention: 0.90,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

const ratingMap: Record<number, number> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

async function authorized(req: Request) {
  const supplied = req.headers.get("x-junior-key") || "";
  if (!supplied) return false;
  const digest = await sha256Hex(supplied);
  const { data, error } = await db
    .from("app_config")
    .select("access_key_hash")
    .eq("id", 1)
    .single();
  return !error && !!data && digest === data.access_key_hash;
}

function hydrate(raw: any) {
  if (!raw) return createEmptyCard(new Date());
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  };
}

function serializeCard(card: any) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

function serializeLog(log: any) {
  return {
    ...log,
    due: log.due.toISOString(),
    review: log.review.toISOString(),
  };
}

function routeName(req: Request) {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("junior-cards-api");
  return idx >= 0 ? (parts[idx + 1] || "cards") : "cards";
}

const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const deckFields = "id,slug,name,description,sort_order,parent_id";

async function organizationBody(req: Request) {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}

async function organizeDeck(body: any) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const parentId = body.parentId ?? null;
  if (!name || name.length > 120) return json({ error: "Informe um nome de até 120 caracteres." }, 400);
  if (parentId !== null && !validId(parentId)) return json({ error: "Categoria superior inválida." }, 400);
  if (body.action !== "create" && body.action !== "update") return json({ error: "Ação inválida." }, 400);
  if (body.action === "update" && !validId(body.id)) return json({ error: "Categoria inválida." }, 400);
  if (parentId) {
    const { data: parent, error } = await db.from("decks").select("id").eq("id", parentId).eq("active", true).maybeSingle();
    if (error) return json({ error: "Não consegui verificar a categoria superior." }, 500);
    if (!parent) return json({ error: "Categoria superior não encontrada." }, 404);
  }
  let result;
  if (body.action === "create") {
    const id = crypto.randomUUID();
    result = await db.from("decks").insert({ id, slug: "category-" + id, name, parent_id: parentId, sort_order: 100 }).select(deckFields).single();
  } else {
    result = await db.from("decks").update({ name, parent_id: parentId }).eq("id", body.id).eq("active", true).select(deckFields).maybeSingle();
  }
  if (result.error) {
    const code = result.error.code;
    if (code === "23505") return json({ error: "Já existe uma categoria com esse nome neste nível." }, 409);
    if (code === "23514") return json({ error: "Uma categoria não pode ficar dentro dela mesma ou de suas subcategorias." }, 400);
    if (code === "23503") return json({ error: "Categoria superior não encontrada." }, 404);
    console.error("deck_organization_failed", code);
    return json({ error: "Não consegui salvar a categoria." }, 500);
  }
  if (!result.data) return json({ error: "Categoria não encontrada." }, 404);
  return json({ deck: result.data });
}

async function moveCards(body: any) {
  if (!validId(body.deckId) || !Array.isArray(body.cardIds) || !body.cardIds.length || body.cardIds.length > 1000 || !body.cardIds.every(validId)) {
    return json({ error: "Selecione uma categoria e entre 1 e 1000 cartões." }, 400);
  }
  const ids = [...new Set(body.cardIds)] as string[];
  const { data: target, error: targetError } = await db.from("decks").select("id").eq("id", body.deckId).eq("active", true).maybeSingle();
  if (targetError) return json({ error: "Não consegui verificar o destino." }, 500);
  if (!target) return json({ error: "Categoria de destino não encontrada." }, 404);
  const { data: cards, error: cardsError } = await db.from("cards").select("id").in("id", ids).eq("active", true);
  if (cardsError) return json({ error: "Não consegui verificar os cartões." }, 500);
  if (!cards || cards.length !== ids.length) return json({ error: "Um dos cartões não está mais disponível. Atualize a lista." }, 404);
  // Only the category changes. Card IDs, FSRS state and review events stay intact.
  const { data: moved, error } = await db.from("cards").update({ deck_id: body.deckId, updated_at: new Date().toISOString() }).in("id", ids).eq("active", true).select("id,deck_id");
  if (error) return json({ error: "Não consegui mover os cartões." }, 500);
  return json({ cards: moved || [] });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await authorized(req))) return json({ error: "access_key_required" }, 401);

  const route = routeName(req);

  if (route === "cards" && req.method === "GET") {
    const [decksR, cardsR, statesR, eventsR] = await Promise.all([
      db.from("decks").select(deckFields).eq("active", true).order("sort_order"),
      db.from("cards").select("id,deck_id,front,back,note,tags,sort_order").eq("active", true).order("sort_order"),
      db.from("review_state").select("card_id,fsrs_card,last_grade,updated_at"),
      db.from("review_events").select("reviewed_at").order("reviewed_at", { ascending: false }).limit(365),
    ]);

    const err = decksR.error || cardsR.error || statesR.error || eventsR.error;
    if (err) return json({ error: "load_failed", detail: err.message }, 500);

    const stateMap = Object.fromEntries((statesR.data || []).map((s: any) => [s.card_id, s]));
    const cards = (cardsR.data || []).map((c: any) => ({ ...c, review: stateMap[c.id] || null }));
    return json({
      decks: decksR.data || [],
      cards,
      reviewDates: (eventsR.data || []).map((e: any) => e.reviewed_at),
    });
  }

  if (route === "decks" && req.method === "POST") {
    return organizeDeck(await organizationBody(req));
  }
  if (route === "move-cards" && req.method === "POST") {
    return moveCards(await organizationBody(req));
  }

  if (route === "preview" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const cardId = String(body.cardId || "");
    if (!cardId) return json({ error: "cardId_required" }, 400);

    const { data: row, error } = await db
      .from("review_state")
      .select("fsrs_card")
      .eq("card_id", cardId)
      .maybeSingle();
    if (error) return json({ error: "preview_failed", detail: error.message }, 500);

    const card = hydrate(row?.fsrs_card);
    const p = scheduler.repeat(card, new Date());
    const out: any = {};
    for (const [name, grade] of [
      ["again", Rating.Again],
      ["hard", Rating.Hard],
      ["good", Rating.Good],
      ["easy", Rating.Easy],
    ] as const) {
      const next = p[grade].card;
      out[name] = {
        due: next.due.toISOString(),
        scheduledDays: next.scheduled_days,
        state: next.state,
      };
    }
    return json({ preview: out });
  }

  if (route === "review" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const cardId = String(body.cardId || "");
    const grade = Number(body.grade);
    const rating = ratingMap[grade];
    if (!cardId || !rating) return json({ error: "cardId_and_grade_required" }, 400);

    const { data: cardRow } = await db.from("cards").select("id").eq("id", cardId).eq("active", true).maybeSingle();
    if (!cardRow) return json({ error: "card_not_found" }, 404);

    const { data: stateRow, error: stateErr } = await db
      .from("review_state")
      .select("fsrs_card")
      .eq("card_id", cardId)
      .maybeSingle();
    if (stateErr) return json({ error: "review_failed", detail: stateErr.message }, 500);

    const current = hydrate(stateRow?.fsrs_card);
    const now = new Date();
    const result = scheduler.next(current, now, rating);
    const savedCard = serializeCard(result.card);
    const savedLog = serializeLog(result.log);

    const { error: upsertErr } = await db.from("review_state").upsert({
      card_id: cardId,
      fsrs_card: savedCard,
      last_grade: grade,
      reps: savedCard.reps,
      lapses: savedCard.lapses,
      stability: savedCard.stability,
      difficulty: savedCard.difficulty,
      due_at: savedCard.due,
      last_reviewed_at: savedCard.last_review,
      updated_at: now.toISOString(),
    }, { onConflict: "card_id" });
    if (upsertErr) return json({ error: "review_failed", detail: upsertErr.message }, 500);

    const { error: eventErr } = await db.from("review_events").insert({
      card_id: cardId,
      grade,
      reviewed_at: now.toISOString(),
      fsrs_log: savedLog,
    });
    if (eventErr) return json({ error: "review_failed", detail: eventErr.message }, 500);

    return json({ card: savedCard, log: savedLog });
  }

  if (route === "import-legacy" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items.slice(0, 100) : [];
    const { data: deck } = await db.from("decks").select("id").eq("slug", "english-false-friends").single();
    if (!deck) return json({ error: "deck_not_found" }, 404);

    let imported = 0;
    for (const item of items) {
      const front = String(item.front || "");
      if (!front) continue;
      const { data: card } = await db
        .from("cards")
        .select("id")
        .eq("deck_id", deck.id)
        .eq("front", front)
        .maybeSingle();
      if (!card) continue;

      const reps = Math.max(0, Number(item.reps || 0));
      if (!reps) continue;
      const due = item.due ? new Date(Number(item.due)) : new Date();
      const last = item.last ? new Date(Number(item.last)) : new Date();
      const fsrsCard = {
        due: due.toISOString(),
        stability: Math.max(0.1, Number(item.stability || 0.7)),
        difficulty: Math.min(10, Math.max(1, Number(item.difficulty || 5))),
        elapsed_days: 0,
        scheduled_days: Math.max(0, Math.round((due.getTime() - last.getTime()) / 86400000)),
        reps,
        lapses: Math.max(0, Number(item.lapses || 0)),
        state: 2,
        learning_steps: 0,
        last_review: last.toISOString(),
      };
      await db.from("review_state").upsert({
        card_id: card.id,
        fsrs_card: fsrsCard,
        reps: fsrsCard.reps,
        lapses: fsrsCard.lapses,
        stability: fsrsCard.stability,
        difficulty: fsrsCard.difficulty,
        due_at: fsrsCard.due,
        last_reviewed_at: fsrsCard.last_review,
        updated_at: new Date().toISOString(),
      }, { onConflict: "card_id" });
      imported++;
    }
    return json({ ok: true, imported });
  }

  return json({ error: "not_found" }, 404);
});
