import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import net from "net";

/**
 * Checks if an IP address belongs to private, loopback, or link-local ranges.
 */
function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) return true;
    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0 - 169.254.255.255 (link-local / AWS metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 127.0.0.0 - 127.255.255.255
    if (parts[0] === 127) return true;
  } else if (net.isIPv6(ip)) {
    // Unique local address (fc00::/7) or Link-local (fe80::/10)
    const norm = ip.toLowerCase();
    if (norm.startsWith("fc") || norm.startsWith("fd") || norm.startsWith("fe80")) return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "Параметр url обязателен" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Некорректный формат URL" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Разрешены только протоколы http и https" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Prevent direct localhost / internal hostname probes
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return NextResponse.json({ error: "Доступ к внутренним ресурсам запрещен" }, { status: 403 });
    }

    // Resolve hostname to IP to prevent SSRF DNS rebinding
    try {
      const lookupResult = await dns.lookup(hostname);
      if (isPrivateIp(lookupResult.address)) {
        return NextResponse.json({ error: "Доступ к приватным IP-адресам запрещен" }, { status: 403 });
      }
    } catch {
      // If DNS resolution fails, reject
      return NextResponse.json({ error: "Не удалось разрешить доменное имя" }, { status: 400 });
    }

    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "SyncPro-MediaProxy/1.0",
        Accept: "image/*, */*",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Ошибка при загрузке внешнего изображения: ${res.statusText}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const contentLength = res.headers.get("content-length");

    // Guard against huge files (max 15 MB)
    if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл превышает лимит 15 МБ" }, { status: 413 });
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл превышает лимит 15 МБ" }, { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json(
      { error: `Не удалось проксировать изображение: ${errorMsg}` },
      { status: 502 }
    );
  }
}
