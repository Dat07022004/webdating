export const requireActiveUser = (req, res, next) => {
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  const userId = auth?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
};
