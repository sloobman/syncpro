import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Card className="w-full shadow-lg border-border/60">
      <CardContent className="pt-6">
        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <VerifyEmailCard />
        </Suspense>
      </CardContent>
    </Card>
  );
}
