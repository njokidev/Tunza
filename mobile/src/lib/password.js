// Live password checks for sign-up. These mirror Django's password validators
// on the backend (length, numeric-only, similarity, common passwords) so people
// see what's wrong while typing instead of after submitting. The backend still
// has the final say — e.g. its common-password list is much longer than ours.

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', '12345678', '123456789',
  '1234567890', '87654321', '11111111', '00000000', 'qwerty123', 'qwertyuiop', 'iloveyou',
  'abc12345', 'abcd1234', 'letmein1', 'welcome1', 'welcome123', 'admin123', 'football',
  'baseball', 'sunshine', 'princess', 'trustno1', 'superman', 'asdfghjk', 'kenya123',
  'nairobi1', 'nairobi123', 'tunza123', 'changeme',
]);

function tooSimilar(password, { full_name = '', email = '' }) {
  const pw = password.toLowerCase();
  if (pw.length < 3) return false;
  const parts = [
    ...full_name.toLowerCase().split(/\s+/),
    ...email.toLowerCase().split('@')[0].split(/[._\-+]/),
    email.toLowerCase().split('@')[0],
  ].filter((p) => p.length >= 3);
  return parts.some((p) => pw.includes(p) || p.includes(pw));
}

/** Returns the list of rules with `ok` flags for the given password. */
export function passwordChecks(password, details = {}) {
  return [
    { key: 'length', label: 'At least 8 characters', ok: password.length >= 8 },
    { key: 'numeric', label: 'Not only numbers', ok: password.length > 0 && !/^\d+$/.test(password) },
    { key: 'similar', label: 'Not based on your name or email', ok: password.length > 0 && !tooSimilar(password, details) },
    { key: 'common', label: 'Not a common password', ok: password.length > 0 && !COMMON.has(password.toLowerCase()) },
  ];
}

export function passwordIsValid(password, details) {
  return passwordChecks(password, details).every((c) => c.ok);
}
