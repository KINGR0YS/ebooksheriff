const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadImage(
  file: string, // base64 or buffer
  folder: string = 'ebook-sheriff'
): Promise<{ url: string; public_id: string }> {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: 'image',
  });
  return { url: result.secure_url, public_id: result.public_id };
}

export async function deleteImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}

export async function listImages(folder: string = 'ebook-sheriff') {
  const result = await cloudinary.search
    .expression(`folder:${folder}`)
    .sort_by('created_at', 'desc')
    .max_results(100)
    .execute();
  return result.resources.map((r: any) => ({
    url: r.secure_url,
    public_id: r.public_id,
    filename: r.filename,
    created_at: r.created_at,
  }));
}
