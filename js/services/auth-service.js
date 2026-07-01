import { isSupabaseConfigured, getSupabaseClient } from "./supabase-client.js";
import { readJson, writeJson } from "./storage.js";

const localAccountsKey = "combiSeasonAccounts";
const productionUrl = "https://combiseason.com/index.html";

function listLocalAccounts() {
  return readJson(localAccountsKey, []);
}

function saveLocalAccount(account) {
  const accounts = listLocalAccounts();
  const existingIndex = accounts.findIndex((item) => item.email === account.email);

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  writeJson(localAccountsKey, accounts);
}

export async function signUpUser({ email, password, metadata }) {
  if (!isSupabaseConfigured()) {
    const userId = crypto.randomUUID();
    saveLocalAccount({ userId, email, password, metadata });
    return { userId, needsEmailConfirmation: false };
  }

  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    throw error;
  }

  return {
    userId: data.user?.id,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signInUser({ email, password }) {
  if (!isSupabaseConfigured()) {
    const account = listLocalAccounts().find(
      (item) => item.email === email && item.password === password
    );

    if (!account) {
      throw new Error("Email o contraseña incorrectos.");
    }

    return {
      userId: account.userId || email,
      user: {
        id: account.userId || email,
        email,
        user_metadata: account.metadata || {},
      },
    };
  }

  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return { userId: data.user?.id, user: data.user };
}

export async function signOutUser() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getSessionUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    return null;
  }

  return data.user || null;
}

export async function resetPasswordForEmail(email) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = await getSupabaseClient();
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const baseUrl = isLocalHost
    ? `${window.location.origin}${window.location.pathname}`
    : productionUrl;
  const redirectTo = `${baseUrl}#restablecer`;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    throw error;
  }
}

export async function updatePassword(password) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}
