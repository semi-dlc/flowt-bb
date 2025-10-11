import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Paperclip, X } from "lucide-react";
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
  imageUrl?: string;
}

interface FileAttachment {
  file: File;
  preview: string;
  base64?: string;
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
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an intelligent freight ridesharing AI assistant. Help users find shipping capacity or matches. You can also analyze invoice documents, PDFs, and images that users upload."
  );
  const { toast } = useToast();
  const { isDeveloper, loading: roleLoading } = useIsDeveloper();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        continue;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFiles(prev => [...prev, {
          file,
          preview,
          base64: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const sendMessage = async () => {
    if (loading) return;
    if (!input.trim() && attachedFiles.length === 0) return;

    // Validate input if there's text
    if (input.trim()) {
      const validation = messageSchema.safeParse(input);
      if (!validation.success) {
        toast({
          title: "Invalid Input",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    const userMessage = input.trim() || "Please analyze this document";
    const userFiles = [...attachedFiles];
    
    setInput("");
    setAttachedFiles([]);
    
    // Add user message with file preview
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      imageUrl: userFiles[0]?.preview 
    }]);
    
    setLoading(true);

    // Limit conversation history to last 10 messages to control costs
    const recentHistory = messages.slice(-10);

    try {
      const { data, error } = await supabase.functions.invoke('freight-ai-agent', {
        body: {
          message: userMessage,
          conversationHistory: recentHistory,
          attachments: userFiles.map(f => ({
            type: f.file.type,
            data: f.base64
          })),
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
      // Clean up file previews
      userFiles.forEach(f => URL.revokeObjectURL(f.preview));
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
      
      <Card className="h-[700px] flex flex-col saas-card shadow-lg">
        <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-foreground font-semibold text-xl">
                FLOWT Agent
              </span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                AI-Powered Freight Assistant
              </p>
            </div>
          </CardTitle>
          <CardDescription className="ml-15">
            Ask about capacity, shipping needs, routes, or upload invoices/documents for analysis
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
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
                    <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2.5 max-w-[80%] break-words ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.imageUrl && (
                    <img src={message.imageUrl} alt="Uploaded" className="max-w-xs rounded mb-2" />
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
                  <img src={flowtAgentImage} alt="FLOWT Agent" className="w-full h-full object-cover" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2.5">
                  <p className="text-sm flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="space-y-2 border-t border-border pt-3">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-20 h-20 rounded border border-border overflow-hidden bg-muted flex items-center justify-center">
                    {file.file.type.startsWith('image/') ? (
                      <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-center p-1 truncate w-full">
                        {file.file.name}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.doc,.docx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Attach files (invoices, PDFs, images)"
              className="w-12 h-12"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Ask about shipping, capacity, or upload documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              maxLength={2000}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading || (!input.trim() && attachedFiles.length === 0)}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {input.length}/2000 characters • Supports images, PDFs, invoices (max 10MB each)
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
