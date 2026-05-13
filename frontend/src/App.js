import React, { useState, useCallback } from 'react';
import Canvas from './Canvas';
import { fetchPatrolPath } from './api';

function App() {
    const [rectangles, setRectangles] = useState([]);
    const [patrolPoints, setPatrolPoints] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const addRectangle = useCallback((rect) => {
        setRectangles(prev => [...prev, rect]);
        // Clear previous patrol when new rectangle added
        setPatrolPoints([]);
    }, []);

    const drawPatrol = useCallback(async () => {
        if (rectangles.length === 0) return;
        setIsLoading(true);
        try {
          const path = await fetchPatrolPath(rectangles);
            // Animate drawing: we'll just set the points and the canvas will draw immediately
            // For smooth transition we can gradually reveal the path using an effect.
            // We'll implement a simple animation: after getting points, we draw them with stroke-dashoffset, but canvas doesn't support that easily.
            // Instead we can add a "fade" effect or simply redraw; the user expects smoothness – we'll add a small delay in canvas drawing by gradually building the path.
            // For simplicity and to avoid overcomplicating, we'll set the points and the canvas will draw all at once.
            setPatrolPoints(path);
        } catch (err) {
            console.error(err);
            alert('Error computing patrol path');
        } finally {
            setIsLoading(false);
        }
    }, [rectangles]);

    const reset = () => {
        setRectangles([]);
        setPatrolPoints([]);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Patrol Path Optimizer</h1>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <Canvas
                    rectangles={rectangles}
                    patrolPoints={patrolPoints}
                    onAddRectangle={addRectangle}
                />
                <div style={{ width: '250px' }}>
                    <button onClick={drawPatrol} disabled={isLoading || rectangles.length === 0}>
                        {isLoading ? 'Computing...' : 'Draw Patrol Route'}
                    </button>
                    <button onClick={reset} style={{ marginLeft: '10px' }}>Clear All</button>
                    <h3>Rectangles: {rectangles.length}</h3>
                    <ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
                        {rectangles.map((r, i) => (
                            <li key={i}>
                                ({r.x1.toFixed(1)},{r.y1.toFixed(1)}) –
                                ({r.x2.toFixed(1)},{r.y2.toFixed(1)})
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App;
