export const adminEmails = ["jaimoro909@hotmail.com"];

export function isAdminEmail(email) {
  return adminEmails.includes(email.toLowerCase());
}
