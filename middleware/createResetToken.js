import jwt from "jsonwebtoken";
import config from "../config/jwt.js";

export const createResetToken = (userId) => {
  return jwt.sign(
    { uid: userId },
    config.token_secreto,
    { expiresIn: "15m" } 
  );
};
