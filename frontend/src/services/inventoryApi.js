import api from './api';

const inventoryApi = {
  getAll: async () => {
    const response = await api.get('/inventory-items');
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/inventory-items/low-stock');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/inventory-items', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/inventory-items/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/inventory-items/${id}`);
    return response.data;
  },
};

export default inventoryApi;
