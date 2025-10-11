import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsDeveloper } from "@/hooks/useIsDeveloper";
import { AISettings } from "./AISettings";
import { z } from "zod";

// Validation schema for chat messages
const messageSchema = z.string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(2000, "Message too long (max 2000 characters)");

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your freight ridesharing AI assistant. I can help you find available shipping capacity or match your shipping needs. What can I help you with today?'
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("openai/gpt-5-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an intelligent freight ridesharing AI assistant. Help users find shipping capacity or matches."
  );
  const { toast } = useToast();
  const { isDeveloper, loading: roleLoading } = useIsDeveloper();

  const sendMessage = async () => {
    if (loading) return;

    // Validate input
    const validation = messageSchema.safeParse(input);
    if (!validation.success) {
      toast({
        title: "Invalid Input",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const userMessage = validation.data;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Limit conversation history to last 10 messages to control costs
    const recentHistory = messages.slice(-10);

    try {
      const { data, error } = await supabase.functions.invoke('freight-ai-agent', {
        body: {
          message: userMessage,
          conversationHistory: recentHistory,
          model: model,
          temperature: temperature,
          maxTokens: maxTokens,
          systemPrompt: systemPrompt
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {isDeveloper && !roleLoading && (
        <AISettings
          model={model}
          setModel={setModel}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
        />
      )}
      
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            FLOWT Agent
          </CardTitle>
          <CardDescription>
            Ask about available capacity, shipping needs, or get route suggestions
          </CardDescription>
        </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] break-words ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about shipping or capacity..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              maxLength={2000}
            />
            <Button onClick={sendMessage} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {input.length}/2000 characters
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
