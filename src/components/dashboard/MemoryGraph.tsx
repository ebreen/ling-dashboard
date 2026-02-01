import { useEffect, useRef, useState } from 'react';

interface MemoryGraphProps {
  apiUrl?: string;
}

interface NodeState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label?: string;
}

const MemoryGraph = ({ apiUrl }: MemoryGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodeState[]>([]);
  const edgesRef = useRef<{source: string, target: string}[]>([]);
  const animationRef = useRef<number>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch real graph data if API is available
    if (apiUrl) {
      fetch(`${apiUrl}/api/memories/graph`)
        .then(res => res.json())
        .then(data => {
          if (data.nodes && data.nodes.length > 0) {
            nodesRef.current = data.nodes.map((n: any) => ({
              id: n.id,
              x: Math.random() * 400 + 50,
              y: Math.random() * 300 + 50,
              vx: (Math.random() - 0.5) * 0.4,
              vy: (Math.random() - 0.5) * 0.4,
              radius: 3 + Math.random() * 4,
              label: n.label
            }));
            edgesRef.current = data.edges || [];
          }
          setIsLoading(false);
        })
        .catch(() => {
          // Use demo nodes on error
          initializeDemoNodes();
          setIsLoading(false);
        });
    } else {
      initializeDemoNodes();
      setIsLoading(false);
    }
  }, [apiUrl]);

  const initializeDemoNodes = () => {
    nodesRef.current = Array.from({ length: 30 }, (_, i) => ({
      id: `node-${i}`,
      x: Math.random() * 400 + 50,
      y: Math.random() * 300 + 50,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: 2 + Math.random() * 4
    }));
    edgesRef.current = [];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < node.radius || node.x > canvas.width - node.radius) {
          node.vx *= -1;
          node.x = Math.max(node.radius, Math.min(canvas.width - node.radius, node.x));
        }
        if (node.y < node.radius || node.y > canvas.height - node.radius) {
          node.vy *= -1;
          node.y = Math.max(node.radius, Math.min(canvas.height - node.radius, node.y));
        }
      });

      // Draw edges from API data or proximity
      if (edges.length > 0) {
        // Draw API edges
        ctx.strokeStyle = 'rgba(224, 112, 32, 0.2)';
        ctx.lineWidth = 1;
        edges.forEach(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (source && target) {
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
        });
      } else {
        // Draw proximity-based edges
        ctx.strokeStyle = 'rgba(224, 112, 32, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              ctx.globalAlpha = 1 - dist / 100;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Draw nodes
      nodes.forEach(node => {
        // Outer glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        );
        gradient.addColorStop(0, 'rgba(224, 112, 32, 0.3)');
        gradient.addColorStop(1, 'rgba(224, 112, 32, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#E07020';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoading]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-panel">
          <span className="text-xs text-text-muted animate-pulse">Loading graph...</span>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default MemoryGraph;
