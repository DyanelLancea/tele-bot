import { NextRequest, NextResponse } from "next/server";

async function sendMessage(chatId: number, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to send message to Telegram:", await response.text());
  }
}

export async function POST(request: NextRequest) {
  const { CohereClientV2 } = require("cohere-ai");
  const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY,
  });

  try {
    const body = await request.json();

    // Log the incoming webhook for debugging
    console.log("Received webhook:", JSON.stringify(body, null, 2));

    // Handle regular messages
    const message = body.message;
    if (!message) {
      return NextResponse.json({ status: "ok" });
    }

    const chatId = message.chat.id;
    const text = message.text;

    if (text) {
      if (text === "/start") {
        // Send welcome message
        await sendMessage(chatId, "Welcome! I'm Lancea's Bot.");
      } else {
        // "text" is the initial message by the user, that we want to feed to LLM
        // "dynamicMessage" is the response from the LLM, that we want to send back to the user

        const dynamicMessage = await cohere.chat({
          model: "command-a-03-2025",
          messages: [
            {
              role: "user",
              content: text,
            },
          ],
        });

        const response = dynamicMessage.message.content[0].text;

        await sendMessage(chatId, response);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Telegram webhook endpoint is running",
    timestamp: new Date().toISOString(),
  });
}