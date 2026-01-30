import mongoose from "mongoose";
import usersModel from "../models/users.js";
import Task from "../models/tasks.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createToken } from "../middleware/createToken.js";
import { createResetToken } from "../middleware/createResetToken.js"; 
import nodemailer from "nodemailer";

// FUNCIONES AUXILIARES 
const ensureJefaturaArea = async () => {
  try {
    const Area = mongoose.model('Area');
    let jefatura = await Area.findOne({ name: "Jefatura General" });
    if (!jefatura) {
      jefatura = await Area.create({
        name: "Jefatura General",
        description: "Área de dirección general y administración superior",
        state: 1
      });
    }
    return jefatura._id;
  } catch (error) {
    throw error;
  }
};

//  CONTROLADORES 

export const loginUser = async (req, res) => {
  const { gmail, password } = req.body;
  try {
    const user = await usersModel.findOne({ gmail }).lean();
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (user.state !== 1) return res.status(403).json({ message: "Usuario inactivo" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = createToken(user);
    res.status(200).json({ message: "Login exitoso", token, user });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", details: error.message });
  }
};

export const postUser = async (req, res) => {
  try {
    // 1. Extraer los datos correctamente
    const userData = req.body.data || req.body;
    const { names, identification, gmail, password, rol, areaId } = userData;

    // 2. Validar existencia
    const existingUser = await usersModel.findOne({ $or: [{ gmail }, { identification }] });
    if (existingUser) return res.status(400).json({ error: "Ya existe el usuario" });

    // 3. Normalizar Area
    let normalizedAreaId = areaId || null;
    if (rol === 1 && !normalizedAreaId) normalizedAreaId = await ensureJefaturaArea();

    // 4. Crear el usuario (PASAMOS LA PASSWORD SIN ENCRIPTAR AQUÍ)
    const user = new usersModel({ 
      ...userData, 
      areaId: normalizedAreaId, 
      state: userData.state || 1 
    });

    // El modelo se encargará de encriptar gracias al .pre('save')
    await user.save();
    res.status(201).json({ message: "Usuario creado", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const getUser = async (req, res) => {
  try {
    const users = await usersModel.find().lean();
    const Area = mongoose.model("Area");
    const usersWithTasks = await Promise.all(users.map(async (user) => {
      const tasks = await Task.find({ workers: user._id }).lean();
      const areaId = user.areaId || user.area_id;
      let areaName = "Sin área";
      if (areaId && mongoose.Types.ObjectId.isValid(areaId)) {
        const area = await Area.findById(areaId).lean();
        if (area) areaName = area.name;
      }
      return { ...user, areaName, tasks };
    }));
    res.json(usersWithTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usersModel.findById(id).lean();
    if (!user) return res.status(404).json({ error: "No encontrado" });
    const tasks = await Task.find({ workers: id }).lean();
    res.json({ ...user, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// RECUPERACIÓN DE CONTRASEÑA

export const sendRecoveryEmail = async (req, res) => {
  try {
    const { gmail } = req.params;
    const user = await usersModel.findOne({ gmail });
    if (!user) return res.status(404).json({ message: "Correo no registrado" });

    const resetToken = createResetToken(user._id);
    
    // Prioridad 1: Variable del .env | Prioridad 2: Backup manual
   const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    
    // IMPORTANTE: Verifica si tu router de Vue usa Hash (#). 
    // Si tu URL normal es localhost:5173/#/login, usa el # abajo:
    const resetLink = `${frontendUrl}/restablecer-password/${resetToken}`;

    // ESTO ES PARA TI: Mira la terminal del backend al enviar el correo
    console.log("🔗 URL detectada del .env:", process.env.FRONTEND_URL);
    console.log("🚀 Enlace final enviado:", resetLink);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
      to: gmail,
      subject: "Restablecimiento de contraseña",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color: #39A900;">Hola, ${user.names}</h2>
          <p>Haz clic en el botón para restablecer tu clave:</p>
          <a href="${resetLink}" style="background: #39A900; color: white; padding: 10px; text-decoration: none;">
            RESTABLECER CONTRASEÑA
          </a>
        </div>`
    });

    res.status(200).json({ message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ message: "Error al enviar el correo" });
  }
};

export const resetPasswordUpdate = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    // Verificar token (Asegúrate que JWT_SECRET en .env sea igual al de createResetToken)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_odt');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await usersModel.findByIdAndUpdate(decoded.uid, { password: hashedPassword });

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(400).json({ message: "El enlace ha expirado o es inválido" });
  }
};

//OTROS MÉTODOS DE ACTUALIZACIÓN 

export const putUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersModel.findByIdAndUpdate(id, { password: hashedPassword });
    res.json({ message: "Actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Falla" });
  }
};

export const putUserAll = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...rest } = req.body;
    if (password) rest.password = await bcrypt.hash(password, 10);
    const user = await usersModel.findByIdAndUpdate(id, rest, { new: true });
    res.json({ message: "Usuario actualizado", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getActive = async (req, res) => {
  try {
    const users = await usersModel.find({ state: 1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInactive = async (req, res) => {
  try {
    const users = await usersModel.find({ state: 2 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCorreo = async (req, res) => {
  try {
    const user = await usersModel.findOne({ gmail: req.params.gmail });
    if (!user) return res.status(404).json({ message: "No encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
};