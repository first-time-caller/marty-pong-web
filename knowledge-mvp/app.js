const CENTER = [-0.1246, 51.5074]; // Charing Cross
const RADIUS_KM = 4.8; // ~3 miles
const OPENFREE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty/style.json";
const VECTOR_FALLBACK_STYLE_URL = "https://demotiles.maplibre.org/style.json";
const RASTER_FALLBACK_STYLE = {
  version: 8,
  name: "OSM Raster",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm-tiles"
    }
  ]
};

const scoreEl = document.getElementById("score");
const drawnDistanceEl = document.getElementById("drawnDistance");
const idealDistanceEl = document.getElementById("idealDistance");
const hintEl = document.getElementById("hint");
const mapStatusEl = document.getElementById("mapStatus");
const missionTextEl = document.getElementById("missionText");
const missionMetaEl = document.getElementById("missionMeta");

const newRouteBtn = document.getElementById("newRouteBtn");
const drawToggleBtn = document.getElementById("drawToggleBtn");

let map;
let startPoint;
let endPoint;
let startMarker;
let endMarker;
let drawnLine = [];
let drawingActive = false;
let isDrawing = false;
let activeChallenge = false;
const START_END_TOLERANCE_KM = 0.12; // ~120m

init();

function init() {
  if (!window.maplibregl) {
    setStatus("Map: MapLibre failed to load");
    hintEl.textContent = "Map engine failed to load. Check your network or CDN.";
    return;
  }
  if (!maplibregl.supported()) {
    setStatus("Map: WebGL unavailable");
    hintEl.textContent = "WebGL is unavailable in this browser/device.";
    return;
  }

  map = new maplibregl.Map({
    container: "map",
    style: RASTER_FALLBACK_STYLE,
    center: CENTER,
    zoom: 13,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

  map.on("load", () => {
    setStatus("Map: raster fallback loaded");
    applyNoirStyle();
    setupSources();
    createRoute();
    tryOpenFreeStyle();
  });

  map.on("idle", () => {
    if (mapStatusEl && mapStatusEl.textContent.includes("loaded")) {
      setStatus("Map: ready");
    }
  });

  map.on("error", (event) => {
    if (event?.error?.message?.includes("Style")) {
      hintEl.textContent =
        "Vector style failed. Staying on raster fallback.";
      setStatus("Map: raster fallback (vector style error)");
    }
  });


async function tryOpenFreeStyle() {
  try {
    setStatus("Map: checking OpenFreeMap style...");
    const response = await fetch(OPENFREE_STYLE_URL, { method: "GET" });
    if (!response.ok) {
      hintEl.textContent =
        "OpenFreeMap style returned an error. Staying on fallback.";
      setStatus(`Map: OpenFreeMap error (${response.status})`);
      return;
    }
    map.setStyle(OPENFREE_STYLE_URL);
    map.once("styledata", () => {
      applyNoirStyle();
      setupSources();
      createRoute();
      hintEl.textContent = "Tap “Draw Route” then trace the roads.";
      setStatus("Map: OpenFreeMap style loaded");
    });
  } catch (error) {
    hintEl.textContent =
      "OpenFreeMap unavailable. Staying on fallback tiles.";
    setStatus("Map: OpenFreeMap unavailable");
  }
}

function setStatus(message) {
  if (mapStatusEl) {
    mapStatusEl.textContent = message;
  }
}
  newRouteBtn.addEventListener("click", () => {
    createRoute();
  });

  drawToggleBtn.addEventListener("click", () => {
    drawingActive = !drawingActive;
    drawToggleBtn.classList.toggle("active", drawingActive);
    drawToggleBtn.textContent = drawingActive ? "Drawing…" : "Draw Route";
    hintEl.textContent = drawingActive
      ? "Trace the roads from A to B. Lift finger to score."
      : "Tap “Draw Route” then trace the roads.";
    map.dragPan.enable(!drawingActive);
    map.scrollZoom.enable(!drawingActive);
    map.doubleClickZoom.enable(!drawingActive);
  });

  const canvas = map.getCanvas();
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);
}

function setupSources() {
  if (!map.getSource("player-line")) {
    map.addSource("player-line", {
      type: "geojson",
      data: turf.lineString([]),
    });

    map.addLayer({
      id: "player-line",
      type: "line",
      source: "player-line",
      paint: {
        "line-color": "#fef45b",
        "line-width": 4,
      },
    });
  }

  if (!map.getSource("ideal-line")) {
    map.addSource("ideal-line", {
      type: "geojson",
      data: turf.lineString([]),
    });

    map.addLayer({
      id: "ideal-line",
      type: "line",
      source: "ideal-line",
      paint: {
        "line-color": "#ffffff",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    });
  }
}

function applyNoirStyle() {
  const style = map.getStyle();
  for (const layer of style.layers) {
    if (layer.type === "symbol") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
    if (layer.type === "line" && layer.id.includes("road")) {
      map.setPaintProperty(layer.id, "line-color", "#fef45b");
    }
    if (layer.type === "fill" && layer.id.includes("water")) {
      map.setPaintProperty(layer.id, "fill-color", "#0b0f14");
    }
    if (layer.type === "fill" && layer.id.includes("land")) {
      map.setPaintProperty(layer.id, "fill-color", "#0e141c");
    }
  }
}

function createRoute() {
  drawnLine = [];
  updatePlayerLine();

  startPoint = randomPointWithinRadius(CENTER, RADIUS_KM);
  endPoint = randomPointWithinRadius(CENTER, RADIUS_KM);

  if (startMarker) startMarker.remove();
  if (endMarker) endMarker.remove();

  startMarker = new maplibregl.Marker({ color: "#3ddc97" })
    .setLngLat(startPoint)
    .addTo(map);
  endMarker = new maplibregl.Marker({ color: "#ff6b6b" })
    .setLngLat(endPoint)
    .addTo(map);

  const idealLine = turf.lineString([startPoint, endPoint]);
  map.getSource("ideal-line").setData(idealLine);

  const idealDistance = turf.length(idealLine, { units: "kilometers" });
  idealDistanceEl.textContent = idealDistance.toFixed(2);

  scoreEl.textContent = "—";
  drawnDistanceEl.textContent = "—";
  activeChallenge = true;
  missionTextEl.textContent = "Drive from A (green) to B (red) without leaving the roads.";
  missionMetaEl.textContent = "Tap “Draw Route” and trace your path.";
}

function handlePointerDown(event) {
  if (!drawingActive || !activeChallenge) return;
  event.preventDefault();
  if (event.pointerId != null) {
    map.getCanvas().setPointerCapture(event.pointerId);
  }
  isDrawing = true;
  drawnLine = [screenToLngLat(event)];
  updatePlayerLine();
}

function handlePointerMove(event) {
  if (!drawingActive || !isDrawing) return;
  event.preventDefault();
  const point = screenToLngLat(event);
  drawnLine.push(point);
  updatePlayerLine();
}

function handlePointerUp() {
  if (!drawingActive || !isDrawing) return;
  isDrawing = false;
  scoreRoute();
}

function updatePlayerLine() {
  const line = turf.lineString(drawnLine.length ? drawnLine : []);
  map.getSource("player-line").setData(line);
}

function scoreRoute() {
  if (drawnLine.length < 2) {
    scoreEl.textContent = "0";
    drawnDistanceEl.textContent = "0.00";
    missionMetaEl.textContent = "No path drawn. Try again.";
    return;
  }

  const line = turf.lineString(drawnLine);
  const drawnDistance = turf.length(line, { units: "kilometers" });
  const idealDistance = parseFloat(idealDistanceEl.textContent);
  const startDistance = turf.distance(
    turf.point(drawnLine[0]),
    turf.point(startPoint),
    { units: "kilometers" }
  );
  const endDistance = turf.distance(
    turf.point(drawnLine[drawnLine.length - 1]),
    turf.point(endPoint),
    { units: "kilometers" }
  );

  if (startDistance > START_END_TOLERANCE_KM || endDistance > START_END_TOLERANCE_KM) {
    scoreEl.textContent = "0";
    drawnDistanceEl.textContent = drawnDistance.toFixed(2);
    missionMetaEl.textContent = "Start at A and finish at B to score.";
    return;
  }

  const ratio = idealDistance / drawnDistance;
  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));

  drawnDistanceEl.textContent = drawnDistance.toFixed(2);
  scoreEl.textContent = `${score}`;
  missionMetaEl.textContent = "Score based on efficiency vs. ideal distance.";
}

function randomPointWithinRadius([lng, lat], radiusKm) {
  const radiusRadians = radiusKm / 6371;
  const u = Math.random();
  const v = Math.random();
  const w = radiusRadians * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const newLat = Math.asin(
    Math.sin(toRad(lat)) * Math.cos(w) +
      Math.cos(toRad(lat)) * Math.sin(w) * Math.cos(t)
  );
  const newLng = toRad(lng) +
    Math.atan2(
      Math.sin(t) * Math.sin(w) * Math.cos(toRad(lat)),
      Math.cos(w) - Math.sin(toRad(lat)) * Math.sin(newLat)
    );
  return [toDeg(newLng), toDeg(newLat)];
}

function screenToLngLat(event) {
  const rect = map.getCanvas().getBoundingClientRect();
  const point = [event.clientX - rect.left, event.clientY - rect.top];
  return map.unproject(point).toArray();
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}
