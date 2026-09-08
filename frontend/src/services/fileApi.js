const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnyemotdi/image/upload';
const UPLOAD_PRESET = 'stayAway';

const uploadToCloudinary = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_URL);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });

export const fileApi = {
  uploadFile: async (file, onProgress) => {
    const url = await uploadToCloudinary(file, onProgress);
    return { url };
  },

  uploadMultipleFiles: async (files, onProgress) => {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToCloudinary(files[i], (p) => {
        if (onProgress) onProgress(Math.round(((i + p / 100) / files.length) * 100));
      });
      urls.push(url);
    }
    return { urls };
  },
};
