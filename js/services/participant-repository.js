import { assignedParticipants, findAssignedParticipant, normalizeEmail } from "../config/assigned-participants.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

function fromParticipantRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: normalizeEmail(row.email),
    team: row.assigned_team,
    status: row.status,
    authUserId: row.auth_user_id,
    registeredAt: row.registered_at,
  };
}

export async function findParticipantByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return findAssignedParticipant(normalizedEmail);
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("draw_participants")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.warn("No se pudo validar la lista oficial del sorteo.", error);
    return findAssignedParticipant(normalizedEmail);
  }

  return data ? fromParticipantRow(data) : findAssignedParticipant(normalizedEmail);
}

export async function markParticipantRegistered(email, authUserId) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !isSupabaseConfigured()) {
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client
    .from("draw_participants")
    .update({
      auth_user_id: authUserId || null,
      status: "registered",
      registered_at: new Date().toISOString(),
    })
    .eq("email", normalizedEmail);

  if (error) {
    console.warn("No se pudo marcar el participante como registrado.", error);
  }
}

export async function listAssignedParticipants() {
  if (!isSupabaseConfigured()) {
    return assignedParticipants;
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("draw_participants")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar participantes del sorteo.", error);
    return assignedParticipants;
  }

  return data.map(fromParticipantRow);
}
