import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Введите email")
    .email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Имя должно содержать минимум 2 символа")
      .max(100, "Имя не должно превышать 100 символов"),
    email: z
      .string()
      .min(1, "Введите email")
      .email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
      .regex(/\d/, "Пароль должен содержать хотя бы одну цифру")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Пароль должен содержать хотя бы один специальный символ"
      ),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "Необходимо принять условия использования",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Введите email")
    .email("Введите корректный email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
      .regex(/\d/, "Пароль должен содержать хотя бы одну цифру")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Пароль должен содержать хотя бы один специальный символ"
      ),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
