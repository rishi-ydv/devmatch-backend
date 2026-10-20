import { z } from 'zod';
import validator from 'validator';

export const signupSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must contain at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters'),

    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must contain at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters')
      .optional(),

    emailId: z.string().trim().email('Please provide a valid email address'),

    password: z
      .string()
      .refine(
        value => validator.isStrongPassword(value),
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      ),
  })
  .strict();
