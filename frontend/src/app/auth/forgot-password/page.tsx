import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full shadow-lg border-border/60">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Восстановление пароля
        </CardTitle>
        <CardDescription>
          Мы отправим вам ссылку для безопасного сброса пароля
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
