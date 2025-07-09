// index.js

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// --- Configuration ---
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// Folder where attachments will be saved
const DOWNLOAD_FOLDER = 'downloads';
// The search query to filter emails. Examples:
// 'from:someone@example.com'
// 'subject:Invoice'
// 'has:attachment'
const GMAIL_QUERY = 'from:billing@example.com subject:"Your Invoice" has:attachment';

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listMessages(auth) {
  const gmail = google.gmail({version: 'v1', auth});
  console.log(`Searching for emails with query: "${GMAIL_QUERY}"...`);
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: GMAIL_QUERY,
    });
    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      console.log('No messages found.');
      return;
    }
    console.log(`Found ${messages.length} matching emails.`);
    
    // Create download folder if it doesn't exist
    await fs.mkdir(DOWNLOAD_FOLDER, { recursive: true });

    for (const message of messages) {
      await getMessageDetails(gmail, message.id);
    }
  } catch (error) {
    console.error('The API returned an error: ' + error);
  }
}

/**
 * Gets the full details of a message and downloads its attachments.
 * @param {google.gmail_v1.Gmail} gmail The Gmail API client.
 * @param {string} messageId The ID of the message.
 */
async function getMessageDetails(gmail, messageId) {
    try {
        const res = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
        });

        const payload = res.data.payload;
        const headers = payload.headers;
        const subjectHeader = headers.find(header => header.name === 'Subject');
        const dateHeader = headers.find(header => header.name === 'Date');

        const emailDate = new Date(dateHeader.value);
        // Format date as YYYY-MM-DD
        const dateString = emailDate.toISOString().split('T')[0];

        console.log(`\nProcessing email with Subject: "${subjectHeader.value}"`);

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.filename && part.body && part.body.attachmentId) {
                    await downloadAttachment(gmail, messageId, part, dateString);
                }
            }
        }
    } catch (error) {
        console.error(`Error getting message details:`, error);
    }
}

/**
 * Downloads a single attachment.
 * @param {google.gmail_v1.Gmail} gmail The Gmail API client.
 * @param {string} messageId The ID of the message.
 * @param {object} part The message part containing the attachment.
 * @param {string} dateString The formatted date of the email.
 */
async function downloadAttachment(gmail, messageId, part, dateString) {
    const attachmentId = part.body.attachmentId;
    const originalFilename = part.filename;

    try {
        const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: attachmentId,
        });

        const fileData = attachment.data.data;

        // Append the email date to the filename
        const newFilename = `${dateString}_${originalFilename}`;
        const filePath = path.join(DOWNLOAD_FOLDER, newFilename);

        console.log(`  -> Downloading attachment: ${originalFilename}`);
        console.log(`     Saving as: ${newFilename}`);

        await fs.writeFile(filePath, fileData, 'base64');
        console.log(`     Successfully saved to ${filePath}`);

    } catch (error) {
        console.error(`Error downloading attachment ${originalFilename}:`, error);
    }
}


authorize().then(listMessages).catch(console.error);
