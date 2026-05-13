const API_URL = '/api/patrol';

export const fetchPatrolPath = async (rectangles) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rectangles)
    });
    if (!response.ok) throw new Error('Failed to fetch patrol path');
    return response.json();
};
