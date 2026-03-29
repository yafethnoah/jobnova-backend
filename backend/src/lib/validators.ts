import { z } from "zod";
export const emailSchema = z.string().email("Enter a valid email");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
export const signUpSchema = z.object({ fullName: z.string().min(2, "Enter your full name"), email: emailSchema, password: passwordSchema, confirmPassword: z.string().min(8, "Confirm your password") }).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export const applicationSchema = z.object({ company: z.string().min(2, "Enter a company name"), role: z.string().min(2, "Enter a role"), followUpDate: z.string().optional(), notes: z.string().optional() });
export const profileSchema = z.object({ fullName: z.string().optional(), targetRole: z.string().optional(), location: z.string().optional(), summary: z.string().optional() });
