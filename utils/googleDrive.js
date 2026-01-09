import { google } from "googleapis";
import fs from "fs";
import { Readable } from "stream";

const CREDENTIALS_PATH = "./credentials-oauth.json";
const TOKEN_PATH = "./token.json";

//  Carpeta destino en Drive
const FOLDER_ID = "1PqHMgnu5MgspMUbz2TZLYTlCfoQSZvaR";

// OAuth
function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

//  SUBIDA SEGURA (NUNCA TUMBA EL BACKEND)
export async function uploadToDrive(file) {
  if (!file || !file.buffer) {
    console.warn("⚠️ Archivo inválido o sin buffer");
    return null;
  }

  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: "v3", auth });

    console.log(" Subiendo a Drive:", {
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    });

    const bufferStream = Readable.from(file.buffer);

    const response = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: bufferStream,
      },
      fields: "id",
    });

    const fileId = response.data.id;

    //  Público
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const result = await drive.files.get({
      fileId,
      fields: "webViewLink, webContentLink",
    });

    console.log(" Drive OK:", result.data);

    return {
      id: fileId,
      webViewLink: result.data.webViewLink,
      webContentLink: result.data.webContentLink,
    };

  } catch (error) {
    console.error("🔥 ERROR REAL GOOGLE DRIVE:");
    console.error(error?.response?.data || error.message);
    return null; // 👈 CLAVE: NO ROMPER NADA
  }
}
