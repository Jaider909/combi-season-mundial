import * as localRepository from "./local-user-repository.js?v=admin-user-manager";
import * as supabaseRepository from "./supabase-user-repository.js?v=admin-user-manager";
import { isSupabaseConfigured } from "./supabase-client.js";

function repository() {
  return isSupabaseConfigured() ? supabaseRepository : localRepository;
}

export function isCloudMode() {
  return isSupabaseConfigured();
}

export function getCurrentUser() {
  return repository().getCurrentUser();
}

export function clearCurrentUser() {
  return repository().clearCurrentUser();
}

export function activateUserSession(user) {
  return repository().activateUserSession(user);
}

export function listUsers() {
  return repository().listUsers();
}

export function clearUsers() {
  return repository().clearUsers();
}

export function saveUser(user) {
  return repository().saveUser(user);
}

export function findUserByEmail(email) {
  return repository().findUserByEmail(email);
}

export function updateUserPoints(playerId, points) {
  return repository().updateUserPoints(playerId, points);
}

export function updateUser(userId, patch) {
  return repository().updateUser(userId, patch);
}

export function deleteUser(userId) {
  return repository().deleteUser(userId);
}
