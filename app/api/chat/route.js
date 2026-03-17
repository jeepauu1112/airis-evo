// app/api/chat/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, sessionId } = await req.json();

    const response = await fetch("https://n8n.srv898035.hstgr.cloud/webhook/77cc6214-a39a-4b30-84cc-3247a1ec72e7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatInput: message, sessionId: sessionId }),
    });

    const data = await response.json();
    const output = Array.isArray(data) ? data[0].output : data.output;

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error n8n:", error);
    return NextResponse.json({ error: "Gagal terhubung ke A.I.R.I.S" }, { status: 500 });
  }
}