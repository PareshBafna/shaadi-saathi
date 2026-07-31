import { getFamilies, createFamily, assignGuestToFamily } from '../../services/familyService.js';
import { getGuests } from '../../services/guestService.js';

export class FamilyManager {
    constructor(containerId, weddingId) {
        this.container = document.getElementById(containerId);
        this.weddingId = weddingId;

        if (this.container) {
            this.init();
        } else {
            console.warn(`FamilyManager: Container '${containerId}' not found.`);
        }
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        try {
            this.container.innerHTML = '<p class="text-center text-gray-500">Loading families and guests...</p>';
            
            const [families, guests] = await Promise.all([
                getFamilies(this.weddingId),
                getGuests(this.weddingId)
            ]);

            this.render(families, guests);
            this.attachListeners(families, guests);
        } catch (error) {
            console.error('Error loading family manager data:', error);
            this.container.innerHTML = '<p class="text-center text-red-500">Failed to load family management tools.</p>';
        }
    }

    render(families, guests) {
        this.container.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Family & Household Management</h2>
                
                <!-- Create Family Form -->
                <div class="flex gap-3 mb-8">
                    <input 
                        type="text" 
                        id="newFamilyName" 
                        placeholder="Enter family name (e.g., The Bafna Family)" 
                        class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                        id="createFamilyBtn" 
                        class="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Add Family
                    </button>
                </div>

                <!-- Families List Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="familiesGrid">
                    ${families.length === 0 ? '<p class="text-gray-500 col-span-2">No families created yet. Add one above!</p>' : ''}
                    
                    ${families.map(family => {
                        const familyGuests = guests.filter(g => g.family_id === family.id);
                        return `
                            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="font-bold text-lg text-gray-800">${family.family_name}</h3>
                                    <span class="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">
                                        ${familyGuests.length} Member(s)
                                    </span>
                                </div>
                                <ul class="text-sm text-gray-600 space-y-1 mb-4">
                                    ${familyGuests.length === 0 ? '<li class="italic text-gray-400">No guests assigned yet</li>' : 
                                        familyGuests.map(g => `<li class="flex justify-between items-center bg-white px-3 py-1.5 rounded border border-gray-100"><span>${g.name}</span><span class="text-xs text-gray-400 uppercase">${g.dietary_pref}</span></li>`).join('')
                                    }
                                </ul>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Unassigned Guests Section -->
                <div class="mt-10 pt-6 border-t border-gray-200">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Assign Unassigned Guests</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700 text-sm">
                                    <th class="p-3">Guest Name</th>
                                    <th class="p-3">Phone</th>
                                    <th class="p-3">Assign to Family</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${guests.filter(g => !g.family_id).length === 0 ? `
                                    <tr><td colspan="3" class="p-4 text-center text-gray-500">All guests have been assigned to families!</td></tr>
                                ` : ''}
                                ${guests.filter(g => !g.family_id).map(guest => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="p-3 font-medium text-gray-800">${guest.name}</td>
                                        <td class="p-3 text-gray-600">${guest.phone || '-'}</td>
                                        <td class="p-3">
                                            <select data-guest-id="${guest.id}" class="family-select border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                                                <option value="">Select Family...</option>
                                                ${families.map(f => `<option value="${f.id}">${f.family_name}</option>`).join('')}
                                            </select>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners(families, guests) {
        // Handle family creation
        const createBtn = document.getElementById('createFamilyBtn');
        const nameInput = document.getElementById('newFamilyName');

        if (createBtn && nameInput) {
            createBtn.addEventListener('click', async () => {
                const familyName = nameInput.value.trim();
                if (!familyName) {
                    alert('Please enter a family name.');
                    return;
                }

                try {
                    createBtn.disabled = true;
                    createBtn.textContent = 'Creating...';
                    await createFamily(this.weddingId, familyName);
                    nameInput.value = '';
                    await this.loadData(); // Refresh UI
                } catch (error) {
                    alert('Failed to create family: ' + error.message);
                } finally {
                    createBtn.disabled = false;
                    createBtn.textContent = 'Add Family';
                }
            });
        }

        // Handle guest assignment via dropdown select
        const selects = this.container.querySelectorAll('.family-select');
        selects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const guestId = e.target.getAttribute('data-guest-id');
                const familyId = e.target.value;

                if (!familyId) return;

                try {
                    e.target.disabled = true;
                    await assignGuestToFamily(guestId, familyId);
                    await this.loadData(); // Refresh UI to move guest into the family card
                } catch (error) {
                    alert('Failed to assign guest: ' + error.message);
                    e.target.disabled = false;
                }
            });
        });
    }
}

export function initFamilyManager(containerId, activeWeddingId) {
    return new FamilyManager(containerId, activeWeddingId);
}