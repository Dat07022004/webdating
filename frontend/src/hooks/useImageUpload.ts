import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { getToken } = useAuth();

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        return data.data.url;
      }
      return null;
    } catch (error) {
      console.error('Image upload failed', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
};
