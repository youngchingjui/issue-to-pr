"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const maxStep = 4;

// Simulated "incremental data update" fetcher
function fetcher(step: number): Promise<{ value: number; step: number; timestamp: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        value: step,
        step,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 1000 + (step === 1 ? 400 : 0) + step * 250); // Variable "db lag"
  });
}

export default function SWRDemoCard() {
  const [replaySeed, setReplaySeed] = useState(Date.now());
  // Track current 'step' for the simulated DB
  const [step, setStep] = useState(1);

  // SWR - key includes replaySeed and step so step changes/remount triggers new "fetch"
  const { data, isValidating, mutate } = useSWR(
    `demo-db-value-${replaySeed}-${step}`,
    () => fetcher(step),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // After each fetch, increment to next step (simulate "push" DB update)
  // But stop after maxStep
  // We'll only "mutate" to next step if under maxStep
  function advanceStep() {
    if (step < maxStep) {
      setTimeout(() => setStep((s) => s + 1), 1600); // After showing, auto advance
    }
  }

  // Auto-advance on data fetch complete (except after the last step)
  if (data && step < maxStep) {
    advanceStep();
  }

  // Handler for Replay
  function handleReplay() {
    setReplaySeed(Date.now());
    setStep(1);
    mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SWR Demo: Incrementally Updating Data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <div className="mb-2 text-center">
          <span className="font-semibold">Mock Database Value:&nbsp;</span>
          <span className="text-2xl font-mono">{data?.value ?? "…"}</span>
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {isValidating ? (
            <span>Updating… <span className="animate-pulse">⏳</span></span>
          ) : (
            data && <span>Last updated at {data.timestamp}</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReplay}
          disabled={isValidating && step === 1}
        >
          Replay
        </Button>
        <div className="mt-1 text-xs text-muted-foreground">
          This demo increments the value several times as if a remote DB is pushing updates.
        </div>
      </CardContent>
    </Card>
  );
}

