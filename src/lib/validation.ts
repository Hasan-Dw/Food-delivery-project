import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .email('Enter a valid email address, like maya@example.com.');

const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Tell us what to call you.')
      .max(80, 'That name is a little too long.'),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Those passwords do not match.',
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Please add your full name.').max(80, 'That name is a little too long.'),
  email: emailField,
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a contact number.')
    .regex(/^[+()\-\s\d]+$/, 'Use digits, spaces, brackets or a leading +.'),
});

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']),
  line1: z.string().trim().min(3, 'Enter a street address.'),
  line2: z.string().trim().max(80, 'Keep this line under 80 characters.').optional(),
  city: z.string().trim().min(2, 'Enter a city.'),
  state: z.string().trim().min(2, 'Enter a state.'),
  postalCode: z.string().trim().min(4, 'Enter a postal code.').max(10, 'That postal code looks too long.'),
  country: z.string().trim().min(2, 'Enter a country.'),
  instructions: z.string().trim().max(160, 'Keep instructions under 160 characters.').optional(),
  isDefault: z.boolean(),
});

export const preferencesSchema = z.object({
  emailReceipts: z.boolean().default(true),
  orderUpdates: z.boolean().default(true),
  marketing: z.boolean().default(false),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
export type PreferencesValues = z.infer<typeof preferencesSchema>;

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  checks: { label: string; met: boolean }[];
}

/** Lightweight, explainable strength meter for the register form. */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Upper & lowercase', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number', met: /\d/.test(password) },
    { label: 'A symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const met = checks.filter((check) => check.met).length;
  const score = Math.min(4, met) as PasswordStrength['score'];
  const label = ['Too short', 'Could be stronger', 'Getting there', 'Strong', 'Excellent'][score] ?? '';
  return { score, label, checks };
}
