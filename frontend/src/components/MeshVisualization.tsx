import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import type { Mesh } from '../utils/meshGenerator';

/**
 * MeshVisualization Component
 *
 * Renders FEA mesh data using Three.js with orthographic projection.
 * Displays nodes as a blue point cloud and edges as gray line segments.
 *
 * Props:
 * - mesh: Optional mesh data { nodes: [number,number][], edges: [number,number][] }
 *   Renders blue points for nodes and gray lines for edges
 *
 * Features:
 * - Orthographic camera for consistent 2D rendering
 * - OrbitControls for interactive pan/zoom/rotate
 * - Efficient BufferGeometry for point cloud and line rendering
 * - Automatic canvas resizing
 * - Proper resource cleanup on unmount
 * - Updates geometry when mesh prop changes
 * - Auto-fit mesh to viewport on load
 */
interface MeshVisualizationProps {
  /** Mesh data containing nodes and edges */
  mesh?: Mesh;
}

export function MeshVisualization({ mesh }: MeshVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const nodePointsRef = useRef<THREE.Points | null>(null);
  const edgeLineRef = useRef<THREE.LineSegments | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Orthographic camera for 2D rendering
    // Using a 1:1 pixel-to-unit ratio for consistent sizing
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Append canvas to container
    containerRef.current.appendChild(renderer.domElement);

    // Create mesh group to hold nodes and edges (for easy updates)
    const meshGroup = new THREE.Group();
    meshGroupRef.current = meshGroup;
    scene.add(meshGroup);

    // Initialize OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Initialize Raycaster and mouse vector
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    mouseRef.current = new THREE.Vector2();

    // Configure OrbitControls for smooth interaction
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.autoRotateSpeed = 0;

    // Set reasonable interaction speeds
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;

    // Initial render (blank canvas)
    rendererRef.current.render(scene, camera);

    // Handle mouse click for node selection
    const handleCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !mouseRef.current || !cameraRef.current || !nodePointsRef.current) return;

      // Get canvas bounding rect
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();

      // Normalize mouse coordinates to [-1, 1] NDC (Normalized Device Coordinates)
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouseRef.current.x = (clientX / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY / rect.height) * 2 - 1);

      // Set raycaster from camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check for intersections with node points
      const intersects = raycasterRef.current.intersectObject(nodePointsRef.current);

      if (intersects.length > 0) {
        // Get the first intersection (closest to camera)
        const intersect = intersects[0];
        const clickedNodeIndex = intersect.index;

        if (clickedNodeIndex !== undefined) {
          // Toggle selection: if clicking same node, deselect; otherwise select new node
          setSelectedNode((prevSelected) => (prevSelected === clickedNodeIndex ? null : clickedNodeIndex));
        }
      } else {
        // Clicking on empty space deselects current selection
        setSelectedNode(null);
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;

      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = containerRef.current.clientHeight || 600;

      // Update camera
      if (cameraRef.current) {
        cameraRef.current.left = -newWidth / 2;
        cameraRef.current.right = newWidth / 2;
        cameraRef.current.top = newHeight / 2;
        cameraRef.current.bottom = -newHeight / 2;
        cameraRef.current.updateProjectionMatrix();
      }

      // Update renderer
      if (rendererRef.current) {
        rendererRef.current.setSize(newWidth, newHeight);
        rendererRef.current.render(scene, camera);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);

      // Dispose of OrbitControls
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      // Remove canvas from DOM
      if (rendererRef.current?.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }

      // Dispose of Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // Clear scene
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, []);

  // Update mesh rendering when mesh prop changes
  useEffect(() => {
    if (!mesh || !meshGroupRef.current || !sceneRef.current || !rendererRef.current) return;

    // Clear previous mesh objects
    meshGroupRef.current.clear();

    const { nodes, edges } = mesh;

    // Render nodes as point cloud
    if (nodes.length > 0) {
      const nodePositions = new Float32Array(nodes.length * 3);
      const nodeColors = new Float32Array(nodes.length * 3);
      
      nodes.forEach((node, i) => {
        nodePositions[i * 3] = node[0];
        nodePositions[i * 3 + 1] = node[1];
        nodePositions[i * 3 + 2] = 0;

        // Default color: blue (0x0066ff)
        nodeColors[i * 3] = 0;        // R: 0
        nodeColors[i * 3 + 1] = 0.4;  // G: 102/255 ≈ 0.4
        nodeColors[i * 3 + 2] = 1;    // B: 255/255 = 1
      });

      const nodeGeometry = new THREE.BufferGeometry();
      nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
      nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

      const nodeMaterial = new THREE.PointsMaterial({
        vertexColors: true,
        size: 5,
      });

      const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
      nodePointsRef.current = nodePoints;
      meshGroupRef.current.add(nodePoints);
    }

    // Render edges as line segments
    if (edges.length > 0) {
      const edgePositions = new Float32Array(edges.length * 2 * 3);
      const edgeColors = new Float32Array(edges.length * 2 * 3);
      
      edges.forEach((edge, i) => {
        const [nodeIdx1, nodeIdx2] = edge;
        const node1 = nodes[nodeIdx1];
        const node2 = nodes[nodeIdx2];

        // First vertex
        edgePositions[i * 6] = node1[0];
        edgePositions[i * 6 + 1] = node1[1];
        edgePositions[i * 6 + 2] = 0;

        // Second vertex
        edgePositions[i * 6 + 3] = node2[0];
        edgePositions[i * 6 + 4] = node2[1];
        edgePositions[i * 6 + 5] = 0;

        // Default edge color: gray (0x999999)
        // Each edge has 2 vertices, so 2 colors per edge
        edgeColors[i * 6] = 0.6;     // R: 153/255 ≈ 0.6 (gray)
        edgeColors[i * 6 + 1] = 0.6; // G: 153/255 ≈ 0.6
        edgeColors[i * 6 + 2] = 0.6; // B: 153/255 ≈ 0.6

        edgeColors[i * 6 + 3] = 0.6; // R: second vertex
        edgeColors[i * 6 + 4] = 0.6; // G: second vertex
        edgeColors[i * 6 + 5] = 0.6; // B: second vertex
      });

      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
      edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

      const edgeMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 1,
      });

      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLineRef.current = edgeLines;
      meshGroupRef.current.add(edgeLines);
    }

    // Auto-fit mesh to viewport (first load)
    if (meshGroupRef.current && cameraRef.current && controlsRef.current) {
      // Calculate bounding box
      const bbox = new THREE.Box3().setFromObject(meshGroupRef.current);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      // Update camera to fit mesh
      const maxDim = Math.max(size.x, size.y);

      // For orthographic camera, adjust zoom
      if (maxDim > 0) {
        cameraRef.current.left = -maxDim / 2;
        cameraRef.current.right = maxDim / 2;
        cameraRef.current.top = maxDim / 2;
        cameraRef.current.bottom = -maxDim / 2;
        cameraRef.current.updateProjectionMatrix();
      }

      // Set controls target to mesh center
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }

    // Re-render scene with mesh
    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [mesh]);

  // Update node highlighting and connected edge highlighting when selection changes
  useEffect(() => {
    if (!nodePointsRef.current || !mesh) return;

    const geometry = nodePointsRef.current.geometry as THREE.BufferGeometry;
    const colors = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colors.array as Float32Array;

    // Reset all nodes to blue
    for (let i = 0; i < mesh.nodes.length; i++) {
      colorArray[i * 3] = 0;        // R: 0
      colorArray[i * 3 + 1] = 0.4;  // G: 102/255 ≈ 0.4
      colorArray[i * 3 + 2] = 1;    // B: 255/255 = 1
    }

    // Highlight selected node in red/yellow
    if (selectedNode !== null && selectedNode < mesh.nodes.length) {
      colorArray[selectedNode * 3] = 1;      // R: 255/255 = 1 (red)
      colorArray[selectedNode * 3 + 1] = 0.84;  // G: 215/255 ≈ 0.84 (make it orange/yellow-red)
      colorArray[selectedNode * 3 + 2] = 0;    // B: 0
    }

    colors.needsUpdate = true;

    // Update edge highlighting
    if (edgeLineRef.current) {
      const edgeGeometry = edgeLineRef.current.geometry as THREE.BufferGeometry;
      const edgeColors = edgeGeometry.getAttribute('color') as THREE.BufferAttribute;
      const edgeColorArray = edgeColors.array as Float32Array;

      // Reset all edges to gray
      for (let i = 0; i < edgeColorArray.length; i += 3) {
        edgeColorArray[i] = 0.6;     // R: gray
        edgeColorArray[i + 1] = 0.6; // G: gray
        edgeColorArray[i + 2] = 0.6; // B: gray
      }

      // Highlight connected edges if a node is selected
      if (selectedNode !== null) {
        /**
         * Find all edges connected to the selected node.
         * For each edge [i, j] in the mesh:
         * - If i == selectedNode or j == selectedNode, the edge is connected
         * Each edge has 2 vertices in the edge position/color arrays.
         * Edge e occupies vertices at indices (2*e) and (2*e + 1) in the arrays.
         */
        mesh.edges.forEach((edge, edgeIndex) => {
          const [nodeIdx1, nodeIdx2] = edge;
          // Check if this edge is connected to the selected node
          if (nodeIdx1 === selectedNode || nodeIdx2 === selectedNode) {
            // This edge is connected; highlight it in red
            const vertexIndex1 = edgeIndex * 2; // First vertex of this edge
            const vertexIndex2 = edgeIndex * 2 + 1; // Second vertex of this edge

            // Set first vertex to red
            edgeColorArray[vertexIndex1 * 3] = 1;     // R: 1 (red)
            edgeColorArray[vertexIndex1 * 3 + 1] = 0; // G: 0
            edgeColorArray[vertexIndex1 * 3 + 2] = 0; // B: 0

            // Set second vertex to red
            edgeColorArray[vertexIndex2 * 3] = 1;     // R: 1 (red)
            edgeColorArray[vertexIndex2 * 3 + 1] = 0; // G: 0
            edgeColorArray[vertexIndex2 * 3 + 2] = 0; // B: 0
          }
        });
      }

      edgeColors.needsUpdate = true;
    }

    // Re-render scene
    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [selectedNode, mesh]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white border border-gray-200 rounded-lg"
      data-testid="mesh-visualization-container"
    />
  );
}
