import React, { useRef, useEffect, useState, useCallback } from 'react';

const Canvas = ({ rectangles, patrolPoints, onAddRectangle }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [hoverPoint, setHoverPoint] = useState(null);
    const [drawProgress, setDrawProgress] = useState(1);      // 0 = nothing, 1 = fully drawn
    const animationRef = useRef(null);

    // World coordinate mapping (same as before)
    const worldMin = -2, worldMax = 12, worldWidth = worldMax - worldMin;
    const worldHeight = worldMax - worldMin;
    const canvasSize = 600;

    const toCanvas = (x, y) => ({
        x: ((x - worldMin) / worldWidth) * canvasSize,
        y: canvasSize - ((y - worldMin) / worldHeight) * canvasSize
    });

    const toWorld = (canvasX, canvasY) => ({
        x: (canvasX / canvasSize) * worldWidth + worldMin,
        y: ((canvasSize - canvasY) / canvasSize) * worldHeight + worldMin
    });


    // Animate progress when new patrolPoints arrive
  useEffect(() => {
    if (patrolPoints.length > 0) {
            setDrawProgress(0);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            const startTime = performance.now();
            const duration = 800; // milliseconds
          const animate = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                setDrawProgress(t);
                if (t < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    animationRef.current = null;
                }
            };
          animationRef.current = requestAnimationFrame(animate);
        }
        // Cleanup
    return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [patrolPoints]);

    // Draw only a portion of the closed polygon based on progress
    const drawPartialHull = (ctx, points, progress) => {
        if (!points || points.length < 2) return;

        // Compute edge lengths and total perimeter
        const lengths = [];
        let total = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            lengths.push(dist);
            total += dist;
        }

        const targetLength = total * progress;
        let accumulated = 0;
        ctx.beginPath();
        let firstPoint = null;

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const segLen = lengths[i];
            const canvasP1 = toCanvas(p1.x, p1.y);
            const canvasP2 = toCanvas(p2.x, p2.y);

            if (i === 0) {
                ctx.moveTo(canvasP1.x, canvasP1.y);
                firstPoint = canvasP1;
            }

            if (accumulated + segLen >= targetLength) {
                // Partial segment: interpolate
                const remaining = targetLength - accumulated;
                const ratio = remaining / segLen;
                const interpX = p1.x + (p2.x - p1.x) * ratio;
                const interpY = p1.y + (p2.y - p1.y) * ratio;
                const canvasInterp = toCanvas(interpX, interpY);
                ctx.lineTo(canvasInterp.x, canvasInterp.y);
                break;
            } else {
                ctx.lineTo(canvasP2.x, canvasP2.y);
                accumulated += segLen;
            }
        }

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.stroke();
    };

    // Main drawing effect
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        for (let i = -2; i <= 12; i++) {
            const p1 = toCanvas(i, -2);
            const p2 = toCanvas(i, 12);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            const p3 = toCanvas(-2, i);
            const p4 = toCanvas(12, i);
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.stroke();
        }

        // Draw rectangles
        rectangles.forEach(rect => {
            const p1 = toCanvas(rect.x1, rect.y1);
            const p2 = toCanvas(rect.x2, rect.y2);
            ctx.fillStyle = 'rgba(100, 149, 237, 0.4)';
            ctx.fillRect(
                Math.min(p1.x, p2.x),
                Math.min(p1.y, p2.y),
                Math.abs(p2.x - p1.x),
                Math.abs(p2.y - p1.y)
            );
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                Math.min(p1.x, p2.x),
                Math.min(p1.y, p2.y),
                Math.abs(p2.x - p1.x),
                Math.abs(p2.y - p1.y)
            );
        });

        // Animated patrol path
        if (patrolPoints && patrolPoints.length > 1 && drawProgress > 0) {
            drawPartialHull(ctx, patrolPoints, drawProgress);
            // Draw red vertices only when fully complete
            if (drawProgress === 1) {
                patrolPoints.forEach(p => {
                    const pt = toCanvas(p.x, p.y);
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        }

        // Temporary rectangle while user draws
        if (isDrawing && startPoint && hoverPoint) {
            const p1 = toCanvas(startPoint.x, startPoint.y);
            const p2 = toCanvas(hoverPoint.x, hoverPoint.y);
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                Math.min(p1.x, p2.x),
                Math.min(p1.y, p2.y),
                Math.abs(p2.x - p1.x),
                Math.abs(p2.y - p1.y)
            );
            ctx.setLineDash([]);
        }
    }, [rectangles, patrolPoints, isDrawing, startPoint, hoverPoint, drawProgress, toCanvas]);

    // Mouse handlers (unchanged)
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const world = toWorld(canvasX, canvasY);
        setIsDrawing(true);
        setStartPoint(world);
        setHoverPoint(world);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const world = toWorld(canvasX, canvasY);
        setHoverPoint(world);
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const endWorld = toWorld(canvasX, canvasY);
        if (startPoint && endWorld &&
            Math.abs(startPoint.x - endWorld.x) > 0.1 &&
            Math.abs(startPoint.y - endWorld.y) > 0.1) {
            onAddRectangle({
                x1: startPoint.x,
                y1: startPoint.y,
                x2: endWorld.x,
                y2: endWorld.y
            });
        }
        setIsDrawing(false);
        setStartPoint(null);
        setHoverPoint(null);
    };

    return (
        <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{ border: '1px solid black', cursor: 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        />
    );
};

export default Canvas;
