import jwt from "jsonwebtoken";

export const createResetToken = (userId) => {
  return jwt.sign(
    { uid: userId },
    process.env.JWT_SECRET || 'secret_key_odt',  // ← mismo secret que en el controlador
    { expiresIn: '1h' }                            // ← más tiempo
  );
};