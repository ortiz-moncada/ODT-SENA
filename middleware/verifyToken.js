import jwt from "jsonwebtoken";
import config from "../config/jwt.js";

export const verifyToken = (req, res, next) => {
  try {
    // Obtener el token del header
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó token de autenticación" });
    }

    // Verificar el token
    const decoded = jwt.verify(token, config.token_secreto);
    
    // Agregar la información del usuario al request
    req.user = decoded;
    
    // Continuar con la siguiente función
    next();
  } catch (error) {
    console.error("Error al verificar token:", error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expirado" });
    }
    
    return res.status(401).json({ message: "Token inválido" });
  }
};