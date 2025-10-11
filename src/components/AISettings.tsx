import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface AISettingsProps {
  model: string;
  setModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

export const AISettings = ({
  model,
  setModel,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  systemPrompt,
  setSystemPrompt,
}: AISettingsProps) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4" />
          Developer Settings
        </CardTitle>
        <CardDescription className="text-xs">
          Fine-tune AI model parameters (developers only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model" className="text-xs">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover">
              <SelectItem value="openai/gpt-5-mini">OpenAI GPT-5 Mini</SelectItem>
              <SelectItem value="openai/gpt-5">OpenAI GPT-5</SelectItem>
              <SelectItem value="openai/gpt-5-nano">OpenAI GPT-5 Nano</SelectItem>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Free)</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Free)</SelectItem>
              <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Free)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature" className="text-xs">
              Temperature: {temperature.toFixed(2)}
            </Label>
            <span className="text-xs text-muted-foreground">
              Creativity vs Precision
            </span>
          </div>
          <Slider
            id="temperature"
            min={0}
            max={2}
            step={0.1}
            value={[temperature]}
            onValueChange={(value) => setTemperature(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="maxTokens" className="text-xs">
              Max Tokens: {maxTokens}
            </Label>
            <span className="text-xs text-muted-foreground">
              Response Length
            </span>
          </div>
          <Slider
            id="maxTokens"
            min={100}
            max={4000}
            step={100}
            value={[maxTokens]}
            onValueChange={(value) => setMaxTokens(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum length of AI responses
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="systemPrompt" className="text-xs">
            System Prompt
          </Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter custom system prompt..."
            className="min-h-[100px] text-xs"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            Instructions that guide the AI's behavior ({systemPrompt.length}/2000)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
