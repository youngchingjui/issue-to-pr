"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/hooks/use-toast";
import { ResolveRequestSchema } from "@/lib/schemas/api";
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common";

interface Props {
  issueNumber: number;
  repoFullName: string;
}

export default function ResolveIssueController({ issueNumber, repoFullName }: Props) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResolve = async () => {
    setError(null);
    const apiKey = getApiKeyFromLocalStorage();
    if (!apiKey) {
      toast({
        title: "API key not found",
        description: "Please save an OpenAI API key first.",
        variant: "destructive",
      });
      setError("No API key found");
      return;
    }
    setLoading(true);
    try {
      const requestBody = ResolveRequestSchema.parse({
        issueNumber,
        repoFullName,
        apiKey,
        createPR: false,
      });
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start resolution workflow");
      }
      const data = await response.json();
      setJobId(data.jobId);
      toast({
        title: "Resolution Workflow Started",
        description: "Monitor progress in Workflow Runs.",
      });
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      toast({
        title: "Failed to start workflow",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const apiKeyMissing = !getApiKeyFromLocalStorage();

  return (
    <div className="my-4">
      <Button
        onClick={handleResolve}
        disabled={loading || apiKeyMissing}
        className="w-full mb-2"
      >
        {loading ? "Starting..." : "Resolve Issue with this Plan"}
      </Button>
      {apiKeyMissing && (
        <div className="text-xs text-red-600 pb-1">Please add an OpenAI API key to enable this action.</div>
      )}
      {jobId && (
        <div className="text-green-700 text-sm mt-2">
          Workflow started!{' '}
          <a
            href={`/workflow-runs/${jobId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            View workflow run
          </a>
        </div>
      )}
      {error && (
        <div className="text-red-600 text-sm mt-2">{error}</div>
      )}
    </div>
  );
}
