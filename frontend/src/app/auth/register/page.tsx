import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  return (
    <Card className="w-full shadow-lg border-border/60">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Создайте аккаунт
        </CardTitle>
        <CardDescription>
          Начните совместную работу над документами с версионированием
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        <SocialAuthButtons />

        <p className="text-center text-sm text-muted-foreground pt-2">
          Уже есть аккаунт?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
