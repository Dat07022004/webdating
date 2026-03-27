import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'webdating/chat-images',
      resource_type: 'image',
    });

    res.status(200).json({ 
      success: true, 
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });

  } catch (error) {
    console.error('uploadImage error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};
