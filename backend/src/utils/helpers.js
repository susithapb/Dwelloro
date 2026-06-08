/**
 * Strip internal Mongoose fields and sensitive data from a document.
 */
export const strip = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  delete obj.password_hash;
  return obj;
};

/**
 * Current ISO timestamp string.
 */
export const now = () => new Date().toISOString();

/**
 * Check the maximum limit of properties for free tier
 */
const PLAN_LIMITS = { free: 3, starter: 25, pro: 100, enterprise: Infinity };
export function planLimitFor(tier) {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}
