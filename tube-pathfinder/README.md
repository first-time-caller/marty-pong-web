# London Underground Pathfinder

A Harry Beck-inspired London Underground route visualizer using Dijkstra's shortest path algorithm with Canvas rendering and 45-degree grid aesthetics.

## Features

- **Beck-Style Grid**: All station positions use a simplified 45-degree angle grid system
- **Dijkstra Pathfinding**: Finds optimal routes between any two stations
- **Condition Modes**:
  - **Rush Hour**: Zone 1 stations are heavily weighted (×100) to simulate congestion
  - **Accessibility**: Only shows routes through step-free access stations
- **Animated Route Drawing**: Visual train-style animation showing route progression
- **Ghost Map Rendering**: Full network displayed at 20% opacity with highlighted path overlay

## How to Run

1. Navigate to the project directory:
   ```powershell
   cd "C:\Users\bradley\Desktop\coding practice stuff\tube-pathfinder"
   ```

2. Start a local web server:
   ```powershell
   python -m http.server 8081
   ```

3. Open your browser to: `http://localhost:8081`

## Usage

1. Select a **start station** from the dropdown
2. Select an **end station** from the dropdown
3. (Optional) Enable **Rush Hour Mode** to avoid Zone 1
4. (Optional) Enable **Accessibility Required** for step-free routes only
5. Click **Find Route** to calculate the path
6. Click **Animate Route** to see the train movement visualization
7. Click **Reset** to clear and start over

## Data Schema

### `data.json` Structure

```json
{
  "stations": [
    {
      "id": "KGX",              // Unique station identifier
      "name": "King's Cross",   // Display name
      "x": 12,                  // Beck grid X coordinate
      "y": 8,                   // Beck grid Y coordinate
      "zones": [1],             // Zone numbers (can be multiple)
      "accessible": true,       // Step-free access available
      "lines": ["VIC", "PIC"]   // Lines serving this station
    }
  ],
  "lines": [
    {
      "id": "VIC",
      "name": "Victoria",
      "color": "#0098D4",       // Official TfL line color
      "segments": [
        ["WAL", "HNS", "KGX"]   // Ordered station connections
      ]
    }
  ]
}
```

## Algorithm Details

### Dijkstra Implementation

- **Standard Edge Weight**: 1 (uniform distance between connected stations)
- **Rush Hour Modifier**: Stations in Zone 1 get weight × 100
- **Accessibility Filter**: Non-accessible stations are excluded from the graph

### Canvas Rendering

- **Grid Scale**: 30px per Beck unit
- **Station Circles**: 5px radius (default), 8px radius (highlighted)
- **Line Width**: 6px (ghost map), 10px (highlighted path)
- **Animation**: Progress variable (0.0 → 1.0) controls partial segment drawing

## Tech Stack

- **Vanilla JavaScript** (ES6+)
- **HTML5 Canvas** for map rendering
- **CSS Grid** for responsive layout
- **No external libraries** - pure browser APIs

## Future Enhancements

- Real-time TfL API integration
- Journey time estimation
- Interchange penalty weighting
- National Rail connections
- Mobile touch controls
- Export route as image

## Credits

Inspired by Harry Beck's iconic 1931 London Underground map design.
