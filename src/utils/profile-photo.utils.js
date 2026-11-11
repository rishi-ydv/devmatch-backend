import User from '../models/user.model.js';

/**
 * Update a user's profile photo only if the existing
 * publicId still matches the expected previous publicId.
 *
 * This prevents concurrent uploads from silently
 * overwriting each other's changes.
 */
export const updateUserProfilePhoto = async (userId, oldPublicId, newPhoto) => {
  const filter = {
    _id: userId,
  };

  if (oldPublicId) {
    filter['profile.profilePhoto.publicId'] = oldPublicId;
  } else {
    filter.$or = [
      { 'profile.profilePhoto.publicId': null },
      { 'profile.profilePhoto.publicId': { $exists: false } },
    ];
  }

  return User.findOneAndUpdate(
    filter,
    {
      $set: {
        'profile.profilePhoto.url': newPhoto.url,
        'profile.profilePhoto.publicId': newPhoto.publicId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).select('-password');
};
