import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const sendEmail = async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Opciones del correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `<p>${message}</p>`,
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo", error });
  }
};

export const restablecerContraseña = async (req, res) => {
  const { to, subject } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

   const resetLink = `http://localhost:5173/restablecer`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `
        <h2>Restablecimiento de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetLink}" target="_blank" 
          style="background-color:#39A900;color:white;padding:10px 15px;
          text-decoration:none;border-radius:5px;">
          Restablecer contraseña
        </a>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo", error });
  }
};
