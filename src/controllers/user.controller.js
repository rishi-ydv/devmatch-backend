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
