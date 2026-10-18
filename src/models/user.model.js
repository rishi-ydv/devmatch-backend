import mongoose, { Schema } from 'mongoose';
import validator from 'validator';

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 50,
      trim: true,
    },
    lastName: {
      type: String,
      minLength: 2,
      maxLength: 50,
      trim: true,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: value => validator.isEmail(value),
        message: 'Please enter a valid email address',
      },
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: value => validator.isStrongPassword(value),
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      },
    },
    age: {
      type: Number,
      min: [18, 'You must be at least 18 years old to use DevMatch.'],
      validate: {
        validator: Number.isInteger,
        message: 'Age must be a whole number.',
      },
    },
    gender: {
      type: String,
      required: true,
      trim: true,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other.',
      },
    },
    photoUrl: {
      type: String,
      trim: true,
      default:
        'https://res.cloudinary.com/demo/image/upload/d_avatar.png/non_existing_id.png',
      validate: {
        validator: value => validator.isURL(value),
        message: 'Please provide a valid profile photo URL.',
      },
    },
    about: {
      type: String,
      trim: true,
      maxLength: [500, 'About section cannot exceed 500 characters.'],
      default: 'Hey there! I am using DevMatch.',
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: skills => {
          if (skills.length > 20) return false;

          if (
            !skills.every(
              skill => skill.trim().length > 0 && skill.trim().length <= 50,
            )
          ) {
            return false;
          }

          const normalizedSkills = skills.map(skill =>
            skill.trim().toLowerCase(),
          );

          return new Set(normalizedSkills).size === normalizedSkills.length;
        },
        message:
          'Skills must be unique, contain 1–50 characters each, and include no more than 20 skills.',
      },
    },
    githubUrl: {
      type: String,
      trim: true,
      validate: {
        validator: value =>
          !value ||
          validator.isURL(value, {
            protocols: ['https'],
            require_protocol: true,
          }),
        message: 'Please provide a valid GitHub URL.',
      },
    },

    linkedinUrl: {
      type: String,
      trim: true,
      validate: {
        validator: value =>
          !value ||
          validator.isURL(value, {
            protocols: ['https'],
            require_protocol: true,
          }),
        message: 'Please provide a valid LinkedIn URL.',
      },
    },
    location: {
      city: {
        type: String,
        trim: true,
        maxLength: [100, 'City cannot exceed 100 characters.'],
      },
      country: {
        type: String,
        trim: true,
        maxLength: [100, 'Country cannot exceed 100 characters.'],
      },
    },
  },
  { timestamps: true },
);
