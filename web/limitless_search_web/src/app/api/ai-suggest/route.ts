import { NextRequest, NextResponse } from "next/server";
import { getSettingValue, settingDefinitions } from "@/lib/app-settings";

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : null;
  } catch {
    return null;
  }
};

const buildPrompt = (language: string, customPrompt: string) => {
  if (customPrompt.trim()) return customPrompt;
  return [
    "You are an anime title resolver.",
    "Input may be long, translated, aliased, or misspelled (often Chinese). Infer the official/original release title; prefer Japanese official title if it exists, otherwise the official English/Romanized title.",
    "Output strict JSON only with keys: best_query (string), alternates (array, up to 3 strings), reason (string, <= 25 chars), original_language (string).",
    "best_query must be an exact official title (no descriptions).",
    "alternates should include concise aliases/root franchise names (max 3).",
    `All text must be in site language: ${language}.`
  ].join(" ");
};

type SuggestBody = {
  query?: string;
  language?: string;
  resultCount?: number;
  captchaToken?: string;
  captcha_token?: string;
};

type AiSuggestion = {
  best_query?: string;
  alternates?: string[];
  reason?: string;
  original_language?: string;
  raw?: unknown;
};

export async function POST(request: NextRequest) {
  const aiEnabled = Boolean(await getSettingValue(settingDefinitions.aiSuggestEnabled));
  if (!aiEnabled) {
    return NextResponse.json({ message: "AI suggestion is disabled" }, { status: 403 });
  }

  const aiBase = String(await getSettingValue(settingDefinitions.aiSuggestBaseUrl) || "").replace(/\/$/, "");
  const aiModel = String(await getSettingValue(settingDefinitions.aiSuggestModel) || "");
  const aiApiKey = String(await getSettingValue(settingDefinitions.aiSuggestApiKey) || "");
  const customPrompt = String(await getSettingValue(settingDefinitions.aiSuggestPrompt) || "");

  if (!aiBase || !aiApiKey || !aiModel) {
    return NextResponse.json(
      { message: "AI configuration missing (base url / api key / model)" },
      { status: 400 },
    );
  }

  let body: SuggestBody = {};
  try {
    body = (await request.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.query || "").toString().trim();
  const language = (body.language || "en").toString();
  const resultCount = Number(body.resultCount ?? 0);

  if (!query) {
    return NextResponse.json({ message: "Missing query" }, { status: 400 });
  }


  const userPrompt = `User search query: "${query}". Current site language: ${language}. Current search results: ${resultCount}. Return JSON with best_query, alternates, reason, original_language. If unsure, output the most likely official title.`;

  const upstreamPayload = {
    model: aiModel,
    messages: [
      { role: "system", content: buildPrompt(language, customPrompt) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  };

  const upstream = await fetch(`${aiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiApiKey}`,
    },
    body: JSON.stringify(upstreamPayload),
  });

  const contentType = upstream.headers.get("content-type") || "";
  const text = await upstream.text();

  if (!upstream.ok) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(safeJsonParse(text) || { message: text || "Upstream error" }, {
        status: upstream.status,
      });
    }
    return new NextResponse(text || "Upstream error", { status: upstream.status });
  }

  let suggestion: AiSuggestion | null = null;
  const parsed = safeJsonParse(text) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  } | null;
  const rawContent: string | undefined = parsed?.choices?.[0]?.message?.content || text;

  if (rawContent) {
    const jsonCandidate = safeJsonParse(rawContent);
    if (jsonCandidate && typeof jsonCandidate === "object") {
      suggestion = { ...(jsonCandidate as AiSuggestion), raw: rawContent };
    } else if (typeof rawContent === "string") {
      suggestion = { best_query: rawContent.trim(), raw: rawContent };
    }
  }

  return NextResponse.json({ suggestion: suggestion ?? { raw: text } });
}
