import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Auth } from 'googleapis';
import readline from 'readline';

const CREDENTIALS_PATH = './data/google-credentials.json';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './data/google-token.json';

export const getAuth2Client = async () => {
  // Load client secrets from a local file.
  const credentials = readFileSync(CREDENTIALS_PATH, 'utf-8');
  // Authorize a client with credentials, then call the Google Drive API.
  const oAuth2Client = await authorize(JSON.parse(credentials));

  return oAuth2Client;
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
async function authorize(credentials: any) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new Auth.OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const token = await getAccessToken(oAuth2Client);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

function readlineQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
async function getAccessToken(oAuth2Client: Auth.OAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);

  const code = await readlineQuestion('Enter the code from that page here: ');
  const res = await oAuth2Client.getToken(code);
  const { tokens } = res;

  // Store the token to disk for later program executions
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token stored to', TOKEN_PATH);

  return tokens;
}
