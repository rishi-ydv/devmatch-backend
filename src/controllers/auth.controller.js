import User from '../models/user.model.js';
import ApiError  from '../utils/api-error.js';
import  ApiResponse  from '../utils/api-response.js';

export const signup = async (req, res) => {
  const { firstName, lastName, emailId, password } = req.body;

  const existingUser = await User.findOne({ emailId });

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({
    firstName,
    lastName,
    emailId,
    password,
  });

  return res.status(201).json(
    new ApiResponse(201, 'User registered successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
      },
    }),
  );
};