class GmailAttachmentDownloader {
    constructor() {
        this.isAuthenticated = false;
        this.emails = [];
        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Filter elements
        this.senderInput = document.getElementById('sender');
        this.subjectInput = document.getElementById('subject');
        this.dateFromInput = document.getElementById('dateFrom');
        this.dateToInput = document.getElementById('dateTo');
        this.attachmentTypeSelect = document.getElementById('attachmentType');
        this.hasAttachmentCheckbox = document.getElementById('hasAttachment');
        this.customQueryInput = document.getElementById('customQuery');

        // Button elements
        this.searchBtn = document.getElementById('searchBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.authBtn = document.getElementById('authBtn');

        // Status elements
        this.authStatus = document.getElementById('authStatus');
        this.resultCount = document.getElementById('resultCount');

        // Content sections
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.authSection = document.getElementById('authSection');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.downloadProgress = document.getElementById('downloadProgress');

        // Progress elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.downloadLog = document.getElementById('downloadLog');
    }

    bindEvents() {
        this.authBtn.addEventListener('click', () => this.authenticate());
        this.searchBtn.addEventListener('click', () => this.searchEmails());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllAttachments());

        // Auto-generate query when filters change
        const filterInputs = [
            this.senderInput, this.subjectInput, this.dateFromInput, 
            this.dateToInput, this.attachmentTypeSelect, this.hasAttachmentCheckbox
        ];
        
        filterInputs.forEach(input => {
            input.addEventListener('input', () => this.updateQuery());
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();
            this.updateAuthStatus(data.authenticated);
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.updateAuthStatus(false);
        }
    }

    updateAuthStatus(authenticated) {
        this.isAuthenticated = authenticated;
        
        if (authenticated) {
            this.authStatus.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
            this.authStatus.className = 'status-badge status-connected';
            this.authSection.style.display = 'none';
            this.searchBtn.disabled = false;
        } else {
            this.authStatus.innerHTML = '<i class="fas fa-times-circle"></i> Not Authenticated';
            this.authStatus.className = 'status-badge status-disconnected';
            this.authSection.style.display = 'block';
            this.resultsContainer.style.display = 'none';
            this.searchBtn.disabled = true;
        }
    }

    async authenticate() {
        try {
            this.authBtn.disabled = true;
            this.authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            
            const response = await fetch('/api/auth', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.updateAuthStatus(true);
                this.showNotification('Successfully authenticated with Gmail!', 'success');
            } else {
                throw new Error(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showNotification('Authentication failed: ' + error.message, 'error');
        } finally {
            this.authBtn.disabled = false;
            this.authBtn.innerHTML = '<i class="fab fa-google"></i> Authenticate with Gmail';
        }
    }

    updateQuery() {
        if (this.customQueryInput.value.trim()) {
            return; // Don't auto-generate if custom query exists
        }

        const query = this.buildGmailQuery();
        this.customQueryInput.placeholder = `Generated: ${query}`;
    }

    buildGmailQuery() {
        let parts = [];

        if (this.senderInput.value.trim()) {
            parts.push(`from:${this.senderInput.value.trim()}`);
        }

        if (this.subjectInput.value.trim()) {
            parts.push(`subject:"${this.subjectInput.value.trim()}"`);
        }

        if (this.dateFromInput.value) {
            parts.push(`after:${this.dateFromInput.value}`);
        }

        if (this.dateToInput.value) {
            parts.push(`before:${this.dateToInput.value}`);
        }

        if (this.attachmentTypeSelect.value) {
            const typeMap = {
                'pdf': 'filename:pdf',
                'doc': '(filename:doc OR filename:docx)',
                'xls': '(filename:xls OR filename:xlsx)',
                'img': '(filename:jpg OR filename:png OR filename:gif OR filename:jpeg)',
                'zip': '(filename:zip OR filename:rar OR filename:7z)'
            };
            parts.push(typeMap[this.attachmentTypeSelect.value]);
        }

        if (this.hasAttachmentCheckbox.checked) {
            parts.push('has:attachment');
        }

        return parts.length > 0 ? parts.join(' ') : 'has:attachment';
    }

    async searchEmails() {
        if (!this.isAuthenticated) {
            this.showNotification('Please authenticate first', 'error');
            return;
        }

        try {
            this.showLoading(true);
            this.resultsContainer.style.display = 'none';
            
            const query = this.customQueryInput.value.trim() || this.buildGmailQuery();
            
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.emails = data.emails;
                this.displayResults();
                this.showNotification(`Found ${data.emails.length} emails with attachments`, 'success');
            } else {
                throw new Error(data.error || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults() {
        this.resultCount.textContent = `${this.emails.length} emails found`;
        
        if (this.emails.length === 0) {
            this.resultsContainer.innerHTML = `
                <div style="padding: 60px; text-align: center; color: #718096;">
                    <i class="fas fa-search fa-3x" style="margin-bottom: 20px;"></i>
                    <h3>No emails found</h3>
                    <p>Try adjusting your search filters</p>
                </div>
            `;
            this.resultsContainer.style.display = 'block';
            this.downloadAllBtn.disabled = true;
            return;
        }

        let totalAttachments = 0;
        const emailsHtml = this.emails.map(email => {
            totalAttachments += email.attachments.length;
            return this.createEmailItemHtml(email);
        }).join('');

        this.resultsContainer.innerHTML = emailsHtml;
        this.resultsContainer.style.display = 'block';
        this.downloadAllBtn.disabled = false;
        this.downloadAllBtn.innerHTML = `<i class="fas fa-download"></i> Download All (${totalAttachments} files)`;
    }

    createEmailItemHtml(email) {
        const attachmentsHtml = email.attachments.map(attachment => `
            <div class="attachment-item">
                <div class="attachment-info">
                    <div class="attachment-name" title="${attachment.filename}">
                        <i class="${this.getFileIcon(attachment.filename)}"></i>
                        ${attachment.filename}
                    </div>
                    <div class="attachment-size">${this.formatFileSize(attachment.size)}</div>
                </div>
                <button class="download-btn" onclick="app.downloadAttachment('${email.id}', '${attachment.attachmentId}', '${attachment.filename}')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `).join('');

        return `
            <div class="email-item">
                <div class="email-header">
                    <div class="email-subject">${email.subject}</div>
                    <div class="email-date">${this.formatDate(email.date)}</div>
                </div>
                <div class="email-sender">
                    <i class="fas fa-user"></i> ${email.sender}
                </div>
                <div class="attachments-list">
                    ${attachmentsHtml}
                </div>
            </div>
        `;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word', 'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel', 'xlsx': 'fas fa-file-excel',
            'ppt': 'fas fa-file-powerpoint', 'pptx': 'fas fa-file-powerpoint',
            'jpg': 'fas fa-file-image', 'jpeg': 'fas fa-file-image', 'png': 'fas fa-file-image', 'gif': 'fas fa-file-image',
            'zip': 'fas fa-file-archive', 'rar': 'fas fa-file-archive', '7z': 'fas fa-file-archive',
            'txt': 'fas fa-file-alt',
            'csv': 'fas fa-file-csv'
        };
        return iconMap[ext] || 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    async downloadAttachment(messageId, attachmentId, filename) {
        try {
            const response = await fetch('/api/download-attachment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messageId, attachmentId, filename })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            this.downloadBlob(blob, filename);
            this.showNotification(`Downloaded: ${filename}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification(`Failed to download: ${filename}`, 'error');
        }
    }

    async downloadAllAttachments() {
        if (this.emails.length === 0) return;

        let totalAttachments = 0;
        this.emails.forEach(email => totalAttachments += email.attachments.length);

        this.downloadProgress.style.display = 'block';
        this.downloadAllBtn.disabled = true;
        this.clearDownloadLog();

        let downloadedCount = 0;

        for (const email of this.emails) {
            for (const attachment of email.attachments) {
                try {
                    this.addLogEntry(`Downloading: ${attachment.filename}`, 'info');
                    
                    const response = await fetch('/api/download-attachment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            messageId: email.id, 
                            attachmentId: attachment.attachmentId, 
                            filename: attachment.filename 
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();
                    this.downloadBlob(blob, `${email.dateString}_${attachment.filename}`);
                    
                    downloadedCount++;
                    this.updateProgress(downloadedCount, totalAttachments);
                    this.addLogEntry(`✓ Downloaded: ${attachment.filename}`, 'success');
                    
                    // Small delay to prevent overwhelming the server
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error('Download error:', error);
                    this.addLogEntry(`✗ Failed: ${attachment.filename} - ${error.message}`, 'error');
                }
            }
        }

        this.downloadAllBtn.disabled = false;
        this.addLogEntry(`\nDownload completed! ${downloadedCount}/${totalAttachments} files downloaded.`, 'info');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${current} / ${total} attachments downloaded (${percentage}%)`;
    }

    addLogEntry(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        this.downloadLog.appendChild(logEntry);
        this.downloadLog.scrollTop = this.downloadLog.scrollHeight;
    }

    clearDownloadLog() {
        this.downloadLog.innerHTML = '';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0 / 0 attachments downloaded';
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 350px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        switch(type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
}

// Initialize the application
const app = new GmailAttachmentDownloader();
