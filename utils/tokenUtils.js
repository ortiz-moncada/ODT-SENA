import jwt from "jsonwebtoken";
import config from "../config/jwt.js";

class TokenUtils {
  static generateAccessToken(payload) {
    return jwt.sign(payload, config.secret, {
      expiresIn: config.expiresIn,
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, config.refreshSecret, {
      expiresIn: config.refreshExpiresIn,
    });
  }

  static generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.secret);
    } catch (error) {
      throw new Error("Token inválido o expirado");
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.refreshSecret);
    } catch (error) {
      throw new Error("Refresh token inválido o expirado");
    }
  }

  static decode(token) {
    return jwt.decode(token);
  }
}

export default TokenUtils;
