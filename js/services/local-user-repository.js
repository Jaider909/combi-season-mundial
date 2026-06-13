import { readJson, removeJson, writeJson } from "./storage.js";

const currentUserKey = "combiSeasonUser";
const usersKey = "combiSeasonUsers";

export function getCurrentUser() {
  return readJson(currentUserKey, null);
}

export function setCurrentUser(user) {
  writeJson(currentUserKey, user);
}

export function activateUserSession(user) {
  setCurrentUser(user);
  return user;
}

export function clearCurrentUser() {
  removeJson(currentUserKey);
}

export function listUsers() {
  return readJson(usersKey, []);
}

export function clearUsers() {
  writeJson(usersKey, []);
}

export function saveUser(user) {
  const users = listUsers();
  const existingIndex = users.findIndex((item) => item.email === user.email);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.unshift(user);
  }

  writeJson(usersKey, users);
  setCurrentUser(user);
  return user;
}

export function findUserByEmail(email) {
  return listUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

export function updateUserPoints(playerId, points) {
  const users = listUsers().map((user) => (user.id === playerId ? { ...user, points } : user));
  const currentUser = getCurrentUser();

  writeJson(usersKey, users);

  if (currentUser?.id === playerId) {
    setCurrentUser({ ...currentUser, points });
  }
}

export function updateUser(userId, patch) {
  const users = listUsers();
  const nextUsers = users.map((user) => (user.id === userId ? { ...user, ...patch } : user));
  const updatedUser = nextUsers.find((user) => user.id === userId) || null;
  const currentUser = getCurrentUser();

  writeJson(usersKey, nextUsers);

  if (updatedUser && currentUser?.id === userId) {
    setCurrentUser(updatedUser);
  }

  return updatedUser;
}

export function deleteUser(userId) {
  const currentUser = getCurrentUser();
  const users = listUsers().filter((user) => user.id !== userId);

  writeJson(usersKey, users);

  if (currentUser?.id === userId) {
    clearCurrentUser();
  }
}
