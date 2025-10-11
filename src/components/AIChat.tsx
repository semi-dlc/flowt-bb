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
import flowtAgentImage from "@/assets/flowt-agent.png";

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
      
      <Card className="h-[600px] flex flex-col bg-gradient-to-br from-background via-background to-primary/5 border-2 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/20">
              <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              FLOWT Agent
            </span>
          </CardTitle>
          <CardDescription className="ml-13">
            Ask about available capacity, shipping needs, or get route suggestions
          </CardDescription>
        </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 animate-fade-in ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20 shadow-md">
                    <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] break-words shadow-md transition-all hover:shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                      : 'bg-gradient-to-br from-muted to-muted/80 border border-border/50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shrink-0 shadow-md ring-2 ring-accent/20">
                    <User className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden animate-pulse ring-2 ring-primary/30 shadow-md">
                  <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
                </div>
                <div className="bg-gradient-to-br from-muted to-muted/80 rounded-2xl px-4 py-3 border border-border/50 shadow-md">
                  <p className="text-sm flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="space-y-2 border-t pt-4 bg-gradient-to-r from-primary/5 to-transparent -mx-4 px-4 -mb-4 pb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about shipping or capacity..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              maxLength={2000}
              className="border-2 focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading}
              className="shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
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
