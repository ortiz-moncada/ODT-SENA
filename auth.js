import fs from "fs";
import { google } from "googleapis";
import readline from "readline";

const CREDENTIALS_PATH = "./credentials-oauth.json";
const TOKEN_PATH = "./token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } =
  credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("🔗 Autoriza esta app visitando esta URL:\n", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\n📌 Pega aquí el código: ", async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ Token guardado correctamente");
  rl.close();
});
