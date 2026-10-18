import { NotificationPrefs } from "@/components/settings/notification-prefs";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Уведомления
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Выберите, о каких событиях и изменениях вы хотите получать оповещения
        </p>
      </div>
      <NotificationPrefs />
    </div>
  );
}
