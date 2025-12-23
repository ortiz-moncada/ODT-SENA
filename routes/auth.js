import express from "express";
import bcrypt from "bcryptjs";
import TokenUtils from "../utils/tokenUtils.js";
import { authenticate } from "../middleware/auth.js";
import Users from "../models/users.js";

const router = express.Router();


router.post("/register", async (req, res) => {
  try {
    const { gmail, password, names, identification } = req.body;

    if (!gmail || !password) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });
    }

    // Verificar si el usuario ya existe
    const existingUser = await Users.findOne({ gmail });
    if (existingUser) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = new Users({
      names,
      identification,
      gmail,
      password: hashedPassword,
      rol: 3, // por defecto usuario normal
    });

    await user.save();

    // Generar tokens
    const { accessToken, refreshToken } = TokenUtils.generateTokens({
      id: user._id,
      email: user.gmail,
      role: user.rol,
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: {
        id: user._id,
        gmail: user.gmail,
        names: user.names,
        rol: user.rol,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al registrar usuario",
      message: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { gmail, password } = req.body;

    if (!gmail || !password) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });
    }

    // Buscar usuario
    const user = await Users.findOne({ gmail });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Validar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar tokens
    const { accessToken, refreshToken } = TokenUtils.generateTokens({
      id: user._id,
      email: user.gmail,
      role: user.rol,
    });

    res.json({
      message: "Login exitoso",
      user: {
        id: user._id,
        gmail: user.gmail,
        names: user.names,
        rol: user.rol,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al iniciar sesión",
      message: error.message,
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token es requerido" });
    }

    // Verificar refresh token
    const decoded = TokenUtils.verifyRefreshToken(refreshToken);

    // Buscar usuario
    const user = await Users.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Generar nuevo access token
    const accessToken = TokenUtils.generateAccessToken({
      id: user._id,
      email: user.gmail,
      role: user.rol,
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({
      error: "Refresh token inválido o expirado",
      message: error.message,
    });
  }
});


router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      user: {
        id: user._id,
        gmail: user.gmail,
        names: user.names,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener el perfil",
      message: error.message,
    });
  }
});

router.post("/logout", authenticate, (req, res) => {
  // Aquí podrías agregar el token a una blacklist si lo manejas así
  res.json({ message: "Logout exitoso" });
});

export default router;
