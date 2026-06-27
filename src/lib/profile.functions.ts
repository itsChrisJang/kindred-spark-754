import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProfileInput = z.object({
  nickname: z.string().min(1).max(20),
  age: z.number().int().min(19).max(100),
  gender: z.enum(["M", "F"]),
  job: z.string().max(40).optional(),
  bio: z.string().max(300).default(""),
  hobbies: z.array(z.string().max(20)).max(20).default([]),
  photos: z.array(z.string().max(500)).max(10).default([]),
  preferredAgeMin: z.number().int().min(19).max(100).optional(),
  preferredAgeMax: z.number().int().min(19).max(100).optional(),
  useAgeWindow: z.boolean().optional(),
  ageWindowN: z.number().int().min(1).max(20).optional(),
  activeAreas: z.array(z.string().max(20)).max(20).optional(),
  residence: z.string().max(60).optional(),
  heightSelf: z.number().int().min(120).max(230).optional().nullable(),
  heightPref: z.string().max(30).optional(),
  smoking: z.string().max(20).optional(),
  drinking: z.string().max(20).optional(),
  excludeSameCompany: z.boolean().optional(),
  rematchPrevious: z.boolean().optional(),
});

export const saveProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      nickname: data.nickname,
      age: data.age,
      gender: data.gender,
      job: data.job ?? null,
      bio: data.bio,
      hobbies: data.hobbies,
      photos: data.photos,
    } as Record<string, unknown>;
    if (data.preferredAgeMin !== undefined) payload.preferred_age_min = data.preferredAgeMin;
    if (data.preferredAgeMax !== undefined) payload.preferred_age_max = data.preferredAgeMax;
    if (data.useAgeWindow !== undefined) payload.use_age_window = data.useAgeWindow;
    if (data.ageWindowN !== undefined) payload.age_window_n = data.ageWindowN;
    if (data.activeAreas !== undefined) payload.active_areas = data.activeAreas;
    if (data.residence !== undefined) payload.residence = data.residence || null;
    if (data.heightSelf !== undefined) payload.height_self = data.heightSelf;
    if (data.heightPref !== undefined) payload.height_pref = data.heightPref || null;
    if (data.smoking !== undefined) payload.smoking = data.smoking || null;
    if (data.drinking !== undefined) payload.drinking = data.drinking || null;
    if (data.excludeSameCompany !== undefined) payload.exclude_same_company = data.excludeSameCompany;
    if (data.rematchPrevious !== undefined) payload.rematch_previous = data.rematchPrevious;

    const { data: row, error } = await supabase
      .from("profiles")
      .upsert(payload as never, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
