import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { DatePlace } from "./api";

export type SeedPlace = DatePlace & {
  area: string;
  mood?: string;
  kakaoPlaceId?: string;
  kakaoPlaceUrl?: string;
  kakaoPhone?: string;
  kakaoCategory?: string;
  kakaoImageUrl?: string;
  kakaoTitle?: string;
};

const ListInput = z.object({
  area: z.string().trim().min(1).max(20).optional(),
});

const KAKAO_REST_KEY =
  process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY;

type KakaoLocalDoc = {
  id: string;
  place_name: string;
  place_url: string;
  phone: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

async function searchKakaoLocal(name: string, lat: number, lng: number) {
  if (!KAKAO_REST_KEY) return null;
  const params = new URLSearchParams({
    query: name,
    x: String(lng),
    y: String(lat),
    radius: "1500",
    size: "5",
    sort: "distance",
  });
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { documents?: KakaoLocalDoc[] };
    return json.documents?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Kakao Map 웹이 내부적으로 사용하는 엔드포인트.
 * 공식 REST API에는 사진/평점/리뷰수가 없어서, 이쪽을 사용.
 * 응답 스키마는 비공개이므로 변경 가능성 있음 — best-effort 파싱.
 */
async function fetchKakaoPlaceDetail(placeId: string) {
  try {
    const res = await fetch(`https://place.map.kakao.com/main/v/${placeId}`, {
      headers: {
        Referer: `https://place.map.kakao.com/${placeId}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const basic = json?.basicInfo ?? {};
    const photo: string | undefined =
      basic?.mainphotourl ||
      basic?.mainPhotoUrl ||
      json?.photo?.photoList?.[0]?.list?.[0]?.orgurl;
    const sum = Number(basic?.feedback?.scoresum ?? 0);
    const cnt = Number(basic?.feedback?.scorecnt ?? 0);
    const rating = cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : null;
    const commentCount = Number(
      basic?.comment?.kamapComntcnt ?? basic?.comment?.commentcnt ?? 0,
    );
    const title: string | undefined = basic?.placenamefull || basic?.placename;
    return {
      image: photo ?? null,
      rating,
      reviewCount: Number.isFinite(commentCount) ? commentCount : null,
      title: title ?? null,
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
        "id,name,category,area,address,lat,lng,rating,review_count,price_range,menu_examples,mood,is_after,reason,image_query,sort_weight,kakao_place_id,kakao_place_url,kakao_phone,kakao_category,kakao_image_url,kakao_rating,kakao_review_count,kakao_title,kakao_enriched_at",
      )
      .order("sort_weight", { ascending: false })
      .order("review_count", { ascending: false });

    if (data.area) query = query.eq("area", data.area);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    // 카카오 미보강 행을 지연 백필 (요청당 최대 6건, best-effort).
    const pending = list.filter((r) => !r.kakao_enriched_at).slice(0, 6);
    if (pending.length > 0 && KAKAO_REST_KEY) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const results = await Promise.all(
        pending.map(async (r) => {
          const doc = await searchKakaoLocal(
            r.name,
            Number(r.lat),
            Number(r.lng),
          );
          const detail = doc ? await fetchKakaoPlaceDetail(doc.id) : null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const update: Record<string, any> = {
            kakao_enriched_at: new Date().toISOString(),
          };
          if (doc) {
            update.kakao_place_id = doc.id;
            update.kakao_place_url = doc.place_url;
            update.kakao_phone = doc.phone || null;
            update.kakao_category = doc.category_name || null;
          }
          if (detail) {
            if (detail.image) update.kakao_image_url = detail.image;
            if (detail.rating != null) update.kakao_rating = detail.rating;
            if (detail.reviewCount != null)
              update.kakao_review_count = detail.reviewCount;
            if (detail.title) update.kakao_title = detail.title;
          }
          await supabaseAdmin
            .from("date_places")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(update as any)
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

    return list.map((r) => {
      const rating = r.kakao_rating != null ? Number(r.kakao_rating) : Number(r.rating);
      const reviewCount = r.kakao_review_count ?? r.review_count;
      return {
        id: r.id,
        name: r.kakao_title ?? r.name,
        category: r.category,
        area: r.area,
        address: r.address,
        lat: Number(r.lat),
        lng: Number(r.lng),
        rating,
        reviewCount,
        priceRange: r.price_range ?? undefined,
        menuExamples: r.menu_examples ?? [],
        mood: r.mood ?? undefined,
        isAfter: r.is_after,
        reason: r.reason ?? undefined,
        imageQuery: r.image_query ?? undefined,
        distanceKm: 0,
        kakaoPlaceId: r.kakao_place_id ?? undefined,
        kakaoPlaceUrl: r.kakao_place_url ?? undefined,
        kakaoPhone: r.kakao_phone ?? undefined,
        kakaoCategory: r.kakao_category ?? undefined,
        kakaoImageUrl: r.kakao_image_url ?? undefined,
        kakaoTitle: r.kakao_title ?? undefined,
      };
    });
  });
