import api from './api';

export const extraServiceApi = {
  getPublicServices: async () => {
    const response = await api.get('/extra-services/public');
    return response.data;
  },

  getAllServices: async () => {
    const response = await api.get('/extra-services');
    return response.data;
  },

  getServiceById: async (id) => {
    const response = await api.get(`/extra-services/${id}`);
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await api.post('/extra-services', serviceData);
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await api.put(`/extra-services/${id}`, serviceData);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await api.delete(`/extra-services/${id}`);
    return response.data;
  }
};
