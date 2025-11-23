/**
 * Cloudinary Image Upload Service
 * FeedHope - Image Upload Functions
 */

/**
 * Upload image to Cloudinary
 * @param {File} imageFile - The image file to upload
 * @param {string} folder - Optional folder path in Cloudinary (default: 'feedhope/food_images')
 * @returns {Promise<string>} - The uploaded image URL
 */
export const uploadImageToCloudinary = async (imageFile, folder = 'feedhope/food_images') => {
  try {
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 10MB for Cloudinary)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      throw new Error('Image size must be less than 10MB');
    }

    console.log('📸 Uploading image to Cloudinary:', imageFile.name, imageFile.size, 'bytes');

    // Get Cloudinary cloud name and upload preset from environment variables
    // Try multiple ways to get the values (Vercel sometimes has issues)
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 
                      import.meta.env.CLOUDINARY_CLOUD_NAME ||
                      (typeof window !== 'undefined' && window.ENV?.VITE_CLOUDINARY_CLOUD_NAME);
    
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 
                         import.meta.env.CLOUDINARY_UPLOAD_PRESET ||
                         (typeof window !== 'undefined' && window.ENV?.VITE_CLOUDINARY_UPLOAD_PRESET);

    // Fallback values for production (if Vercel env vars not working)
    // These should match your Vercel environment variables
    const FALLBACK_CLOUD_NAME = 'd15yejhdh';
    const FALLBACK_UPLOAD_PRESET = 'feed_hope';

    // Check if we're in production (deployed on Vercel)
    const isProduction = import.meta.env.MODE === 'production' || 
                         (typeof window !== 'undefined' && window.location?.hostname?.includes('vercel.app')) ||
                         !import.meta.env.DEV;

    // Use fallback if environment variables are missing (for production)
    // Always use fallback in production if env vars missing (Vercel workaround)
    const finalCloudName = cloudName || (isProduction ? FALLBACK_CLOUD_NAME : null);
    const finalUploadPreset = uploadPreset || (isProduction ? FALLBACK_UPLOAD_PRESET : null);

    // Debug logging - more detailed
    console.log('🔍 Cloudinary Environment Variables Check:', {
      cloudName: cloudName ? '✅ Found' : '❌ Missing',
      uploadPreset: uploadPreset ? '✅ Found' : '❌ Missing',
      cloudNameValue: cloudName || 'undefined',
      uploadPresetValue: uploadPreset || 'undefined',
      isProduction: isProduction,
      usingFallback: !cloudName || !uploadPreset,
      finalCloudName: finalCloudName,
      finalUploadPreset: finalUploadPreset,
      allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('CLOUDINARY') || key.includes('VITE')),
      allEnvKeysCount: Object.keys(import.meta.env).length
    });

    // In development, throw error to catch configuration issues early
    // In production, use fallback values (Vercel env var issue workaround)
    if (!finalCloudName && !isProduction) {
      console.error('❌ VITE_CLOUDINARY_CLOUD_NAME is missing!');
      console.error('Available env keys:', Object.keys(import.meta.env));
      throw new Error('Cloudinary cloud name not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your .env file.');
    }

    if (!finalUploadPreset && !isProduction) {
      console.error('❌ VITE_CLOUDINARY_UPLOAD_PRESET is missing!');
      console.error('Available env keys:', Object.keys(import.meta.env));
      throw new Error('Cloudinary upload preset not configured. Please set VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
    }

    // Log if using fallback (production only)
    if ((!cloudName || !uploadPreset) && isProduction) {
      console.warn('⚠️ Using fallback Cloudinary values (env vars not found in build)');
      console.log('Using fallback:', { cloudName: finalCloudName, uploadPreset: finalUploadPreset });
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('resource_type', 'image');
    
    // Optional: Add image transformations for optimization
    // formData.append('transformation', 'w_800,h_600,c_fill,q_auto,f_auto');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${finalCloudName}/image/upload`;
    
    // Update FormData with final values
    formData.set('upload_preset', finalUploadPreset);

    console.log('📤 Uploading to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Image uploaded successfully to Cloudinary:', data.secure_url);
    
    return data.secure_url; // Return the secure HTTPS URL
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary (optional - for future use)
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @returns {Promise<void>}
 */
export const deleteImageFromCloudinary = async (publicId) => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Cloudinary API credentials not configured');
    }

    // Note: This requires server-side implementation for security
    // Client-side deletion is not recommended as it exposes API secret
    console.warn('⚠️ Image deletion should be done server-side for security');
    
    // For now, just log the public ID
    console.log('Would delete image with public_id:', publicId);
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};

