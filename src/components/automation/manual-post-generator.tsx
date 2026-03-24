"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { poster } from "@/lib/api-client";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "thought_leader", label: "Thought Leader" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
];

const STYLE_OPTIONS = [
  { value: "storytelling", label: "Storytelling" },
  { value: "educational", label: "Educational" },
  { value: "inspirational", label: "Inspirational" },
  { value: "data_driven", label: "Data Driven" },
  { value: "question_based", label: "Question Based" },
  { value: "listicle", label: "Listicle" },
];

export function ManualPostGenerator({
  onPostGenerated,
}: {
  onPostGenerated?: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("thought_leader");
  const [style, setStyle] = useState("educational");
  const [platform, setPlatform] = useState("linkedin");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      // Parse keywords into array
      const keywordArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

      const payload = {
        topic: topic.trim(),
        target_audience: targetAudience.trim() || "General audience",
        keywords: keywordArray,
        platform,
        tone,
        style,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending to native backend generate-manual", payload);

      const response = await poster("/generate-manual", payload);

      if (response && response.success) {
        toast.success("Draft post generated successfully!");
        setTopic("");
        setTargetAudience("");
        setKeywords("");
        setTone("thought_leader");
        setStyle("educational");
        setPlatform("linkedin");

        if (onPostGenerated) onPostGenerated();
      } else {
        toast.error("Failed to send request");
      }
    } catch (error: any) {
      toast.error(error.message || "Error connecting to automation service");
      console.error("Generator error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-dashed bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Post Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic *</Label>
            <Input
              id="topic"
              placeholder="Enter a topic (e.g., 'The future of remote work')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Target Platform</Label>
            <Select value={platform} onValueChange={setPlatform} disabled={isGenerating}>
              <SelectTrigger id="platform" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="reddit">Reddit</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Input
              id="audience"
              placeholder="e.g., Tech professionals, Startups, CTOs"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={isGenerating}
              className="bg-background"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Textarea
              id="keywords"
              placeholder="e.g., AI, automation, productivity, innovation"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={isGenerating}
              className="bg-background min-h-[60px]"
            />
          </div>

          {/* Tone and Style in a row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={tone}
                onValueChange={setTone}
                disabled={isGenerating}
              >
                <SelectTrigger id="tone" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                value={style}
                onValueChange={setStyle}
                disabled={isGenerating}
              >
                <SelectTrigger id="style" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Draft...
              </>
            ) : (
              <>
                Generate Draft Post
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This will trigger our native LangGraph AI agent to research and write a post draft for you.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
