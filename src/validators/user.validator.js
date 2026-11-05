import { z } from 'zod';
import validator from 'validator';

export const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must contain at least 2 characters.')
      .max(50, 'First name cannot exceed 50 characters.')
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must contain at least 2 characters.')
      .max(50, 'Last name cannot exceed 50 characters.')
      .optional(),

    profile: z
      .object({
        age: z
          .number()
          .int('Age must be a whole number.')
          .min(18, 'You must be at least 18 years old.')
          .optional(),

        gender: z.enum(['male', 'female', 'other']).optional(),

        headline: z
          .string()
          .trim()
          .min(1, 'Headline cannot be empty.')
          .max(120, 'Headline cannot exceed 120 characters.')
          .optional(),

        currentRole: z
          .string()
          .trim()
          .min(1, 'Current role cannot be empty.')
          .max(100, 'Current role cannot exceed 100 characters.')
          .optional(),

        company: z
          .string()
          .trim()
          .min(1, 'Company name cannot be empty.')
          .max(100, 'Company name cannot exceed 100 characters.')
          .optional(),

        experienceYears: z
          .number()
          .int('Experience years must be a whole number.')
          .min(0, 'Experience years cannot be negative.')
          .max(60, 'Experience years cannot exceed 60.')
          .optional(),

        about: z
          .string()
          .trim()
          .min(1, 'About section cannot be empty.')
          .max(500, 'About section cannot exceed 500 characters.')
          .optional(),

        skills: z
          .array(
            z
              .string()
              .trim()
              .min(1, 'Skill cannot be empty.')
              .max(50, 'Skill cannot exceed 50 characters.'),
          )
          .max(20, 'You cannot add more than 20 skills.')
          .refine(
            skills =>
              new Set(skills.map(skill => skill.toLowerCase())).size ===
              skills.length,
            'Skills must be unique.',
          )
          .optional(),

        githubUrl: z
          .string()
          .trim()
          .refine(
            value =>
              validator.isURL(value, {
                protocols: ['https'],
                require_protocol: true,
              }),
            'Please provide a valid GitHub URL.',
          )
          .optional(),

        linkedinUrl: z
          .string()
          .trim()
          .refine(
            value =>
              validator.isURL(value, {
                protocols: ['https'],
                require_protocol: true,
              }),
            'Please provide a valid LinkedIn URL.',
          )
          .optional(),

        portfolioUrl: z
          .string()
          .trim()
          .refine(
            value =>
              validator.isURL(value, {
                protocols: ['https'],
                require_protocol: true,
              }),
            'Please provide a valid portfolio URL.',
          )
          .optional(),

        location: z
          .object({
            city: z
              .string()
              .trim()
              .min(1, 'City cannot be empty.')
              .max(100, 'City cannot exceed 100 characters.')
              .optional(),

            country: z
              .string()
              .trim()
              .min(1, 'Country cannot be empty.')
              .max(100, 'Country cannot exceed 100 characters.')
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    data => {
      const hasRootFields = Object.keys(data).some(key => key !== 'profile');

      const hasProfileFields =
        data.profile && Object.keys(data.profile).length > 0;

      return hasRootFields || hasProfileFields;
    },
    {
      message: 'Please provide at least one field to update.',
    },
  );
