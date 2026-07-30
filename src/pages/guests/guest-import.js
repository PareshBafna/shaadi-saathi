import { importGuestsFromCSV } from '../../services/guestService.js';

export class GuestImporter {
    constructor(fileInputId, uploadButtonId, statusContainerId, weddingId) {
        this.fileInput = document.getElementById(fileInputId);
        this.uploadButton = document.getElementById(uploadButtonId);
        this.statusContainer = document.getElementById(statusContainerId);
        this.weddingId = weddingId;

        // Safety check to ensure DOM elements exist before binding listeners
        if (this.fileInput && this.uploadButton) {
            this.initListeners();
        } else {
            console.warn('GuestImporter: Required DOM elements not found on this page.');
        }
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

        try {
            // 1. Set UI to Loading State
            this.uploadButton.disabled = true;
            this.uploadButton.textContent = 'Importing...';
            this.showStatus('Parsing and uploading CSV...', 'info');

            // 2. Delegate the heavy lifting to the PapaParse service function
            const result = await importGuestsFromCSV(file, this.weddingId);
            
            // 3. Handle Success
            this.showStatus(`Successfully imported ${result.count} guests!`, 'success');
            this.fileInput.value = ''; // Clear the file input
            
            // Optional: Dispatch a custom event so other parts of your app (like a table) know to refresh
            document.dispatchEvent(new CustomEvent('guestsImported'));

        } catch (error) {
            // 4. Handle Errors gracefully
            console.error('Import failed:', error);
            this.showStatus(`Import failed: ${error.error || error.message}`, 'error');
        } finally {
            // 5. Reset UI State
            this.uploadButton.disabled = false;
            this.uploadButton.textContent = 'Upload CSV';
        }
    }

    showStatus(message, type) {
        if (!this.statusContainer) return;
        this.statusContainer.textContent = message;
        // Sets the class to 'status-toast error', 'status-toast success', etc. for your CSS
        this.statusContainer.className = `status-toast ${type}`;
    }
}

// Helper wrapper to easily initialize the class from your main router or page load script
export function initGuestImport(activeWeddingId) {
    // Ensure these IDs match your actual HTML structure
    return new GuestImporter('csvFileInput', 'uploadCsvBtn', 'statusContainer', activeWeddingId);
}