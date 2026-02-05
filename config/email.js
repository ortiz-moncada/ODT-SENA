import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", 
  port: 587,               
  secure: false,           
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false 
  },
  connectionTimeout: 20000, 
  greetingTimeout: 20000,
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Error en la configuración del correo:", error.message);
  } else {
    console.log("✅ Servidor de correo listo para enviar mensajes");
  }
});