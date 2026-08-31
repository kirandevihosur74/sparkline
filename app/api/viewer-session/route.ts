import { NextRequest, NextResponse } from "next/server";

/**
 * Beat 3 — mint a DWS Viewer session token for a document so the frontend
 * can embed the viewer without exposing the Viewer API key (plan §9.1 step 5).
 *
 * Body: JSON { documentId: string }
 * Returns { sessionToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NUTRIENT_VIEWER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "NUTRIENT_VIEWER_API_KEY is not set — copy .env.example to .env.local" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { documentId?: string };
    if (!body.documentId) {
      return NextResponse.json(
        { error: "Expected JSON body with `documentId`" },
        { status: 400 }
      );
    }

    // TODO(beat-3): call the DWS Viewer backend API to create a session token
    // for body.documentId (upload the doc first via the Viewer API dashboard or
    // its upload endpoint). Endpoint + payload shape: Viewer API docs (plan §9.1).
    return NextResponse.json(
      { error: "viewer-session not implemented — Day 3 task (plan §6)" },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
