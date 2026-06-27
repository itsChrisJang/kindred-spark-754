import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { DatePlace } from "./api";

export type SeedPlace = DatePlace & {
  area: string;
  mood?: string;
  kakaoPlaceUrl?: string;
  kakaoPhone?: string;
  kakaoCategory?: string;
};

const ListInput = z.object({
  area: z.string().trim().min(1).max(20).optional(),
});

const KAKAO_REST_KEY =
  process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY;

type KakaoDoc = {
  id: string;
  place_name: string;
  place_url: string;
  phone: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  distance: string;
};

async function searchKakao(name: string, lat: number, lng: number) {
  if (!KAKAO_REST_KEY) return null;
  const params = new URLSearchParams({
    query: name,
    x: String(lng),
    y: String(lat),
    radius: "1000",
    size: "5",
    sort: "distance",
  });
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { documents?: KakaoDoc[] };
    const doc = json.documents?.[0];
    if (!doc) return null;
    return {
      kakao_place_id: doc.id,
      kakao_place_url: doc.place_url,
      kakao_phone: doc.phone || null,
      kakao_category: doc.category_name || null,
    };
  } catch {
    return null;
  }
}

export const listPlacesFn = createServerFn({ method: "GET" })
  .inputValidator((input: { area?: string }) => ListInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<SeedPlace[]> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    let query = supabase
      .from("date_places")
      .select(
        "id,name,category,area,address,lat,lng,rating,review_count,price_range,menu_examples,mood,is_after,reason,image_query,sort_weight,kakao_place_id,kakao_place_url,kakao_phone,kakao_category,kakao_enriched_at",
      )
      .order("sort_weight", { ascending: false })
      .order("review_count", { ascending: false });

    if (data.area) query = query.eq("area", data.area);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    // 카카오 미보강 행을 지연 백필 (최대 6건/요청, 비차단적 best-effort)
    const pending = list.filter((r) => !r.kakao_enriched_at).slice(0, 6);
    if (pending.length > 0 && KAKAO_REST_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const results = await Promise.all(
        pending.map(async (r) => {
          const enrich = await searchKakao(r.name, Number(r.lat), Number(r.lng));
          const update = {
            kakao_enriched_at: new Date().toISOString(),
            ...(enrich ?? {}),
          };
          await supabaseAdmin
            .from("date_places")
            .update(update)
            .eq("id", r.id);
          return { id: r.id, ...update };
        }),
      );
      const map = new Map(results.map((x) => [x.id, x]));
      for (const r of list) {
        const m = map.get(r.id);
        if (m) Object.assign(r, m);
      }
    }

    return list.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      area: r.area,
      address: r.address,
      lat: Number(r.lat),
      lng: Number(r.lng),
      rating: Number(r.rating),
      reviewCount: r.review_count,
      priceRange: r.price_range ?? undefined,
      menuExamples: r.menu_examples ?? [],
      mood: r.mood ?? undefined,
      isAfter: r.is_after,
      reason: r.reason ?? undefined,
      imageQuery: r.image_query ?? undefined,
      distanceKm: 0,
      kakaoPlaceUrl: r.kakao_place_url ?? undefined,
      kakaoPhone: r.kakao_phone ?? undefined,
      kakaoCategory: r.kakao_category ?? undefined,
    }));
  });
