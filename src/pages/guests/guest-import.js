import { guestService } from '../../services/guestService.js';

export class GuestImporter {
    constructor(fileInputId, uploadButtonId, statusContainerId, weddingId) {
        this.fileInput = document.getElementById(fileInputId);
        this.uploadButton = document.getElementById(uploadButtonId);
        this.statusContainer = document.getElementById(statusContainerId);
        this.weddingId = weddingId;

        this.initListeners();
    }

    initListeners() {
        this.uploadButton.addEventListener('click', () => this.handleUpload());
    }

    async handleUpload() {
        const file = this.fileInput.files[0];
        if (!file) {
            this.showStatus('Please select a CSV file first.', 'error');
            return;
        }

        this.showStatus('Parsing CSV...', 'info');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvData = event.target.result;
                const parsedGuests = this.parseCSV(csvData);
                
                this.showStatus(`Uploading ${parsedGuests.length} guests...`, 'info');
                
                await guestService.bulkAddGuests(parsedGuests);
                this.showStatus('Successfully imported all guests!', 'success');
                
                // Optional: Trigger a UI refresh event here
            } catch (error) {
                console.error('Import failed:', error);
                this.showStatus(`Import failed: ${error.message}`, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    parseCSV(csvText) {
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        const headers = rows.shift().split(',').map(h => h.trim().toLowerCase());
        
        // Expected headers: name, phone, email, dietary_pref
        return rows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const guestObj = { wedding_id: this.weddingId };
            
            headers.forEach((header, index) => {
                // Map CSV headers to database columns
                if (header === 'diet' || header === 'dietary_pref') {
                    guestObj.dietary_pref = values[index] || 'veg';
                } else if (header === 'name' || header === 'phone' || header === 'email') {
                    guestObj[header] = values[index];
                }
            });

            return guestObj;
        });
    }

    showStatus(message, type) {
        this.statusContainer.textContent = message;
        this.statusContainer.className = `status-toast ${type}`;
    }
}