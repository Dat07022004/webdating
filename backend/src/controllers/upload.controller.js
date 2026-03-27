import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Now file is stored locally in frontend/public/uploads via multer.diskStorage
    // The relative public URL to access it on the frontend is /uploads/filename
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({ 
      success: true, 
      data: {
        url: fileUrl,
        publicId: req.file.filename
      }
    });

  } catch (error) {
    console.error('uploadImage error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};
