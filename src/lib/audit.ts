import { supabase } from "@/integrations/supabase/client";

export async function logAudit(opts: {
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: u.user.id,
    actor_email: u.user.email ?? null,
    action: opts.action,
    entity: opts.entity,
    entity_id: opts.entity_id ?? null,
    details: opts.details ?? {},
  });
}
