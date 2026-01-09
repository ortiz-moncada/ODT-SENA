import fs from "fs";
import { google } from "googleapis";
import readline from "readline";

const CREDENTIALS_PATH = "./credentials-oauth.json";
const TOKEN_PATH = "./token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// 1️ Leer credenciales
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } =
  credentials.installed || credentials.web;

// 2️ Crear cliente OAuth
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// 3️ Generar URL de autorización
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\n Autoriza aquí:\n", authUrl, "\n");

// 4 Pedir código por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(" Pega aquí el código: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("\n Token guardado correctamente en token.json");

  } catch (error) {
    console.error(" Error al obtener el token:", error.message);
  } finally {
    rl.close();
  }
});