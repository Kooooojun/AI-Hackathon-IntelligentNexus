// src/components/design/FlowDisplay.tsx
import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node, // Type for nodes array
  Edge, // Type for edges array
  BackgroundVariant,
  NodeTypes, // Type for custom node types
  Position, // Used by MiniMap node positioning
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import default styles

import DesignNode, { DesignNodeData } from './DesignNode'; // Import your custom node

interface FlowDisplayProps {
  nodes: Node<DesignNodeData>[]; // Use specific node data type
  edges: Edge[];
  isLoading?: boolean; // Can be used for overlay or placeholder
}

// Define custom node types for react-flow
const nodeTypes: NodeTypes = {
  designNode: DesignNode, // Map 'designNode' type to your component
};

export function FlowDisplay({ nodes, edges, isLoading = false }: FlowDisplayProps) {

  // Basic loading state
  if (isLoading) {
     return ( <div className="flex items-center justify-center h-full"> <div className="animate-pulse text-primary text-lg">載入中...</div> </div> );
  }

  // Empty state
  if (nodes.length === 0) {
     return ( <div className="flex items-center justify-center h-full"> <p className="text-muted-foreground text-center py-8">尚未生成任何設計。</p> </div> );
  }

  return (
    // ReactFlowProvider is needed for hooks like useReactFlow
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}> {/* Ensure container has dimensions */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes} // Register custom node type(s)
          nodesDraggable={true} // Allow dragging nodes (optional)
          edgesFocusable={false} // Edges usually not focusable
          fitView // Automatically zoom/pan to fit nodes on load/change
          fitViewOptions={{ padding: 0.1 }} // Padding for fitView
          proOptions={{ hideAttribution: true }} // Hide React Flow attribution for Pro users/paid plans
          // defaultEdgeOptions={{ type: 'smoothstep', animated: true }} // Example edge styling
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
             nodeStrokeWidth={3}
             nodeColor={(n) => { // Example: Color minimap node based on level/type?
                // Basic check if it's likely an initial node (no parent edge)
                const isInitial = !edges.some(e => e.target === n.id);
                return isInitial ? 'hsl(var(--primary))' : '#cccccc';
             }}
             pannable // Allow panning minimap
             zoomable // Allow zooming minimap
             position={Position.BottomLeft}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}