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
});

export const saveProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          nickname: data.nickname,
          age: data.age,
          gender: data.gender,
          job: data.job ?? null,
          bio: data.bio,
          hobbies: data.hobbies,
          photos: data.photos,
        },
        { onConflict: "user_id" },
      )
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
