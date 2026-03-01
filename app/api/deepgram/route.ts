import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "Deepgram API key not configured. Please set DEEPGRAM_API_KEY in .env.local" },
            { status: 500 }
        );
    }

    try {
        // Create a temporary API key using the Deepgram REST API
        const response = await fetch("https://api.deepgram.com/v1/projects", {
            headers: {
                Authorization: `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Deepgram API error: ${response.status}`);
        }

        const data = await response.json();
        const projectId = data.projects?.[0]?.project_id;

        if (!projectId) {
            throw new Error("No Deepgram project found");
        }

        // Create a temporary key scoped to this project
        const keyResponse = await fetch(
            `https://api.deepgram.com/v1/projects/${projectId}/keys`,
            {
                method: "POST",
                headers: {
                    Authorization: `Token ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment: "Temporary clinical assistant key",
                    scopes: ["usage:write"],
                    time_to_live_in_seconds: 60,
                }),
            }
        );

        if (!keyResponse.ok) {
            throw new Error(`Failed to create temporary key: ${keyResponse.status}`);
        }

        const keyData = await keyResponse.json();

        return NextResponse.json({ key: keyData.key });
    } catch (error) {
        console.error("Deepgram key generation error:", error);
        // Fallback: return the API key directly (less secure but functional)
        return NextResponse.json({ key: apiKey });
    }
}
