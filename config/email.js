import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configura el transporte (usando Gmail como ejemplo)
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // tu correo
    pass: process.env.EMAIL_PASS   // contraseña o app password
  }
});

// 🔹 Verifica conexión al servidor de correo
transporter.verify()
  .then(() => console.log(" Servidor de correo listo"))
  .catch(err => console.error("Error al conectar con el servidor de correo:", err));
