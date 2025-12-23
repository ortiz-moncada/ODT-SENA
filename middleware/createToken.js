import jwt from "jsonwebtoken";
import config from "../config/jwt.js";

export const createToken = (user) => {
  if (!user || !user._id) {
    throw new Error("Usuario inválido para generar token");
  }

  const payload = {
    id: user._id,
    names: user.names,
    rol: user.rol,
  };

  return jwt.sign(payload, config.token_secreto, {expiresIn: config.expiracion || "9h",});
};


