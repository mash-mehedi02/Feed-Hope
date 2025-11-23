# Cloudinary Setup Guide for FeedHope

## Why Cloudinary?

FeedHope uses Cloudinary for image uploads because:
- **CDN Delivery** - Fast image loading worldwide
- **Automatic Optimization** - Images are automatically compressed
- **Free Tier** - 25GB storage + 25GB bandwidth per month
- **Easy Integration** - Simple API for uploads

## Setup Steps

### 1. Create Cloudinary Account

1. Go to https://cloudinary.com
2. Click "Sign Up" (free account)
3. Sign up with email or Google account
4. Verify your email

### 2. Get Your Cloud Name

1. After login, you'll see your **Dashboard**
2. At the top, you'll see your **Cloud Name** (e.g., `dxyz123abc`)
3. Copy this value - you'll need it for environment variables

### 3. Create Upload Preset

1. Go to **Settings** → **Upload** (left sidebar)
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `feedhope_unsigned` (or any name)
   - **Signing mode**: Select **Unsigned** (important!)
   - **Folder**: `feedhope/food_images` (optional, but recommended)
   - **Upload manipulations** (optional):
     - **Format**: `Auto` (auto-optimize format)
     - **Quality**: `Auto` (auto-optimize quality)
   - Click **Save**

### 4. Get Upload Preset Name

1. After creating, you'll see your preset in the list
2. Copy the **Preset name** (e.g., `feedhope_unsigned`)

## Environment Variables

### For Local Development (.env file)

Create `frontend/.env` file:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name-here
VITE_CLOUDINARY_UPLOAD_PRESET=feedhope_unsigned
```

**Example:**
```env
VITE_CLOUDINARY_CLOUD_NAME=dxyz123abc
VITE_CLOUDINARY_UPLOAD_PRESET=feedhope_unsigned
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

| Key | Value | Example |
|-----|-------|---------|
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | `dxyz123abc` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Your upload preset name | `feedhope_unsigned` |

4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**
6. **Redeploy** your application after adding variables

## Testing

After setup:

1. **Restart your dev server** (if running locally)
2. Go to **Create Donation** page
3. Try uploading an image
4. Check browser console for any errors
5. Image should upload successfully and show preview

## Troubleshooting

### Error: "Cloudinary cloud name not configured"

**Solution:**
- Check that `VITE_CLOUDINARY_CLOUD_NAME` is set correctly
- Make sure variable name starts with `VITE_`
- Restart dev server after adding to `.env`
- For Vercel: Redeploy after adding environment variables

### Error: "Cloudinary upload preset not configured"

**Solution:**
- Check that `VITE_CLOUDINARY_UPLOAD_PRESET` is set correctly
- Verify preset name matches exactly (case-sensitive)
- Ensure preset is set to **Unsigned** mode

### Upload fails with "Invalid preset"

**Solution:**
- Verify preset name is correct
- Check that preset exists in Cloudinary dashboard
- Ensure preset is set to **Unsigned** mode (not Signed)

### Images not showing after upload

**Solution:**
- Check Cloudinary dashboard → Media Library
- Verify images are uploading to correct folder
- Check browser console for CORS errors
- Verify Cloudinary URL is accessible

## Cloudinary Dashboard

You can view all uploaded images in:
- **Media Library** → Browse your uploaded images
- **Usage** → Check your storage and bandwidth usage

## Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Uploads**: Unlimited

For most applications, the free tier is sufficient.

## Security Notes

- ✅ **Unsigned presets** are safe for client-side use
- ✅ Cloudinary URLs are public but hard to guess
- ✅ You can set up access controls if needed
- ⚠️ Don't expose your API secret in frontend code

## Support

- Cloudinary Docs: https://cloudinary.com/documentation
- Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- Support: support@cloudinary.com

---

**Need Help?** Check the error message in browser console for specific issues.

