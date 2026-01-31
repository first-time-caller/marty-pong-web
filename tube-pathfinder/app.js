// Data structures
let stationsData = [];
let linesData = [];
let adjacencyList = {};
let currentPath = null;
let animationProgress = 0;
let isAnimating = false;

// Canvas setup
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

// Grid settings (Beck-style 45-degree grid)
const GRID_SIZE = 30;
const OFFSET_X = 50;
const OFFSET_Y = 50;

// Convert Beck coordinates to canvas pixels
function beckToCanvas(x, y) {
    return {
        x: OFFSET_X + x * GRID_SIZE,
        y: OFFSET_Y + y * GRID_SIZE
    };
}

// Snap lines to 45-degree angles (0°, 45°, 90°, 135°, 180°)
function snapTo45Degrees(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Snap to nearest 45-degree increment
    const snappedAngle = Math.round(angle / 45) * 45;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const radians = snappedAngle * (Math.PI / 180);
    return {
        x: x1 + Math.cos(radians) * distance,
        y: y1 + Math.sin(radians) * distance
    };
}

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        stationsData = data.stations;
        linesData = data.lines;
        buildAdjacencyList();
        populateStationDropdowns();
        renderMap();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Build adjacency list for pathfinding
function buildAdjacencyList() {
    adjacencyList = {};
    
    // Initialize
    stationsData.forEach(station => {
        adjacencyList[station.id] = [];
    });
    
    // Build connections from line segments
    linesData.forEach(line => {
        line.segments.forEach(segment => {
            for (let i = 0; i < segment.length - 1; i++) {
                const from = segment[i];
                const to = segment[i + 1];
                
                // Add bidirectional edges
                if (!adjacencyList[from].includes(to)) {
                    adjacencyList[from].push(to);
                }
                if (!adjacencyList[to].includes(from)) {
                    adjacencyList[to].push(from);
                }
            }
        });
    });
}

// Populate station dropdowns
function populateStationDropdowns() {
    const startSelect = document.getElementById('start-station');
    const endSelect = document.getElementById('end-station');
    
    const sortedStations = [...stationsData].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedStations.forEach(station => {
        const option1 = document.createElement('option');
        option1.value = station.id;
        option1.textContent = `${station.name} (Zone ${station.zones.join('/')})`;
        startSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = station.id;
        option2.textContent = `${station.name} (Zone ${station.zones.join('/')})`;
        endSelect.appendChild(option2);
    });
}

// Dijkstra's algorithm
function dijkstra(startId, endId, rushHour, accessibilityRequired) {
    // Filter stations if accessibility required
    let validStations = stationsData;
    if (accessibilityRequired) {
        validStations = stationsData.filter(s => s.accessible);
    }
    
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    stationsData.forEach(station => {
        distances[station.id] = Infinity;
        previous[station.id] = null;
        unvisited.add(station.id);
    });
    
    distances[startId] = 0;
    
    while (unvisited.size > 0) {
        // Find node with minimum distance
        let current = null;
        let minDistance = Infinity;
        
        for (const stationId of unvisited) {
            if (distances[stationId] < minDistance) {
                minDistance = distances[stationId];
                current = stationId;
            }
        }
        
        if (current === null || distances[current] === Infinity) {
            break;
        }
        
        if (current === endId) {
            break;
        }
        
        unvisited.delete(current);
        
        // Check neighbors
        const neighbors = adjacencyList[current] || [];
        
        for (const neighbor of neighbors) {
            if (!unvisited.has(neighbor)) continue;
            
            // Skip if accessibility required and station not accessible
            if (accessibilityRequired) {
                const neighborStation = stationsData.find(s => s.id === neighbor);
                if (!neighborStation || !neighborStation.accessible) {
                    continue;
                }
            }
            
            // Calculate weight
            let weight = 1;
            
            // Rush hour: heavily weight Zone 1 stations
            if (rushHour) {
                const neighborStation = stationsData.find(s => s.id === neighbor);
                if (neighborStation && neighborStation.zones.includes(1)) {
                    weight = 100;
                }
            }
            
            const alt = distances[current] + weight;
            
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = current;
            }
        }
    }
    
    // Reconstruct path
    const path = [];
    let current = endId;
    
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }
    
    if (path[0] !== startId) {
        return null; // No path found
    }
    
    return path;
}

// Render the map
function renderMap(highlightPath = null, drawProgress = 1.0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ghost map (full network at 20% opacity)
    ctx.globalAlpha = 0.2;
    drawNetwork();
    ctx.globalAlpha = 1.0;
    
    // Draw highlighted path if exists
    if (highlightPath) {
        drawPath(highlightPath, drawProgress);
    }
    
    // Draw all stations
    drawStations(highlightPath);
}

// Draw the entire network
function drawNetwork() {
    linesData.forEach(line => {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        line.segments.forEach(segment => {
            ctx.beginPath();
            
            for (let i = 0; i < segment.length; i++) {
                const station = stationsData.find(s => s.id === segment[i]);
                if (!station) continue;
                
                const pos = beckToCanvas(station.x, station.y);
                
                if (i === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            
            ctx.stroke();
        });
    });
}

// Draw highlighted path
function drawPath(path, progress = 1.0) {
    if (path.length < 2) return;
    
    const pathLength = path.length - 1;
    const visibleSegments = Math.floor(pathLength * progress);
    const partialProgress = (pathLength * progress) - visibleSegments;
    
    for (let i = 0; i < path.length - 1; i++) {
        if (i > visibleSegments) break;
        
        const fromStation = stationsData.find(s => s.id === path[i]);
        const toStation = stationsData.find(s => s.id === path[i + 1]);
        
        if (!fromStation || !toStation) continue;
        
        const from = beckToCanvas(fromStation.x, fromStation.y);
        const to = beckToCanvas(toStation.x, toStation.y);
        
        // Determine line color (use first common line)
        const commonLines = fromStation.lines.filter(l => toStation.lines.includes(l));
        const lineColor = commonLines.length > 0 
            ? linesData.find(l => l.id === commonLines[0])?.color || '#FF6B00'
            : '#FF6B00';
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        
        // Draw partial segment for animation
        if (i === visibleSegments && partialProgress > 0) {
            const partialX = from.x + (to.x - from.x) * partialProgress;
            const partialY = from.y + (to.y - from.y) * partialProgress;
            ctx.lineTo(partialX, partialY);
        } else {
            ctx.lineTo(to.x, to.y);
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// Draw stations
function drawStations(highlightPath = null) {
    stationsData.forEach(station => {
        const pos = beckToCanvas(station.x, station.y);
        const isHighlighted = highlightPath && highlightPath.includes(station.id);
        
        // Station circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isHighlighted ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? '#FF6B00' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isHighlighted ? '#FF6B00' : '#333333';
        ctx.lineWidth = isHighlighted ? 3 : 2;
        ctx.stroke();
        
        // Station name (only for highlighted stations)
        if (isHighlighted) {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(station.name, pos.x, pos.y - 15);
        }
    });
}

// Find route button handler
document.getElementById('find-route').addEventListener('click', () => {
    const startId = document.getElementById('start-station').value;
    const endId = document.getElementById('end-station').value;
    const rushHour = document.getElementById('rush-hour').checked;
    const accessibility = document.getElementById('accessibility').checked;
    
    if (!startId || !endId) {
        alert('Please select both start and end stations');
        return;
    }
    
    if (startId === endId) {
        alert('Start and end stations must be different');
        return;
    }
    
    currentPath = dijkstra(startId, endId, rushHour, accessibility);
    
    if (!currentPath) {
        alert('No route found with the selected conditions');
        document.getElementById('route-info').classList.add('hidden');
        document.getElementById('animate-btn').disabled = true;
        return;
    }
    
    displayRouteInfo(currentPath);
    renderMap(currentPath, 1.0);
    document.getElementById('animate-btn').disabled = false;
});

// Display route information
function displayRouteInfo(path) {
    const routeInfo = document.getElementById('route-info');
    const stationCount = document.getElementById('station-count');
    const lineChanges = document.getElementById('line-changes');
    const routeSteps = document.getElementById('route-steps');
    
    stationCount.textContent = path.length;
    
    // Calculate line changes
    let changes = 0;
    let currentLine = null;
    
    for (let i = 0; i < path.length - 1; i++) {
        const fromStation = stationsData.find(s => s.id === path[i]);
        const toStation = stationsData.find(s => s.id === path[i + 1]);
        const commonLines = fromStation.lines.filter(l => toStation.lines.includes(l));
        
        if (currentLine && !commonLines.includes(currentLine)) {
            changes++;
            currentLine = commonLines[0];
        } else if (!currentLine) {
            currentLine = commonLines[0];
        }
    }
    
    lineChanges.textContent = changes;
    
    // Display route steps
    routeSteps.innerHTML = '';
    path.forEach((stationId, index) => {
        const station = stationsData.find(s => s.id === stationId);
        const step = document.createElement('div');
        step.className = 'route-step';
        
        if (index < path.length - 1) {
            const nextStation = stationsData.find(s => s.id === path[index + 1]);
            const commonLines = station.lines.filter(l => nextStation.lines.includes(l));
            const line = linesData.find(l => l.id === commonLines[0]);
            
            const indicator = document.createElement('div');
            indicator.className = 'line-indicator';
            indicator.style.backgroundColor = line?.color || '#666666';
            step.appendChild(indicator);
        }
        
        const text = document.createElement('span');
        text.textContent = station.name;
        step.appendChild(text);
        
        routeSteps.appendChild(step);
    });
    
    routeInfo.classList.remove('hidden');
}

// Animate route button handler
document.getElementById('animate-btn').addEventListener('click', () => {
    if (!currentPath || isAnimating) return;
    
    isAnimating = true;
    animationProgress = 0;
    
    const animate = () => {
        animationProgress += 0.02;
        
        if (animationProgress >= 1.0) {
            animationProgress = 1.0;
            isAnimating = false;
        }
        
        renderMap(currentPath, animationProgress);
        
        if (isAnimating) {
            requestAnimationFrame(animate);
        }
    };
    
    animate();
});

// Reset button handler
document.getElementById('reset-btn').addEventListener('click', () => {
    currentPath = null;
    animationProgress = 0;
    isAnimating = false;
    document.getElementById('start-station').value = '';
    document.getElementById('end-station').value = '';
    document.getElementById('rush-hour').checked = false;
    document.getElementById('accessibility').checked = false;
    document.getElementById('route-info').classList.add('hidden');
    document.getElementById('animate-btn').disabled = true;
    renderMap();
});

// Initialize
loadData();
