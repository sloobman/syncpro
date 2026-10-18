import { Card, CardContent } from "@/components/ui/card";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

export default function VerifyEmailPage() {
  return (
    <Card className="w-full shadow-lg border-border/60">
      <CardContent className="pt-6">
        <VerifyEmailCard />
      </CardContent>
    </Card>
  );
}
