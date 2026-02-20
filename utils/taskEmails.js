import dotenv from "dotenv";
import { stateMap } from "./stateMap.js";
import { transporter } from "../config/email.js";

dotenv.config();

// --- FUNCIÓN AUXILIAR PARA WHATSAPP ---
const enviarWhatsApp = async (numero, mensaje) => {
    const BOT_URL = process.env.BOT_URL || 'http://localhost:4001';
    
    console.log(`--- Intentando enviar WA a: ${numero} a través de ${BOT_URL} ---`); 

    try {
        // Limpieza extrema del número
        let numeroLimpio = String(numero).replace(/\D/g, '').trim();
        
        if (numeroLimpio.length === 10 && !numeroLimpio.startsWith('57')) {
            numeroLimpio = '57' + numeroLimpio;
        }

        // Estructura de datos (Payload)
        // Nota: Algunos bots prefieren 'number' otros 'chatId'
        const payload = {
            number: numeroLimpio, 
            message: mensaje
        };

        const response = await fetch(`${BOT_URL}/v1/messages`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Si hay error 400, intentamos leer el motivo exacto del servidor
        if (!response.ok) {
            const errorTexto = await response.text();
            throw new Error(`Servidor respondió ${response.status}: ${errorTexto}`);
        }

        const data = await response.json();
        console.log(`🚀 Respuesta del Bot en Render:`, data);
    } catch (error) {
        // Este log te dirá exactamente por qué el bot devolvió 400
        console.error(`❌ Error en el fetch de WhatsApp:`, error.message);
    }
};

const prepararAdjuntos = (taskFiles) => {
  const adjuntosBase = [
    {
      filename: "logo.png",
      path: "./image/logo-sena-blanco.png",
      cid: "logoSena",
    },
  ];

  if (taskFiles && taskFiles.length > 0) {
    taskFiles.forEach((file) => {
      let directPath = file.url;
      if (file.url.includes('drive.google.com')) {
        const fileId = file.url.split('/d/')[1]?.split('/')[0];
        if (fileId) {
          directPath = `https://docs.google.com/uc?export=download&id=${fileId}`;
        }
      }

      adjuntosBase.push({
        filename: file.filename || "archivo_adjunto.pdf",
        path: directPath,
        contentType: 'application/pdf' 
      });
    });
  }
  return adjuntosBase;
};

export const enviarCorreoCreacionTarea = async (task) => {
  if (!task?.workers?.length) return;

  const destinatarios = [...task.workers];
  if (task.tribute_id && task.tribute_id.gmail) {
    destinatarios.push(task.tribute_id);
  }

  for (const person of destinatarios) {
    // 1. CORREO (No bloqueante)
    if (person.gmail) {
      transporter.sendMail({
        from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
        to: person.gmail,
        subject: `Nueva tarea: ${task.name}`,
        attachments: prepararAdjuntos(task.attached_files),
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
              <div style="background: #39A900; padding: 20px; text-align: center;">
                <img src="cid:logoSena" alt="SENA ODT" style="max-width: 80px;" />
              </div>
              <div style="padding: 25px; color: #333; line-height: 1.6;">
                <h2 style="margin-top: 0; color: #39A900;">¡Hola ${person.names}!</h2>
                <p>Se ha registrado una <b>nueva tarea</b>.</p>
                <div style="background: #f8f9fa; border-left: 5px solid #39A900; padding: 15px; margin: 20px 0;">
                  <p><b>Tarea:</b> ${task.name}</p>
                  <p><b>Entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        `,
      }).catch(err => console.error(`📧 Error Correo:`, err.message));
    }

    // 2. WHATSAPP (No bloqueante)
    if (person.phone) {
      const mensajeWA = `🆕 *NUEVA TAREA ASIGNADA*\n\n` +
                        `Hola *${person.names}*,\nSe ha registrado una tarea:\n\n` +
                        `📝 *Tarea:* ${task.name}\n` +
                        `📅 *Entrega:* ${new Date(task.delivery_date).toLocaleDateString()}\n\n` +
                        `_Revisa tu correo para ver los detalles._`;
      
      enviarWhatsApp(person.phone, mensajeWA).catch(err => console.error(`❌ Error WA:`, err.message));
    }
  }
};

export const enviarCorreoCambioEstadoTarea = async (task, estadoAnterior) => {
  if (!task?.workers?.length) return;

  const estadoAntes = Number(estadoAnterior);
  const estadoNuevo = Number(task.stateTask);

  const destinatarios = [...task.workers];
  if (task.tribute_id && task.tribute_id.gmail) {
    const yaEstaEnLista = destinatarios.some(w => w.gmail === task.tribute_id.gmail);
    if (!yaEstaEnLista) destinatarios.push(task.tribute_id);
  }

  for (const person of destinatarios) {
    if (person.gmail) {
      transporter.sendMail({
        from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
        to: person.gmail,
        subject: `Actualización de tarea: ${task.name}`,
        attachments: prepararAdjuntos(task.attached_files),
        html: `<div style="padding: 25px; color: #333;"><h2 style="color: #39A900;">Hola ${person.names}</h2><p>El estado cambió.</p></div>`,
      }).catch(err => console.error(`📧 Error Correo Estado:`, err.message));
    }

    if (person.phone) {
      const mensajeWA = `*ACTUALIZACIÓN DE TAREA*\n\nHola *${person.names}*,\n*${task.name}* cambió de estado.`;
      enviarWhatsApp(person.phone, mensajeWA).catch(err => console.error(`❌ Error WA Estado:`, err.message));
    }
  }
};

export const enviarCorreoTareaPorVencer = async (task, horasRestantes, admins = []) => {

  // ---------- Datos de fecha ----------
  const esMonthly = task.isMonthly && task.monthlyPlazo;
  const fechaEntrega = esMonthly
    ? (() => {
        // Para mensuales, la fecha límite es el día monthlyPlazo del mes actual
        const hoy = new Date();
        return new Date(hoy.getFullYear(), hoy.getMonth(), task.monthlyPlazo);
      })()
    : new Date(task.delivery_date);

  const fechaFormateada = fechaEntrega.toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const etiquetaUrgencia = horasRestantes === 24
    ? { color: "#e53e3e", texto: " VENCE EN 24 HORAS", icono: "🔴" }
    : { color: "#dd6b20", texto: " VENCE EN 48 HORAS", icono: "🟠" };


  const gmailsVistos = new Set();
  const destinatarios = [];

  const agregarPersona = (persona, etiquetaRol) => {
    if (!persona || gmailsVistos.has(persona.gmail)) return;
    gmailsVistos.add(persona.gmail);
    destinatarios.push({ ...persona, etiquetaRol });
  };

  // 1. Workers
  (task.workers || []).forEach(w => agregarPersona(w, "Trabajador asignado"));

  // 2. Tribute (cliente)
  if (task.tribute_id?.gmail) agregarPersona(task.tribute_id, "Solicitante");

  // 3. Admins y superadmins (rol 1 y 2)
  (admins || []).forEach(a => {
    const etiqueta = a.rol === 1 ? "Super Admin" : "Administrador";
    agregarPersona(a, etiqueta);
  });

  for (const person of destinatarios) {

    if (person.gmail) {
      transporter.sendMail({
        from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
        to: person.gmail,
        subject: `${etiquetaUrgencia.icono} Tarea por vencer: ${task.name}`,
        attachments: prepararAdjuntos(task.attached_files),
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">

              <!-- Cabecera -->
              <div style="background: ${etiquetaUrgencia.color}; padding: 20px; text-align: center;">
                <img src="cid:logoSena" alt="SENA ODT" style="max-width: 80px;" />
                <h1 style="color: white; margin: 10px 0 0; font-size: 18px; letter-spacing: 1px;">
                  ${etiquetaUrgencia.texto}
                </h1>
              </div>

              <!-- Cuerpo -->
              <div style="padding: 25px; color: #333; line-height: 1.6;">
                <h2 style="margin-top: 0; color: ${etiquetaUrgencia.color};">
                  ¡Hola, ${person.names}!
                </h2>
                <p>
                  La siguiente tarea 
                  <b>vence en ${horasRestantes} horas</b>. 
                  Por favor toma las acciones necesarias.
                </p>

                <!-- Tarjeta de tarea -->
                <div style="background: #f8f9fa; border-left: 5px solid ${etiquetaUrgencia.color}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 6px 0;"><b>📝 Tarea:</b> ${task.name}</p>
                  <p style="margin: 6px 0;"><b>📅 Fecha límite:</b> ${fechaFormateada}</p>
                  <p style="margin: 6px 0;"><b>🏢 Área:</b> ${task.area_id?.name || "Sin área"}</p>
                  <p style="margin: 6px 0;"><b>👤 Tu rol:</b> ${person.etiquetaRol}</p>
                  ${esMonthly ? `<p style="margin: 6px 0;"><b>🔁 Tipo:</b> Tarea mensual (día ${task.monthlyPlazo})</p>` : ""}
                </div>

                <p style="color: #666; font-size: 13px; margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
                  Este es un mensaje automático del sistema SENA ODT. No respondas este correo.
                </p>
              </div>
            </div>
          </div>
        `,
      }).catch(err => console.error(`📧 Error Correo PorVencer [${person.gmail}]:`, err.message));
    }

    if (person.phone) {
      const mensajeWA =
        `${etiquetaUrgencia.icono} *${etiquetaUrgencia.texto.replace(/[⚠️⏰]/g, "").trim()}*\n\n` +
        `Hola *${person.names}* _(${person.etiquetaRol})_,\n\n` +
        `La tarea *${task.name}* vence en *${horasRestantes} horas*.\n\n` +
        `📅 *Fecha límite:* ${fechaFormateada}\n` +
        `🏢 *Área:* ${task.area_id?.name || "Sin área"}\n` +
        (esMonthly ? `🔁 *Tarea mensual* (día ${task.monthlyPlazo})\n` : "") +
        `\n_Revisa el sistema SENA ODT para más detalles._`;

      enviarWhatsApp(person.phone, mensajeWA)
        .catch(err => console.error(`❌ Error WA PorVencer [${person.phone}]:`, err.message));
    }
  }
};