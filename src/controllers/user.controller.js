import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import ApiResponse from '../utils/api-response.js';

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
