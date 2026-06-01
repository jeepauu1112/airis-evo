// app/api/chat/route.js
import { NextResponse } from 'next/server';

function extractOutput(data) {
  if (!data) return null;

  if (typeof data === 'string') {
    return data.trim() || null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const output = extractOutput(item);
      if (output) return output;
    }

    return null;
  }

  if (typeof data === 'object') {
    const directOutput =
      data.output ??
      data.text ??
      data.response ??
      data.answer ??
      data.result ??
      data.message ??
      data.content;

    if (directOutput) {
      return extractOutput(directOutput);
    }

    if (data.data) {
      return extractOutput(data.data);
    }

    if (data.body) {
      return extractOutput(data.body);
    }
  }

  return null;
}

export async function POST(req) {
  try {
    const { message, sessionId, user } = await req.json();

    // Log user information for debugging
    if (user) {
      console.log('Chat from user:', {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      });
    }

    // Prepare payload for n8n webhook
    const payload = {
      chatInput: message,
      sessionId: sessionId,
      // Include user data if available
      ...(user && {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      }),
    };

    const response = await fetch("https://n8n.srv898035.hstgr.cloud/webhook/77cc6214-a39a-4b30-84cc-3247a1ec72e7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("n8n returned error:", {
        status: response.status,
        body: responseText.slice(0, 500),
      });

      return NextResponse.json(
        { error: "A.I.R.I.S sedang tidak dapat memproses pertanyaan ini." },
        { status: response.status }
      );
    }

    let data = responseText;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = responseText;
    }

    const output = extractOutput(data);

    if (!output) {
      console.error("n8n response did not contain an output:", {
        body: responseText.slice(0, 500),
      });

      return NextResponse.json(
        { error: "Respons A.I.R.I.S kosong atau formatnya tidak dikenali." },
        { status: 502 }
      );
    }

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error n8n:", error);
    return NextResponse.json({ error: "Gagal terhubung ke A.I.R.I.S" }, { status: 500 });
  }
}
