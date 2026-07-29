export class WeddingService {

    constructor(storageService) {
        this.storageService = storageService;
    }

    async getAll() {
        return await this.storageService.get("weddings");
    }

    async create(wedding) {
        
    }

    async update(id, wedding) {
        
    }

    async delete(id) {
        
    }

}