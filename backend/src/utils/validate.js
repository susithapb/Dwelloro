const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(value, name) {
  if (value === undefined || value === null || value === '') return `${name} is required`;
  return null;
}

export function isEmail(value) {
  return EMAIL_RE.test(value || '');
}

export function validEmail(value, name = 'email') {
  if (!value) return `${name} is required`;
  if (!EMAIL_RE.test(value)) return `${name} is not a valid email address`;
  return null;
}

export function minLen(value, min, name) {
  if (!value || value.length < min) return `${name} must be at least ${min} characters`;
  return null;
}

export function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) return `${name} must be one of: ${allowed.join(', ')}`;
  return null;
}

export function collect(...errors) {
  const errs = errors.filter(Boolean);
  return errs.length ? errs[0] : null;
}
