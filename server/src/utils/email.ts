const EMAIL_DOMAIN = '@ng.ab-inbev.com';
const EMAIL_REGEX = /^[a-z0-9._-]+@ng\.ab-inbev\.com$/;
const ACCEPTED_DOMAINS = ['@ng.ab-inbev.com', '@ab-inbev.com'];

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailDomain(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function buildEmail(prefix: string): string {
  return normalizeEmail(prefix + EMAIL_DOMAIN);
}

export function extractEmailLocalPart(raw: string): string | null {
  const normalized = normalizeEmail(raw);
  if (!normalized.includes('@')) return normalized;
  const atIdx = normalized.lastIndexOf('@');
  const domain = normalized.slice(atIdx);
  if (!ACCEPTED_DOMAINS.includes(domain)) return null;
  return normalized.slice(0, atIdx);
}

export function validatePrefixFormat(prefix: string): boolean {
  return /^[a-z]+\.[a-z]+$/.test(prefix);
}
