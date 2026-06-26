import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const noHtml = /^[^<>"'`]*$/;
const CreateInput = z.object({
  title: z.string().min(1).max(80).regex(noHtml, "사용할 수 없는 문자가 포함되어 있어요"),
  location: z.string().min(1).max(60).regex(noHtml, "사용할 수 없는 문자가 포함되어 있어요"),
  venueType: z.string().min(1).max(40).regex(noHtml, "사용할 수 없는 문자가 포함되어 있어요"),
  ratio: z.enum(["2:2", "3:3", "4:4", "5:5"]),
  startsAt: z.string().min(1).max(40),
  maleCapacity: z.number().int().min(1).max(10),
  femaleCapacity: z.number().int().min(1).max(10),
  description: z.string().max(500).optional(),
});


export const createMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("meetings")
      .insert({
        host_id: userId,
        title: data.title,
        location: data.location,
        venue_type: data.venueType,
        ratio: data.ratio,
        starts_at: data.startsAt,
        male_capacity: data.maleCapacity,
        female_capacity: data.femaleCapacity,
        description: data.description ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const joinMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ meetingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("join_meeting", {
      _meeting_id: data.meetingId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const myMeetingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [hosted, joined] = await Promise.all([
      supabase
        .from("meetings_with_counts")
        .select("*")
        .eq("host_id", userId),
      supabase
        .from("meeting_participants")
        .select("meeting_id")
        .eq("user_id", userId),
    ]);
    if (hosted.error) throw new Error(hosted.error.message);
    if (joined.error) throw new Error(joined.error.message);
    const joinedIds = joined.data.map((r) => r.meeting_id);
    let joinedRows: typeof hosted.data = [];
    if (joinedIds.length > 0) {
      const { data, error } = await supabase
        .from("meetings_with_counts")
        .select("*")
        .in("id", joinedIds);
      if (error) throw new Error(error.message);
      joinedRows = data ?? [];
    }
    const seen = new Set<string>();
    const all = [...(hosted.data ?? []), ...joinedRows].filter((m) => {
      if (seen.has(m.id!)) return false;
      seen.add(m.id!);
      return true;
    });
    all.sort(
      (a, b) =>
        new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime(),
    );
    return all;
  });
