import { NextRequest, NextResponse } from "next/server";
import { verifyCaptchaToken } from "@/lib/captcha";

const UPSTREAM_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://backend:8888";

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : {};
  } catch {
    return { message: input };
  }
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const tokenFromHeader = request.headers.get("x-captcha-token");
    const tokenFromBody =
      typeof payload?.captchaToken === "string"
        ? payload.captchaToken
        : typeof payload?.captcha_token === "string"
          ? payload.captcha_token
          : undefined;
    const captcha = await verifyCaptchaToken(request, tokenFromHeader || tokenFromBody);
    if (!captcha.ok) {
      return NextResponse.json(
        { message: captcha.message, detail: "detail" in captcha ? captcha.detail : [] },
        { status: 400 },
      );
    }

    const upstream = await fetch(`${UPSTREAM_BASE}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const responseBody = await upstream.text();

    const isJson = contentType.includes("application/json");

    if (!upstream.ok) {
      if (isJson) {
        return NextResponse.json(safeJsonParse(responseBody), {
          status: upstream.status,
        });
      }
      return new NextResponse(responseBody || "Upstream error", {
        status: upstream.status,
      });
    }

    if (isJson) {
      return NextResponse.json(safeJsonParse(responseBody), {
        status: upstream.status,
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        "X-Debug-Version": "local-config-v1"
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach backend";
    return NextResponse.json(
      {
        message,
      },
      { status: 502 },
    );
  }
}
