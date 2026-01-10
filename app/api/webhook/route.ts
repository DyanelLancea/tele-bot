import { NextRequest, NextResponse } from "next/server";
import { CohereClientV2 } from "cohere-ai";

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
    // Check if API key is set
    if (!process.env.COHERE_API_KEY) {
      console.error("COHERE_API_KEY is not set in environment variables");
      throw new Error("COHERE_API_KEY is not set in environment variables");
    }

    // Initialize Cohere V2 client with API key (V2 is the recommended API)
    const cohere = new CohereClientV2({
      token: process.env.COHERE_API_KEY,
    });

    // Use V2 chat API with messages array format
    const response = await cohere.chat({
      model: "command-r-plus", // You can also try: "command", "command-a-03-2025", "command-r"
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from V2 response structure: response.message.content[].text
    if (response?.message?.content && Array.isArray(response.message.content)) {
      // Extract text from all content items with type "text"
      const textParts = response.message.content
        .filter((item: any) => item.type === "text" && item.text)
        .map((item: any) => item.text);
      
      if (textParts.length > 0) {
        return textParts.join(" ").trim();
      }
    }

    console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
    return "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    // Log detailed error information for debugging
    console.error("Cohere API error details:", {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      body: error?.body,
      error: error,
    });

    // Provide more specific error messages based on error type
    if (error?.status === 401 || error?.statusCode === 401) {
      return "I'm sorry, there's an authentication error. Please check the API key configuration.";
    } else if (error?.status === 429 || error?.statusCode === 429) {
      return "I'm sorry, the service is temporarily rate-limited. Please try again in a moment.";
    } else if (error?.status === 400 || error?.statusCode === 400) {
      return "I'm sorry, there was an issue with the request. The model might not be available or the request was invalid.";
    } else if (error?.message?.includes("COHERE_API_KEY")) {
      return "I'm sorry, the API key is not configured. Please check your environment variables.";
    }

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