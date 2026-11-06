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
    /** Requested account type. ADMIN is deliberately not accepted. */
    role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'DRIVER'], {
      message: 'Choose an account type.',
    }),
    restaurantName: z.string().trim().max(120, 'Keep the restaurant name under 120 characters.').optional(),
    restaurantAddress: z.string().trim().max(180, 'Keep the address under 180 characters.').optional(),
    restaurantPhone: z.string().trim().max(40, 'That contact number looks too long.').optional(),
    restaurantDescription: z
      .string()
      .trim()
      .max(320, 'Keep the description under 320 characters.')
      .optional(),
    driverPhone: z.string().trim().max(40, 'That contact number looks too long.').optional(),
    driverServiceArea: z.string().trim().max(120, 'Keep the service area under 120 characters.').optional(),
    driverVehicle: z.enum(['bike', 'scooter', 'car']).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Those passwords do not match.',
      });
    }

    const phonePattern = /^[+()\-\s\d]{7,}$/;
    const required = (value: string | undefined, path: string, message: string) => {
      if (!value || value.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: [path], message });
      }
    };

    if (values.role === 'RESTAURANT_OWNER') {
      required(values.restaurantName, 'restaurantName', 'Enter the restaurant name.');
      required(values.restaurantAddress, 'restaurantAddress', 'Enter the restaurant address.');
      required(values.restaurantPhone, 'restaurantPhone', 'Enter a contact number for the restaurant.');
      if (values.restaurantPhone && !phonePattern.test(values.restaurantPhone)) {
        ctx.addIssue({
          code: 'custom',
          path: ['restaurantPhone'],
          message: 'Use digits, spaces, brackets or a leading +.',
        });
      }
    }

    if (values.role === 'DRIVER') {
      required(values.driverPhone, 'driverPhone', 'Enter a contact number.');
      required(values.driverServiceArea, 'driverServiceArea', 'Tell us where you can deliver.');
      if (values.driverPhone && !phonePattern.test(values.driverPhone)) {
        ctx.addIssue({
          code: 'custom',
          path: ['driverPhone'],
          message: 'Use digits, spaces, brackets or a leading +.',
        });
      }
      if (!values.driverVehicle) {
        ctx.addIssue({ code: 'custom', path: ['driverVehicle'], message: 'Choose a vehicle type.' });
      }
    }
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
