const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Store the authenticated client
let authClient = null;

// Middleware
app.use(express.json());
app.use(express.static('public'));

/**
 * Reads previously authorized credentials from the save file.
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
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
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
 * Load or request authorization to call APIs.
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
 * Format file size in bytes to human readable format
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 0;
  return parseInt(bytes);
}

/**
 * Get email details with attachments
 */
async function getEmailDetails(gmail, messageId) {
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const payload = res.data.payload;
    const headers = payload.headers;
    
    const subjectHeader = headers.find(header => header.name === 'Subject');
    const dateHeader = headers.find(header => header.name === 'Date');
    const fromHeader = headers.find(header => header.name === 'From');

    const emailDate = new Date(dateHeader ? dateHeader.value : Date.now());
    const dateString = emailDate.toISOString().split('T')[0];

    const email = {
      id: messageId,
      subject: subjectHeader ? subjectHeader.value : 'No Subject',
      sender: fromHeader ? fromHeader.value : 'Unknown Sender',
      date: emailDate.toISOString(),
      dateString: dateString,
      attachments: []
    };

    // Extract attachments from parts
    const extractAttachments = (parts) => {
      if (!parts) return;
      
      for (const part of parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          email.attachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            mimeType: part.mimeType,
            size: formatFileSize(part.body.size)
          });
        }
        
        // Recursively check nested parts
        if (part.parts) {
          extractAttachments(part.parts);
        }
      }
    };

    extractAttachments(payload.parts);

    return email.attachments.length > 0 ? email : null;
  } catch (error) {
    console.error(`Error getting email details for ${messageId}:`, error);
    return null;
  }
}

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Check authentication status
app.get('/api/auth-status', async (req, res) => {
  try {
    const client = await loadSavedCredentialsIfExist();
    res.json({ authenticated: !!client });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Authenticate with Gmail
app.post('/api/auth', async (req, res) => {
  try {
    authClient = await authorize();
    res.json({ success: true, message: 'Authentication successful' });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed: ' + error.message 
    });
  }
});

// Search emails
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!authClient) {
      authClient = await loadSavedCredentialsIfExist();
    }
    
    if (!authClient) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    console.log(`Searching for emails with query: "${query}"`);
    
    const searchRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50 // Limit to prevent overwhelming the UI
    });

    const messages = searchRes.data.messages || [];
    console.log(`Found ${messages.length} matching emails`);

    const emails = [];
    
    // Process emails in parallel for better performance
    const emailPromises = messages.map(message => getEmailDetails(gmail, message.id));
    const emailResults = await Promise.all(emailPromises);
    
    // Filter out null results (emails without attachments)
    emailResults.forEach(email => {
      if (email) {
        emails.push(email);
      }
    });

    console.log(`${emails.length} emails have attachments`);

    res.json({ 
      success: true, 
      emails: emails,
      totalFound: messages.length,
      withAttachments: emails.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed: ' + error.message 
    });
  }
});

// Download attachment
app.post('/api/download-attachment', async (req, res) => {
  try {
    const { messageId, attachmentId, filename } = req.body;
    
    if (!authClient) {
      authClient = await loadSavedCredentialsIfExist();
    }
    
    if (!authClient) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    });

    const fileData = attachment.data.data;
    const buffer = Buffer.from(fileData, 'base64');
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });
    
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed: ' + error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gmail Attachment Downloader UI is running on http://localhost:${PORT}`);
  console.log(`📧 Make sure you have your credentials.json file in the project root`);
  console.log(`🔧 Configure your search filters and start downloading attachments!`);
});
