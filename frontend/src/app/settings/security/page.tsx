import { SecurityForm } from "@/components/settings/security-form";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Безопасность и пароли
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Контролируйте доступ к вашей учетной записи и активные сессии
        </p>
      </div>
      <SecurityForm />
    </div>
  );
}
