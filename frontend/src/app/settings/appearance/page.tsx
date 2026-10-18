import { AppearanceSettings } from "@/components/settings/appearance-settings";

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Внешний вид
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Настройте тему интерфейса и параметры холста редактора
        </p>
      </div>
      <AppearanceSettings />
    </div>
  );
}
