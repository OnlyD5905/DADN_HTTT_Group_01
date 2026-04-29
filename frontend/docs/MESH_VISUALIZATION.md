# Mesh Visualization System Architecture

## Overview

The Mesh Visualization System is a Three.js-based interactive 2D mesh renderer for the FEA Solver's Results page. It provides real-time visualization of finite element meshes with support for node selection, boundary condition assignment, and magnified viewing.

## Architecture

### Component Hierarchy

```
Results.tsx
  ├── MeshVisualization (main renderer)
  │   ├── Three.js Scene, Camera, Renderer
  │   ├── OrbitControls (pan/zoom/rotate)
  │   └── Raycaster (node selection)
  ├── BoundaryConditionMenu (context menu)
  │   └── Right-click event handler
  └── MagnifierZoom (auto-triggering magnifier)
      └── Secondary Three.js viewport
```

### Data Flow

```
Form Inputs (p, m, d1, d2)
  ↓
meshGenerator.generateQuadMesh()
  ↓
Mesh Data: { nodes: [[x,y], ...], edges: [[i,j], ...] }
  ↓
MeshVisualization (renders nodes + edges)
  ├── Node Selection (raycasting)
  ├── Edge Highlighting (lookup connected edges)
  └── Magnifier (synchronized secondary viewport)
  ↓
BoundaryConditionMenu (captures BC for selected nodes)
  ↓
BC State: { nodeID, bcType }
```

## Component Reference

### MeshVisualization.tsx

Main React component that renders the mesh using Three.js.

**Props:**
- `mesh?: Mesh` - Mesh data (nodes and edges arrays)
- No callback props (state managed internally)

**State:**
- `selectedNodes: number[]` - Array of selected node indices
- `selectedBCs: Map<number, 'fixed' | 'pointload'>` - BC assignments

**Key Features:**
- Orthographic camera for 2D rendering (1:1 pixel-to-unit ratio)
- Node selection via raycasting
- Auto-highlighting of connected edges
- Ctrl+click multi-select
- Right-click opens BoundaryConditionMenu
- Auto-fits mesh to viewport on load
- Responsive canvas that handles window resizing
- Proper WebGL error handling with graceful degradation

**Interactions:**
- **Left-click**: Select/deselect node
- **Ctrl+Left-click**: Add/remove node from multi-select
- **Right-click**: Open BC context menu (if node selected)
- **Mouse drag**: Pan mesh (OrbitControls)
- **Scroll wheel**: Zoom in/out (OrbitControls)
- **Right-drag**: Rotate camera (OrbitControls - 2D effect minimal)

**Color Scheme:**
- Nodes: Blue (#3B82F6)
- Edges: Gray (#9CA3AF)
- Selected nodes: Yellow (#FBBF24)
- Connected edges (when node selected): Red (#EF4444)

**Performance Notes:**
- Renders efficiently up to ~2,600 nodes (50×50 quad mesh)
- Selection operations O(n) for edge lookup
- No animation overhead (static mesh geometry)

### BoundaryConditionMenu.tsx

Context menu component for boundary condition selection.

**Props:**
- `selectedNodes: number[]` - Currently selected node(s)
- `onBCSelect: (nodeID: number[], bcType: string) => void` - Callback when BC selected
- `visible: boolean` - Show/hide menu
- `x: number, y: number` - Menu position (CSS pixels)
- `onClose: () => void` - Callback when menu closes

**Features:**
- Right-click context menu UI
- Options: "Fixed Support" and "Point Load"
- Applies BC to all currently selected nodes (supports multi-select)
- Auto-closes after BC selection
- Only visible when at least one node is selected

**Behavior:**
- Menu appears at mouse coordinates
- Click outside menu closes it
- Selected BC triggers onBCSelect callback with all selected node IDs
- Menu never shows if no nodes selected

### MagnifierZoom.tsx

Magnified viewport overlay for precise mesh examination.

**Props:**
- `visible: boolean` - Show/hide magnifier
- `mesh: Mesh` - Mesh data to display in magnified view
- `zoomLevel: number` - Current camera zoom level from main viewport
- `selectedNodes: number[]` - Selected nodes (synchronized highlighting)

**Features:**
- Secondary Three.js scene/camera/renderer
- Corner overlay (top-right, ~20% of viewport)
- 3x-5x magnification of main viewport center
- Synchronized with main viewport (panning in main view updates magnifier)
- Selected nodes highlighted in magnifier
- Auto-shows/hides based on zoom threshold
- Smooth fade transitions

**Auto-Trigger Logic:**
- Shows when `zoomLevel >= 3.0`
- Hides when `zoomLevel < 2.8` (hysteresis to prevent flickering)
- Monitored every frame via RAF callback

**Performance:**
- Dedicated renderer instance (dual-viewport rendering)
- Shares mesh geometry (no duplication)
- Minimal overhead (<5% additional CPU)

## Data Structures

### Mesh

```typescript
interface Mesh {
  nodes: Array<[number, number]>    // [[x1, y1], [x2, y2], ...]
  edges: Array<[number, number]>    // [[node_i, node_j], ...]
}
```

**Example (2×2 quad grid):**
```typescript
{
  nodes: [
    [0, 0],     // 0: bottom-left
    [50, 0],    // 1: bottom-center
    [100, 0],   // 2: bottom-right
    [0, 50],    // 3: middle-left
    [50, 50],   // 4: center
    [100, 50],  // 5: middle-right
    [0, 100],   // 6: top-left
    [50, 100],  // 7: top-center
    [100, 100]  // 8: top-right
  ],
  edges: [
    [0, 1], [1, 2],      // bottom horizontal
    [3, 4], [4, 5],      // middle horizontal
    [6, 7], [7, 8],      // top horizontal
    [0, 3], [3, 6],      // left vertical
    [1, 4], [4, 7],      // center vertical
    [2, 5], [5, 8]       // right vertical
  ]
}
```

### Boundary Condition

```typescript
interface BoundaryCondition {
  nodeID: number                      // Node being constrained
  bcType: 'fixed' | 'pointload'       // BC type
  value?: number                      // Load magnitude (optional)
}
```

## Utility Functions

### meshGenerator.ts

#### generateQuadMesh(p, m, d1, d2)

Generates a structured quad mesh grid.

**Parameters:**
- `p: number` - Elements in x-direction (1-10000)
- `m: number` - Elements in y-direction (1-10000)
- `d1: number` - Domain width (meters)
- `d2: number` - Domain height (meters)

**Returns:** `Mesh` object with (p+1)×(m+1) nodes and appropriate edges

**Algorithm:**
```
For each node (i,j) in [0..p] × [0..m]:
  x = i * (d1 / p)
  y = j * (d2 / m)
  nodes.push([x, y])

For each node pair that's adjacent:
  edges.push([i, j])
```

**Example:**
```typescript
const mesh = generateQuadMesh(2, 2, 100, 100)
// Returns mesh with 9 nodes (3×3 grid)
```

#### loadMeshFromJSON(filePath)

Loads a pre-defined mesh from JSON file (for testing).

**Parameters:**
- `filePath: string` - Path to JSON file containing Mesh object

**Returns:** `Mesh` object

**JSON Format:**
```json
{
  "nodes": [[0,0], [50,0], [100,0], ...],
  "edges": [[0,1], [1,2], ...]
}
```

## Usage Examples

### Basic Integration

```typescript
import { MeshVisualization } from './components/MeshVisualization'
import { generateQuadMesh } from './utils/meshGenerator'

function Results() {
  // Generate mesh from form inputs
  const mesh = generateQuadMesh(10, 10, 100, 100)
  
  return (
    <div className="w-full h-screen">
      <MeshVisualization mesh={mesh} />
    </div>
  )
}
```

### With Boundary Conditions

```typescript
function MyComponent() {
  const [bcs, setBCs] = useState<BoundaryCondition[]>([])
  
  const handleBCSelect = (nodeIDs: number[], bcType: string) => {
    // Apply BC to multiple nodes
    nodeIDs.forEach(nodeID => {
      setBCs(prev => [
        ...prev,
        { nodeID, bcType }
      ])
    })
  }
  
  return (
    <div>
      <MeshVisualization mesh={mesh} />
      <BoundaryConditionMenu
        selectedNodes={selectedNodes}
        onBCSelect={handleBCSelect}
        visible={menuVisible}
        x={menuX}
        y={menuY}
        onClose={() => setMenuVisible(false)}
      />
    </div>
  )
}
```

## Known Limitations

### Scope Constraints
- **2D Only**: No 3D mesh support (quad/triangle elements only in 2D plane)
- **Quad Meshes Only**: No triangular or mixed element types
- **Simple BC Types**: Only Fixed Support and Point Load (no distributed loads, contact, etc.)
- **No Undo/Redo**: State changes are immediate and permanent (within session)
- **No Mesh Import/Export**: Meshes cannot be saved/loaded to disk
- **No Animation Playback**: Cannot visualize result fields or time-stepping
- **Desktop-First**: No mobile/touch support (design requires mouse/keyboard)

### Technical Constraints
- **WebGL Required**: Rendering requires WebGL support (graceful error shown if unavailable)
- **2D Orthographic Only**: Camera is fixed orthographic, no perspective view
- **No Custom Shaders**: Uses Three.js built-in materials only
- **No Mesh Optimization**: Full geometry rendered (no LOD/culling for large meshes)

## Performance Characteristics

### Rendering Time

| Mesh Size | Nodes | Edges | Render Time | Interactive |
|-----------|-------|-------|------------|------------|
| Small | 9 | 12 | <50ms | Yes |
| Medium | 121 | 220 | <100ms | Yes |
| Large | 2,601 | 5,100 | <500ms | Yes |

### Memory Usage

| Mesh Size | Vertices | GPU Memory | CPU Memory |
|-----------|----------|-----------|-----------|
| Small (3×3) | 18 | ~1MB | ~0.5MB |
| Medium (11×11) | 242 | ~2MB | ~1MB |
| Large (51×51) | 5,202 | ~5MB | ~3MB |

### Interaction Latency

| Operation | Typical Latency | Notes |
|-----------|----------------|-------|
| Node selection | <1ms | Raycasting + highlight |
| Pan | <5ms | Smooth with no lag |
| Zoom | <5ms | 60 FPS target |
| Multi-select | <1ms | Array operations |
| Magnifier auto-trigger | <50ms | Fade transition |

## Browser Support

**Tested & Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Requirements:**
- WebGL support
- ES2020+ JavaScript
- CSS Grid (layout)

**Unsupported:**
- Internet Explorer 11 (WebGL not available)
- Older browsers without WebGL

## Development Notes

### Testing Strategy

- **Unit Tests**: meshGenerator logic (>80% coverage)
- **Component Tests**: Selection, edge lookup, BC state (mocked Three.js)
- **Integration Tests**: Component interaction via Playwright
- **No Rendering Tests**: Three.js rendering skipped (too complex to mock)

### Key Implementation Patterns

**Event Handling:**
```typescript
// Raycasting for node selection
const onCanvasClick = (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(nodesMesh)
  
  if (intersects.length > 0) {
    const index = intersects[0].index
    updateSelection(index, event.ctrlKey)
  }
}
```

**Edge Highlighting:**
```typescript
// Find edges connected to a node
const getConnectedEdges = (nodeID: number) => {
  return edges.filter(([a, b]) => a === nodeID || b === nodeID)
}
```

### Future Enhancements

(Out of current scope - Position 2 / Week 8)
- Stress field heatmap visualization
- Result animation playback
- Element selection and highlighting
- Boundary condition visualization (symbols on nodes)
- Export mesh to various formats
- Undo/redo for BC edits
- Touch/mobile support
- Custom color schemes
- 3D mesh support

---

**Last Updated:** 2026-04-29  
**Authors:** Position 3 Team (Frontend UI/UX)  
**Status:** Complete for Week 6-8 scope
