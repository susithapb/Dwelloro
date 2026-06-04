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
