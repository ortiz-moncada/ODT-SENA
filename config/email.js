import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "gmail",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    
    rejectUnauthorized: false 
  },
  
  connectionTimeout: 10000, // 10 segundos
  greetingTimeout: 10000,
});
transporter.verify((error, success) => {
  if (error) {
    console.log(" Error en la configuración del correo:", error);
  } else {
    console.log(" Servidor de correo listo para enviar mensajes");
  }
});