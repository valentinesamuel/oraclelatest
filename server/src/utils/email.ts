const EMAIL_DOMAIN = '@ng.ab-inbev.com';
const EMAIL_REGEX = /^[a-z0-9._-]+@ng\.ab-inbev\.com$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailDomain(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function buildEmail(prefix: string): string {
  return normalizeEmail(prefix + EMAIL_DOMAIN);
}
