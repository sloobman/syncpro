import { NextResponse } from "next/server";

/**
 * OAuth endpoint — DISABLED for security.
 *
 * The previous implementation blindly trusted the client-supplied
 * email/name without verifying the OAuth token with the provider.
 * This allowed anyone to impersonate any user by simply sending
 * a POST with an arbitrary email address.
 *
 * TODO: Implement real OAuth verification:
 *  1. Receive the OAuth authorization code or id_token from the client.
 *  2. Exchange / verify it with the OAuth provider (Google / GitHub).
 *  3. Extract the verified email from the provider's response.
 *  4. Only then create or log in the user.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "OAuth авторизация временно отключена. " +
        "Используйте вход по email и паролю. " +
        "OAuth будет восстановлен после интеграции серверной верификации токенов провайдера.",
    },
    { status: 501 }
  );
}
