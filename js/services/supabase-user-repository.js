import { clearCurrentUser as clearLocalUser, getCurrentUser as getLocalUser, setCurrentUser } from "./local-user-repository.js?v=admin-user-manager";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

function fromPlayerRow(row) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    team: row.favorite_team,
    alias: row.alias,
    paymentStatus: row.payment_status,
    role: row.role,
    points: row.points,
    registeredAt: row.created_at,
  };
}

function toPlayerPayload(user) {
  return {
    name: user.name,
    phone: user.phone,
    email: user.email,
    auth_user_id: user.authUserId || null,
    favorite_team: user.team,
    alias: user.alias,
    payment_status: user.paymentStatus || "Activo",
    role: user.role || "player",
  };
}

export async function getCurrentUser() {
  return getLocalUser();
}

export async function clearCurrentUser() {
  clearLocalUser();
}

export async function activateUserSession(user) {
  setCurrentUser(user);
  return user;
}

export async function listUsers() {
  const client = await getSupabaseClient();

  if (!client) {
    return [];
  }

  const { data: authData } = await client.auth.getUser();
  let isAdmin = false;

  if (authData?.user) {
    try {
      const { data } = await client.rpc("is_combi_admin");
      isAdmin = Boolean(data);
    } catch {
      isAdmin = false;
    }
  }

  const tableName = isAdmin ? "players" : "player_public_profiles";
  let { data, error } = await client
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error && tableName === "player_public_profiles") {
    const fallback = await client
      .from("players")
      .select("*")
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  return data.map(fromPlayerRow);
}

export async function clearUsers() {
  const client = await getSupabaseClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("players").delete().neq("email", "");

  if (error) {
    throw error;
  }
}

export async function saveUser(user) {
  const client = await getSupabaseClient();

  if (!client) {
    setCurrentUser(user);
    return user;
  }

  const { data, error } = await client
    .from("players")
    .upsert(toPlayerPayload(user), { onConflict: "email" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const savedUser = fromPlayerRow(data);
  setCurrentUser(savedUser);
  return savedUser;
}

export async function findUserByEmail(email) {
  const client = await getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("players").select("*").eq("email", email).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromPlayerRow(data) : null;
}

export async function updateUserPoints(playerId, points) {
  const client = await getSupabaseClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("players").update({ points }).eq("id", playerId);

  if (error) {
    throw error;
  }
}

export async function updateUser(userId, patch) {
  const client = await getSupabaseClient();

  if (!client) {
    return null;
  }

  const payload = {};

  if ("name" in patch) payload.name = patch.name;
  if ("alias" in patch) payload.alias = patch.alias;
  if ("phone" in patch) payload.phone = patch.phone;
  if ("email" in patch) payload.email = patch.email;
  if ("team" in patch) payload.favorite_team = patch.team;
  if ("paymentStatus" in patch) payload.payment_status = patch.paymentStatus;
  if ("role" in patch) payload.role = patch.role;

  const { data, error } = await client
    .from("players")
    .update(payload)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromPlayerRow(data) : null;
}

export async function deleteUser(userId) {
  const client = await getSupabaseClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("players").delete().eq("id", userId);

  if (error) {
    throw error;
  }
}
