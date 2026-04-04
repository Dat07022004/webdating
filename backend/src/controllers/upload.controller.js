import cloudinary from '../config/cloudinary.js';

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const uploadImage = async ({ file }) => {
  if (!file) {
    throw createError(400, 'No file uploaded');
  }

  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'webdating/chat-images',
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
};
