import { transporter } from "../config/email.js";  

export const sendEmail = async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `<p>${message}</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo", error: error.message });
  }
};

export const restablecerContraseña = async (req, res) => {
  const { to, subject } = req.body;

  try {
    const frontendUrl = process.env.FRONTEND_URL; 
    const resetLink = `${frontendUrl}/restablecer`; 

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #39A900; padding: 20px; text-align: center;">
             <h1 style="color: white; margin: 0;">ODT - SENA</h1>
          </div>
          <div style="padding: 30px; color: #333;">
            <h2 style="color: #39A900;">Restablecimiento de contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" target="_blank" 
                style="background-color:#39A900; color:white; padding:15px 25px;
                text-decoration:none; border-radius:5px; font-weight: bold; display: inline-block;">
                RESTABLECER MI CONTRASEÑA
              </a>
            </div>
            
            <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("❌ Error enviando correo de restablecimiento:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo", error: error.message });
  }
};