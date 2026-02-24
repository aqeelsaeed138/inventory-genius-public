import { z } from "zod";
import { validatePhoneForCountry, getPhoneFormatForCountry } from "./currency";

// Common password patterns to reject
const COMMON_PASSWORDS = [
  "password", "12345678", "123456789", "qwerty123", "password123",
  "admin123", "letmein", "welcome", "monkey123", "password1"
];

// Disposable email domains to reject
const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com", "throwaway.com", "mailinator.com", "guerrillamail.com",
  "10minutemail.com", "yopmail.com", "trashmail.com"
];

// =====================================================
// COMMON VALIDATION HELPERS
// =====================================================

// Check if string contains only punctuation/special chars
const isOnlyPunctuation = (str: string): boolean => {
  const cleaned = str.replace(/[\s.,;:!?'"()\-_\[\]{}@#$%^&*+=<>/\\|`~]+/g, "");
  return cleaned.length === 0;
};

// Check if string has at least some alphanumeric characters
const hasAlphanumeric = (str: string): boolean => {
  return /[a-zA-Z0-9\u0600-\u06FF\u0900-\u097F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(str);
};

// =====================================================
// BASE SCHEMAS
// =====================================================

// Username validation schema
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .refine((val) => !val.includes(" "), "Username cannot contain spaces");

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(255, "Email must be less than 255 characters")
  .email("Please enter a valid email address")
  .refine((email) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return !DISPOSABLE_EMAIL_DOMAINS.includes(domain);
  }, "Disposable email addresses are not allowed")
  .transform((val) => val.toLowerCase());

// Optional email validation (for entities where email is not required)
export const optionalEmailSchema = z
  .string()
  .trim()
  .max(255, "Email must be less than 255 characters")
  .refine((val) => {
    if (!val || val === "") return true;
    // Basic email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }, "Please enter a valid email address")
  .refine((val) => {
    if (!val || val === "") return true;
    const domain = val.split("@")[1]?.toLowerCase();
    return !DISPOSABLE_EMAIL_DOMAINS.includes(domain);
  }, "Disposable email addresses are not allowed")
  .transform((val) => val ? val.toLowerCase() : val)
  .optional()
  .or(z.literal(""));

// Strong password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((val) => /[A-Z]/.test(val), "Password must contain at least 1 uppercase letter")
  .refine((val) => /[a-z]/.test(val), "Password must contain at least 1 lowercase letter")
  .refine((val) => /[0-9]/.test(val), "Password must contain at least 1 number")
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), "Password must contain at least 1 special character")
  .refine(
    (val) => !COMMON_PASSWORDS.includes(val.toLowerCase()),
    "This password is too common. Please choose a stronger password"
  );

// Simple password schema (for existing users or employees)
export const simplePasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be at most 128 characters");

// Full name validation schema (for people's names)
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters")
  .refine((val) => hasAlphanumeric(val), "Name must contain letters")
  .refine((val) => !isOnlyPunctuation(val), "Name cannot be only punctuation")
  .refine((val) => /^[\p{L}\s'\-\.]+$/u.test(val), "Name can only contain letters, spaces, hyphens, apostrophes, and periods");

// Entity name validation schema (for businesses, products, categories, etc.)
export const entityNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(150, "Name must be at most 150 characters")
  .refine((val) => hasAlphanumeric(val), "Name must contain at least some letters or numbers")
  .refine((val) => !isOnlyPunctuation(val), "Name cannot be only punctuation or special characters");

// Phone validation with country support
export const createPhoneSchema = (countryCode: string) => {
  const format = getPhoneFormatForCountry(countryCode);
  return z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true;
      const result = validatePhoneForCountry(val, countryCode);
      return result.valid;
    }, {
      message: `Invalid phone format. Example: ${format.example}`
    });
};

// Generic phone schema (less strict, for when country is unknown)
export const genericPhoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((val) => {
    if (!val || val === "") return true;
    const cleanPhone = val.replace(/[\s\-()]/g, "");
    // At least 7 digits, at most 20, only numbers and + allowed
    return /^\+?\d{7,20}$/.test(cleanPhone);
  }, "Please enter a valid phone number (7-20 digits)");

// Address validation
export const addressSchema = z
  .string()
  .trim()
  .max(500, "Address must be at most 500 characters")
  .optional()
  .or(z.literal(""));

// Description validation
export const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must be at most 2000 characters")
  .optional()
  .or(z.literal(""));

// SKU validation
export const skuSchema = z
  .string()
  .trim()
  .max(50, "SKU must be at most 50 characters")
  .refine((val) => {
    if (!val || val === "") return true;
    return /^[a-zA-Z0-9\-_]+$/.test(val);
  }, "SKU can only contain letters, numbers, hyphens, and underscores")
  .optional()
  .or(z.literal(""));

// Price validation (must be non-negative)
export const priceSchema = z
  .number()
  .min(0, "Price must be 0 or greater")
  .max(999999999, "Price exceeds maximum limit");

// Quantity validation (must be non-negative integer)
export const quantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(0, "Quantity must be 0 or greater")
  .max(999999999, "Quantity exceeds maximum limit");

// =====================================================
// ENTITY SCHEMAS
// =====================================================

// Sign up form schema
export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Sign in form schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Employee form schema (less strict password for employees)
export const employeeSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: simplePasswordSchema,
  role: z.enum(["staff", "accountant"]),
});

// Customer schema
export const createCustomerSchema = (countryCode?: string) => z.object({
  name: entityNameSchema,
  email: optionalEmailSchema,
  phone: countryCode ? createPhoneSchema(countryCode) : genericPhoneSchema,
  address: addressSchema,
});

// Supplier schema
export const createSupplierSchema = (countryCode?: string) => z.object({
  name: entityNameSchema,
  email: optionalEmailSchema,
  phone: countryCode ? createPhoneSchema(countryCode) : genericPhoneSchema,
  address: addressSchema,
  location: z.string().trim().max(200, "Location must be at most 200 characters").optional().or(z.literal("")),
});

// Category schema
export const categorySchema = z.object({
  name: entityNameSchema,
  description: descriptionSchema,
  parent_id: z.string().optional().or(z.literal("")),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100%").optional(),
});

// Product schema
export const productSchema = z.object({
  name: entityNameSchema,
  sku: skuSchema,
  description: descriptionSchema,
  price: priceSchema,
  cost_price: priceSchema,
  quantity: quantitySchema,
  min_stock_level: quantitySchema,
  category_id: z.string().min(1, "Please select a category"),
  supplier_id: z.string().min(1, "Please select a supplier"),
});

// Company settings schema
export const createCompanySettingsSchema = (countryCode?: string) => z.object({
  name: entityNameSchema,
  business_type: z.string().optional(),
  country: z.string().optional(),
  location: z.string().trim().max(200, "Location must be at most 200 characters").optional().or(z.literal("")),
  currency: z.string().optional(),
  currency_symbol: z.string().max(10, "Currency symbol must be at most 10 characters").optional(),
  phone: countryCode ? createPhoneSchema(countryCode) : genericPhoneSchema,
  email: optionalEmailSchema,
  address: addressSchema,
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

// Validate and return errors
export function validateForm<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

// Get password strength
export function getPasswordStrength(password: string): {
  score: number;
  label: "weak" | "fair" | "good" | "strong";
  color: string;
} {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  if (score <= 2) return { score, label: "weak", color: "bg-destructive" };
  if (score <= 3) return { score, label: "fair", color: "bg-orange-500" };
  if (score <= 4) return { score, label: "good", color: "bg-yellow-500" };
  return { score, label: "strong", color: "bg-green-500" };
}

// Network error messages
export const getNetworkErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("network") || message.includes("fetch")) {
      return "Network connection error. Please check your internet connection.";
    }
    if (message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    if (message.includes("aborted")) {
      return "Request was cancelled. Please try again.";
    }
    if (message.includes("500") || message.includes("server")) {
      return "Server is currently unavailable. Please try again later.";
    }
    if (message.includes("already registered")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      return "Invalid email or password. Please try again.";
    }
    
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
};

// =====================================================
// TYPE EXPORTS
// =====================================================

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type ProductFormData = z.infer<typeof productSchema>;
