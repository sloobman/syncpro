import { ProfileForm } from "@/components/settings/profile-form";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Профиль пользователя
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Управляйте вашими публичными данными и настройками организации
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
