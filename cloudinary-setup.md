# Cloudinary profile-image setup

The application uploads profile images directly to Cloudinary and stores the
returned `secure_url` in `users/{uid}.photoURL` in Firestore. Firebase Auth and
Firestore remain unchanged.

## Setup

1. Create or sign in to a Cloudinary account at https://cloudinary.com/.
2. Open the Cloudinary Console and copy the **Cloud name**.
3. Open **Settings → Upload → Upload presets**.
4. Create an upload preset.
5. Enable **Unsigned** upload mode.
6. Restrict the preset to image files and set a maximum file size of 5 MB.
7. Use a profile-image folder or allow the application folder value
   `profile-images/{userId}`.
8. Add these values to the root `.env` file:

   ```env
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
   ```

9. Restart the development server after changing `.env`:

   ```powershell
   npm run dev
   ```

10. Sign in, open **Profile**, click **Edit** on the avatar, choose an image,
    and confirm that the new image appears after upload.

Unsigned presets are suitable for this development flow only when restricted by
file type, size, and folder. For production, replace this with a signed upload
endpoint so the preset cannot be abused by arbitrary clients.
