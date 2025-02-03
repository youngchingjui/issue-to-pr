"use client"

import "reactflow/dist/style.css"

import { useCallback, useEffect, useState } from "react"
import ReactFlow, {
  addEdge,
  Background,
  ConnectionLineType,
  Controls,
  type Edge,
  MarkerType,
  type Node,
} from "reactflow"

const nodeTypes = {
  default: ({ data }: { data: { label: string } }) => (
    <div className="bg-white border-2 border-gray-300 rounded p-2 shadow-md">
      <strong>{data.label}</strong>
    </div>
  ),
  agent: ({ data }: { data: { label: string } }) => (
    <div className="bg-blue-100 border-2 border-blue-500 rounded p-2 shadow-md">
      <strong>{data.label}</strong>
    </div>
  ),
  tool: ({ data }: { data: { label: string } }) => (
    <div className="bg-green-100 border-2 border-green-500 rounded p-2 shadow-md">
      <strong>{data.label}</strong>
    </div>
  ),
}

export function DynamicFlowDiagram() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isFlowStarted, setIsFlowStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  )

  const startFlow = useCallback(() => {
    console.log("Starting flow")
    setIsFlowStarted(true)
    setNodes([])
    setEdges([])
    setError(null)
  }, [])

  useEffect(() => {
    if (!isFlowStarted) return

    console.log("Creating EventSource")
    const eventSource = new EventSource("/api/workflow?start=true")

    eventSource.onopen = () => {
      console.log("EventSource connection opened")
    }

    eventSource.onmessage = (event) => {
      console.log("Received event:", event.data)
      try {
        const data = JSON.parse(event.data)
        if (data.type === "node") {
          console.log("Adding node:", data)
          setNodes((nds) => [
            ...nds,
            {
              ...data,
              type: data.id.startsWith("agent")
                ? "agent"
                : data.id.startsWith("tool")
                  ? "tool"
                  : "default",
            },
          ])
        } else if (data.type === "edge") {
          console.log("Adding edge:", data)
          setEdges((eds) => [
            ...eds,
            {
              ...data,
              // type: "smoothstep",
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
            },
          ])
        }
      } catch (error) {
        console.error("Error parsing event data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      setError(
        "An error occurred while fetching the workflow data. Please try again."
      )
      setIsFlowStarted(false)
      eventSource.close()
    }

    return () => {
      console.log("Closing EventSource")
      eventSource.close()
    }
  }, [isFlowStarted])

  return (
    <div className="w-full h-[600px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      <button
        className="absolute top-4 left-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={startFlow}
        disabled={isFlowStarted}
      >
        {isFlowStarted ? "Flow in Progress..." : "Start Flow"}
      </button>
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
