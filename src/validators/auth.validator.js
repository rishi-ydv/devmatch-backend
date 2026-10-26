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

export const loginSchema = z
  .object({
    emailId: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please provide a valid email address'),

    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),

    newPassword: z
      .string()
      .min(1, 'New password is required')
      .refine(
        value => validator.isStrongPassword(value),
        'New password must meet the password strength requirements',
      ),

    confirmPassword: z.string().min(1, 'Please confirm your new password'),

    logoutAllDevices: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'New password must differ from current password',
      });
    }

    if (data.confirmPassword !== data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });
