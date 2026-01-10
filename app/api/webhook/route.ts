import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

//Helper function to send a simple message
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

// Helper function to generate response using Cohere
async function generateCohereResponse(prompt: string): Promise<string> {
  try {
    if (!process.env.COHERE_API_KEY) {
      throw new Error("COHERE_API_KEY is not set in environment variables");
    }

    // Use chat method to get response from Cohere (non-streaming)
    const response = await cohere.chat({
      message: prompt,
      model: "command-r-plus",
    });

    // Extract text from response - response.text should exist according to NonStreamedChatResponse interface
    if (response && typeof response === "object" && "text" in response && typeof response.text === "string") {
      return response.text.trim();
    }

    return "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Cohere API error:", error);
    return "I'm sorry, there was an error processing your request. Please try again later.";
  }
}

export async function POST(request: NextRequest) {
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
          await sendMessage(chatId, "Welcome! I'm your cross-gen bot. How can I help you today?");
        } else {
          // Generate response using Cohere API
          const cohereResponse = await generateCohereResponse(text);
          await sendMessage(chatId, cohereResponse);
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