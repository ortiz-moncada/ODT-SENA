import { transporter } from "../config/email.js";

export const sendEmail = async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    await transporter.sendMail({
      from: `"Sistema ODT" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `<p>${message}</p>`,
    });

    res.status(200).json({
      success: true,
      message: "Correo enviado correctamente",
    });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);

    res.status(500).json({
      success: false,
      message: "Error al enviar el correo",
    });
  }
};


export const sendRecoveryEmail = async ({ to, name, link }) => {
  await transporter.sendMail({
    from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Restablecimiento de contraseña",
    attachments: [
      {
        filename: "logo.png",
        path: "./image/logo-sena-blanco.png",
        cid: "logoSistema",
      },
    ],
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f4f6f9; padding:30px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden;">

          <!-- HEADER -->
          <div style="background:#39A900; padding:20px; text-align:center;">
            <img src="cid:logoSistema" style="max-width:220px;" />
          </div>

          <!-- BODY -->
          <div style="padding:25px; color:#333;">
            <h2 style="color:#39A900;">Hola ${name}</h2>

            <p>
              Hemos recibido una solicitud para <b>restablecer tu contraseña</b>.
            </p>

            <div style="text-align:center; margin:30px 0;">
              <a href="${link}"
                 style="
                   background:#39A900;
                   color:#fff;
                   padding:15px 25px;
                   border-radius:6px;
                   text-decoration:none;
                   font-weight:bold;
                 ">
                RESTABLECER CONTRASEÑA
              </a>
            </div>

            <p style="font-size:13px; color:#777;">
              Este enlace expira en 15 minutos.
            </p>

            <p style="font-size:13px;">
              Si no realizaste esta solicitud, puedes ignorar este mensaje.
            </p>
          </div>

          <!-- FOOTER -->
          <div style="background:#f1f1f1; text-align:center; padding:12px; font-size:12px; color:#777;">
            © ${new Date().getFullYear()} Sistema de Gestión<br />
            Este es un mensaje automático, por favor no responder.
          </div>

        </div>
      </div>
    `,
  });
};
