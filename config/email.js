import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true para puerto 465, false para puerto 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Esto evita que la conexión se cierre si el certificado de Render 
    // y el de Gmail tienen pequeñas discrepancias de red
    rejectUnauthorized: false 
  },
  // Aumentamos el tiempo de espera por si la red de Render está lenta
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