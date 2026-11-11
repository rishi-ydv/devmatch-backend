import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import ApiResponse from '../utils/api-response.js';
import {
  uploadProfileImage,
  deleteProfileImage,
} from '../utils/cloudinary.utils.js';

import { updateUserProfilePhoto } from '../utils/profile-photo.utils.js';

export const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'firstName lastName emailId profile createdAt updatedAt',
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, 'Profile fetched successfully', user));
};

export const updateProfile = async (req, res) => {
  const userId = req.user._id;
  const updateData = req.body;

  // Prepare fields to update
  const updates = {};

  // Update root-level fields
  if (updateData.firstName !== undefined) {
    updates.firstName = updateData.firstName;
  }

  if (updateData.lastName !== undefined) {
    updates.lastName = updateData.lastName;
  }

  // Update nested profile fields
  if (updateData.profile) {
    for (const [key, value] of Object.entries(updateData.profile)) {
      if (key === 'location') {
        for (const [locationKey, locationValue] of Object.entries(value)) {
          updates[`profile.location.${locationKey}`] = locationValue;
        }
      } else {
        updates[`profile.${key}`] = value;
      }
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).select('firstName lastName emailId profile createdAt updatedAt');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, 'Profile updated successfully', user));
};

export const updateProfilePhoto = async (req, res) => {
  const userId = req.user._id;

  // Ensure an uploaded image is available.
  if (!req.file?.buffer) {
    throw new ApiError(400, 'Profile photo is required.');
  }

  // Get the current profile photo's public ID.
  const currentUser = await User.findById(userId).select(
    'profile.profilePhoto.publicId',
  );

  if (!currentUser) {
    throw new ApiError(404, 'User not found.');
  }

  const oldPublicId = currentUser.profile?.profilePhoto?.publicId || null;
  

  // Upload the new image to Cloudinary.
  const uploadedImage = await uploadProfileImage(req.file.buffer);

  // Defensive check for an unexpected Cloudinary response.
  if (!uploadedImage?.url || !uploadedImage?.publicId) {
    throw new ApiError(502, 'Image storage returned an invalid response.');
  }

  let updatedUser;

  try {
    // Update MongoDB only if the previous public ID is unchanged.
    updatedUser = await updateUserProfilePhoto(
      userId,
      oldPublicId,
      uploadedImage,
    );

    // No matching document means the photo changed concurrently
    // or the user document is no longer available.
    if (!updatedUser) {
      throw new ApiError(
        409,
        'Profile photo was changed by another request. Please try again.',
      );
    }
  } catch (error) {
    // MongoDB did not confirm the update.
    // Attempt to remove the newly uploaded image.
    try {
      const deleted = await deleteProfileImage(uploadedImage.publicId);

      if (!deleted) {
        // TODO: Log cleanup failure and schedule retry.
        // console.error('Failed to clean up newly uploaded profile photo.', {
        //   userId: userId.toString(),
        //   publicId: uploadedImage.publicId,
        // });
      }
    } catch (cleanupError) {
      // TODO: Log cleanup error and schedule retry.
      // Preserve the original database/update error.
    }

    throw error;
  }

  // MongoDB now references the new image.
  // Never delete the new image after this point.

  // Delete the previous image only when one existed.
  if (oldPublicId && oldPublicId !== uploadedImage.publicId) {
    try {
      const deleted = await deleteProfileImage(oldPublicId);

      if (!deleted) {
        // TODO: Log cleanup failure and schedule retry.
      }
    } catch (cleanupError) {
      // The profile update remains successful.
      // Background cleanup will handle this orphan later.
      // TODO: Log unexpected cleanup error and schedule retry.
      // Do not fail the successful profile photo update.
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, 'Profile photo updated successfully.'),
    );
};
