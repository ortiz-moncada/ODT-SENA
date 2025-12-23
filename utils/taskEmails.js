import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(" Variables EMAIL no configuradas");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const enviarCorreoCreacionTarea = async (task) => {
  if (!task?.workers?.length) return;

  for (const worker of task.workers) {
    if (!worker.gmail) continue;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: worker.gmail,
      subject: `Nueva tarea: ${task.name}`,
      html: `
        <h3>Hola ${worker.names}</h3>
        <p>Se te asignó una nueva tarea</p>
        <p><b>${task.name}</b></p>
        <p>Fecha entrega: ${new Date(task.delivery_date).toLocaleDateString()}</p>
      `,
    });
  }
};
