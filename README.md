# Gm## 🎨 Features

- 🌐 **Modern Web UI**: Beautiful, responsive interface with real-time feedback
- 🔍 **Advanced Search Filters**: Filter by sender, subject, body content, date range, and file type
- 📎 **Smart Downloads**: Download individual files or batch download all attachments
- 📅 **Automatic Naming**: Prefix filenames with email date (YYYY-MM-DD format)
- 🔐 **Secure OAuth 2.0**: No password storage, secure Google authentication
- 👥 **Multi-Account Support**: Switch between multiple Gmail accounts easily
- 📊 **Real-time Progress**: Live download progress with detailed logs
- 🎯 **Gmail Query Builder**: Auto-generates Gmail search queries from filters
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devicesment Downloader

A Node.js application with a beautiful web UI that automatically downloads attachments from Gmail using Google APIs.

## 🎨 Features

- 🌐 **Modern Web UI**: Beautiful, responsive interface with real-time feedback
- 🔍 **Advanced Search Filters**: Filter by sender, subject, date range, and file type
- 📎 **Smart Downloads**: Download individual files or batch download all attachments
- 📅 **Automatic Naming**: Prefix filenames with email date (YYYY-MM-DD format)
- 🔐 **Secure OAuth 2.0**: No password storage, secure Google authentication
- 📊 **Real-time Progress**: Live download progress with detailed logs
- 🎯 **Gmail Query Builder**: Auto-generates Gmail search queries from filters
- � **Responsive Design**: Works perfectly on desktop and mobile devices

## 🖥️ Screenshots

The application features:
- **Filter Panel**: Easy-to-use search filters with Gmail query preview
- **Results Display**: Clean email list with attachment previews
- **Download Manager**: Real-time progress tracking and logs
- **Authentication Flow**: Secure Google OAuth integration

## 🚀 Quick Start

### Web UI (Recommended)

1. **Install Dependencies**
```bash
npm install
```

2. **Add Google Credentials**
   - Place your `credentials.json` file in the project root
   - See setup instructions below for obtaining credentials

3. **Start the Web Server**
```bash
npm start
```

4. **Open Your Browser**
   - Navigate to `http://localhost:3000`
   - Authenticate with Google when prompted
   - Use the filter panel to search for emails
   - Download attachments with one click!

### Command Line Interface

If you prefer the original CLI version:
```bash
npm run cli
```

## 🛠️ Setup Instructions

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on it and press "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop application"
   - Download the credentials and save as `credentials.json` in your project folder

### 2. Installation

1. Clone or download this project
2. Navigate to the project folder in your terminal
3. Install dependencies:

```bash
npm install
```

### 3. Using the Web Interface

The web UI provides an intuitive way to:

- **Set Filters**: Use dropdown menus and input fields to set search criteria
- **Preview Queries**: See the generated Gmail query before searching
- **Browse Results**: View emails with attachment previews and file sizes
- **Download Options**: Download individual files or batch download all
- **Track Progress**: Monitor download progress with real-time logs

#### Filter Options:

- **From Sender**: Filter emails from specific email addresses
- **Subject Contains**: Search for keywords in email subjects
- **Body Content**: Search for text within email content
- **Date Range**: Limit search to specific date ranges
- **File Type**: Filter by attachment types (PDF, Word, Excel, CSV, Images, Archives)
- **Custom Query**: Use advanced Gmail search syntax for complex queries

#### Multi-Account Support:

- **Switch Accounts**: Click "Switch Account" to authenticate with a different Gmail account
- **Account Display**: Current authenticated account email is displayed in the header
- **Seamless Switching**: No need to restart the application when switching accounts

#### Example Searches:

- From billing emails: `from:billing@company.com has:attachment`
- Monthly reports: `subject:"Monthly Report" has:attachment after:2024/01/01`
- PDF invoices: `subject:invoice filename:pdf`
- CSV exports: `filename:csv subject:export`
- Urgent emails with attachments: `"urgent" has:attachment`
- Large attachments: `has:attachment larger:5M`

## 📁 File Structure

```
gmail-attachment-downloader/
├── server.js               # Web server (Express.js)
├── index.js                # Original CLI application
├── package.json            # Project dependencies and scripts
├── public/                 # Web UI files
│   ├── index.html         # Main web interface
│   ├── style.css          # Styling and responsive design
│   └── script.js          # Frontend JavaScript logic
├── credentials.json        # Google OAuth credentials (you add this)
├── token.json             # Auto-generated after first auth
├── downloads/             # Downloaded attachments (auto-created)
└── README.md             # Documentation
```

## 🎯 Usage Examples

### Web Interface Workflow

1. **Authentication**: Click "Authenticate with Gmail" and follow OAuth flow
2. **Set Filters**: Choose from sender, subject, date range, file type filters
3. **Search**: Click "Search Emails" to find matching messages
4. **Review**: Browse results with email previews and attachment info
5. **Download**: Click individual download buttons or "Download All"
6. **Monitor**: Watch real-time progress in the download log

### Common Use Cases

- **📧 Invoice Collection**: `from:billing@company.com subject:invoice has:attachment`
- **📊 Report Downloads**: `subject:"monthly report" has:attachment after:2024/01/01`
- **🎯 Specific Sender**: `from:important@client.com has:attachment`
- **📅 Date Range**: `has:attachment after:2024/06/01 before:2024/07/01`
- **📎 File Types**: `filename:pdf subject:contract`

## Security Notes

- Keep your `credentials.json` and `token.json` files secure
- Add them to `.gitignore` if using version control
- The token.json file is created automatically after first authentication

## Troubleshooting

- **"No messages found"**: Check your `GMAIL_QUERY` - it might be too restrictive
- **Authentication errors**: Delete `token.json` and re-authenticate
- **API errors**: Ensure Gmail API is enabled in Google Cloud Console

## License

MIT License - feel free to modify and use as needed!
