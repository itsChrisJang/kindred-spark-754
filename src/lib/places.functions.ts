import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { DatePlace } from "./api";

export type SeedPlace = DatePlace & { area: string; mood?: string };

const ListInput = z.object({
  area: z.string().trim().min(1).max(20).optional(),
});

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
        "id,name,category,area,address,lat,lng,rating,review_count,price_range,menu_examples,mood,is_after,reason,image_query,sort_weight",
      )
      .order("sort_weight", { ascending: false })
      .order("review_count", { ascending: false });

    if (data.area) query = query.eq("area", data.area);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
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
    }));
  });
