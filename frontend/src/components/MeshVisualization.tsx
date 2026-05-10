import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Mesh } from '../utils/meshGenerator';
import type { MeshAnnotation } from '../types/fea';
import { BoundaryConditionMenu } from './BoundaryConditionMenu';
import { MagnifierZoom } from './MagnifierZoom';

interface MeshVisualizationProps {
  /** Mesh data containing nodes and edges */
  mesh?: Mesh;
  /** Optional annotations to display (fixed supports, point loads, etc.) */
  annotations?: MeshAnnotation[];
  /** Enable magnifier zoom overlay (default: false) */
  enableMagnifier?: boolean;
}

/**
 * MeshVisualization Component
 * 
 * Main visualization component for displaying FEA mesh results using Three.js.
 * Renders nodes as points and edges as line segments in a 2D orthographic view.
 * Supports node selection (single and multi-select with Ctrl/Cmd) and context menu interactions.
 * 
 * @component
 * @example
 * ```tsx
 * import { generateQuadMesh } from '../utils/meshGenerator';
 * const mesh = generateQuadMesh(10, 10, 100, 100);
 * <MeshVisualization mesh={mesh} />
 * ```
 */
export function MeshVisualization({ mesh, annotations = [], enableMagnifier = false }: MeshVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const nodePointsRef = useRef<THREE.Points | null>(null);
  const edgeLineRef = useRef<THREE.LineSegments | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Annotation refs for fixed supports and point loads
  const annotationGroupRef = useRef<THREE.Group | null>(null);
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);

  // Magnifier zoom visibility (controlled by prop, not auto-triggered)
  const [magnifierVisible] = useState(enableMagnifier);

  // Track mouse position for distinguishing clicks from drags
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Controls guide visibility
  const [showControlsGuide, setShowControlsGuide] = useState(true);

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
    // Start with default frustum - will be adjusted when mesh loads
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer setup
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      
      // Check if WebGL context was created successfully
      if (!renderer || !renderer.domElement) {
        throw new Error('Failed to create WebGL renderer');
      }
      
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;

      // Append canvas to container
      containerRef.current.appendChild(renderer.domElement);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('WebGL initialization failed:', errorMessage);
      setWebglError("Your browser doesn't support 3D mesh visualization. Please try a different browser.");
      return;
    }

    // Create mesh group to hold nodes and edges (for easy updates)
    const meshGroup = new THREE.Group();
    meshGroupRef.current = meshGroup;
    scene.add(meshGroup);

    // Initialize OrbitControls
    const controls = new OrbitControls(camera, rendererRef.current.domElement);
    controlsRef.current = controls;

    // Initialize Raycaster and mouse vector
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    mouseRef.current = new THREE.Vector2();

    // Configure OrbitControls for 2D mesh interaction
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = false; // Lock to 2D - no rotation
    controls.autoRotateSpeed = 0;

    // Set reasonable interaction speeds
    controls.rotateSpeed = 0;
    controls.zoomSpeed = 1.0;

    // Limit zoom to prevent getting lost or too close
    controls.minZoom = 0.5;
    controls.maxZoom = 10;

    // Configure mouse buttons for 2D interaction:
    // - Left click: pan (since rotation is disabled)
    // - Right click: pan
    // - Middle click: pan
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN
    };

    // Initial render (blank canvas)
    rendererRef.current.render(scene, camera);

    // Handle mouse click for node selection
    const handleCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !mouseRef.current || !cameraRef.current || !nodePointsRef.current) return;

      // Ignore if this was a drag (mouse moved significantly)
      if (mouseDownPosRef.current) {
        const dx = event.clientX - mouseDownPosRef.current.x;
        const dy = event.clientY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) {
          // This was a drag, not a click
          mouseDownPosRef.current = null;
          return;
        }
      }
      mouseDownPosRef.current = null;

      // Get canvas bounding rect
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
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
          // Check if Ctrl key is held (Cmd on Mac)
          const isMultiSelect = event.ctrlKey || event.metaKey;
          
          if (isMultiSelect) {
            // Ctrl+click: add/remove from selection array
            setSelectedNodes((prevSelected) => {
              if (prevSelected.includes(clickedNodeIndex)) {
                // Remove from selection (toggle off)
                return prevSelected.filter(n => n !== clickedNodeIndex);
              } else {
                // Add to selection
                return [...prevSelected, clickedNodeIndex];
              }
            });
          } else {
            // Regular click: single select (replace entire selection)
            setSelectedNodes([clickedNodeIndex]);
          }
        }
      } else {
        // Clicking on empty space deselects all
        setSelectedNodes([]);
      }
    };

    rendererRef.current.domElement.addEventListener('click', handleCanvasClick);

    // Handle right-click for context menu (only if at least one node is selected)
    const handleCanvasContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      // Only show menu if at least one node is selected
      if (selectedNodes.length === 0) return;

      // Get canvas bounding rect
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;

      setContextMenuX(event.clientX);
      setContextMenuY(event.clientY);
      setContextMenuVisible(true);
    };

    rendererRef.current.domElement.addEventListener('contextmenu', handleCanvasContextMenu);

    // Handle mouse move for cursor feedback (hover over nodes)
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !mouseRef.current || !cameraRef.current || !nodePointsRef.current) return;

      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      // Normalize mouse coordinates
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Check for intersections with nodes
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(nodePointsRef.current);

      // Set cursor based on hover state
      if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
      } else if (event.buttons === 1) {
        // Left mouse button is held down (panning)
        canvas.style.cursor = 'grabbing';
      } else {
        canvas.style.cursor = 'grab';
      }
    };

    rendererRef.current.domElement.addEventListener('mousemove', handleMouseMove);

    // Handle mouse down/up for grab cursor during pan
    const handleMouseDown = (event: MouseEvent) => {
      // Store mouse down position to distinguish clicks from drags
      mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
      const canvas = rendererRef.current?.domElement;
      if (canvas) canvas.style.cursor = 'grabbing';
    };

    const handleMouseUp = () => {
      const canvas = rendererRef.current?.domElement;
      if (canvas) canvas.style.cursor = 'grab';
    };

    rendererRef.current.domElement.addEventListener('mousedown', handleMouseDown);
    rendererRef.current.domElement.addEventListener('mouseup', handleMouseUp);

    // Handle wheel events to prevent page scroll and enable zoom
    const handleWheel = (event: WheelEvent) => {
      // Prevent default scroll behavior
      event.preventDefault();
      event.stopPropagation();
      
      // OrbitControls will handle the zoom
      return false;
    };

    rendererRef.current.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Handle window resize - maintain aspect ratio and current zoom
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = containerRef.current.clientHeight || 600;

      // Get current view dimensions before resize
      const currentWidth = cameraRef.current.right - cameraRef.current.left;
      const currentHeight = cameraRef.current.top - cameraRef.current.bottom;
      const aspect = newWidth / newHeight;

      // Calculate new view dimensions maintaining aspect ratio
      let viewWidth, viewHeight;
      if (aspect > 1) {
        // Wider than tall - fit width
        viewWidth = currentWidth;
        viewHeight = viewWidth / aspect;
      } else {
        // Taller than wide - fit height
        viewHeight = currentHeight;
        viewWidth = viewHeight * aspect;
      }

      // Update camera frustum while maintaining center
      const centerX = (cameraRef.current.left + cameraRef.current.right) / 2;
      const centerY = (cameraRef.current.top + cameraRef.current.bottom) / 2;
      cameraRef.current.left = centerX - viewWidth / 2;
      cameraRef.current.right = centerX + viewWidth / 2;
      cameraRef.current.top = centerY + viewHeight / 2;
      cameraRef.current.bottom = centerY - viewHeight / 2;
      cameraRef.current.updateProjectionMatrix();

      // Update renderer
      rendererRef.current.setSize(newWidth, newHeight);
      rendererRef.current.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop for continuous rendering and zoom monitoring
    let animationFrameId: number;
    const render = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

      // Update OrbitControls (handles damping)
      controlsRef.current.update();

      // Magnifier visibility is controlled by prop, not auto-triggered

      // Render scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // Continue animation loop
      animationFrameId = requestAnimationFrame(render);
    };

    // Start animation loop
    animationFrameId = requestAnimationFrame(render);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.domElement.removeEventListener('click', handleCanvasClick);
      rendererRef.current?.domElement.removeEventListener('contextmenu', handleCanvasContextMenu);
      rendererRef.current?.domElement.removeEventListener('mousemove', handleMouseMove);
      rendererRef.current?.domElement.removeEventListener('mousedown', handleMouseDown);
      rendererRef.current?.domElement.removeEventListener('mouseup', handleMouseUp);
      rendererRef.current?.domElement.removeEventListener('wheel', handleWheel);

      // Cancel animation frame
      cancelAnimationFrame(animationFrameId);

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
    if (meshGroupRef.current && cameraRef.current && controlsRef.current && containerRef.current) {
      // Calculate bounding box
      const bbox = new THREE.Box3().setFromObject(meshGroupRef.current);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      // Get container aspect ratio
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      const aspect = containerWidth / containerHeight;

      // Add padding around the mesh (20% margin)
      const padding = 1.2;
      const meshWidth = size.x * padding;
      const meshHeight = size.y * padding;

      // Calculate view dimensions that fit the mesh while maintaining aspect ratio
      let viewWidth, viewHeight;
      if (aspect > meshWidth / meshHeight) {
        // Container is wider than mesh - fit to height
        viewHeight = meshHeight;
        viewWidth = viewHeight * aspect;
      } else {
        // Container is taller than mesh - fit to width
        viewWidth = meshWidth;
        viewHeight = viewWidth / aspect;
      }

      // For orthographic camera, set frustum to fit mesh with padding
      if (viewWidth > 0 && viewHeight > 0) {
        cameraRef.current.left = center.x - viewWidth / 2;
        cameraRef.current.right = center.x + viewWidth / 2;
        cameraRef.current.top = center.y + viewHeight / 2;
        cameraRef.current.bottom = center.y - viewHeight / 2;
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

    // Highlight all selected nodes in orange-red
    for (const nodeIdx of selectedNodes) {
      if (nodeIdx < mesh.nodes.length) {
        colorArray[nodeIdx * 3] = 1;      // R: 255/255 = 1 (red)
        colorArray[nodeIdx * 3 + 1] = 0.84;  // G: 215/255 ≈ 0.84 (make it orange/yellow-red)
        colorArray[nodeIdx * 3 + 2] = 0;    // B: 0
      }
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

      // Highlight connected edges for any selected node
      if (selectedNodes.length > 0) {
        /**
         * Find all edges connected to ANY selected node.
         * For each edge [i, j] in the mesh:
         * - If i or j is in selectedNodes, the edge is connected
         * Each edge has 2 vertices in the edge position/color arrays.
         * Edge e occupies vertices at indices (2*e) and (2*e + 1) in the arrays.
         */
        mesh.edges.forEach((edge, edgeIndex) => {
          const [nodeIdx1, nodeIdx2] = edge;
          // Check if this edge is connected to ANY selected node
          if (selectedNodes.includes(nodeIdx1) || selectedNodes.includes(nodeIdx2)) {
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
  }, [selectedNodes, mesh]);

  // Render annotations (fixed supports and point loads)
  useEffect(() => {
    if (!mesh || !sceneRef.current || !meshGroupRef.current) return;

    // Clear previous annotations
    if (annotationGroupRef.current) {
      meshGroupRef.current.remove(annotationGroupRef.current);
      annotationGroupRef.current.clear();
    }

    // Create new annotation group
    const annotationGroup = new THREE.Group();
    annotationGroupRef.current = annotationGroup;

    // Calculate mesh scale for sizing annotations proportionally
    const bbox = new THREE.Box3();
    mesh.nodes.forEach((node) => {
      bbox.expandByPoint(new THREE.Vector3(node[0], node[1], 0));
    });
    const meshSize = bbox.getSize(new THREE.Vector3());
    const avgMeshDim = Math.max(meshSize.x, meshSize.y);
    const baseSize = avgMeshDim * 0.03; // Scale annotations relative to mesh size

    annotations.forEach((annotation) => {
      const node = mesh.nodes[annotation.nodeIndex];
      if (!node) return;

      const [x, y] = node;

      if (annotation.type === 'fixed') {
        // Create triangle marker (ngàm) for fixed support
        const triangleShape = new THREE.Shape();
        const size = baseSize * 1.5;

        // Triangle pointing down from the node
        triangleShape.moveTo(x - size, y + size * 0.5);
        triangleShape.lineTo(x + size, y + size * 0.5);
        triangleShape.lineTo(x, y - size);
        triangleShape.closePath();

        const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
        const triangleMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000, // Red for fixed support
          side: THREE.DoubleSide,
        });
        const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
        triangle.position.z = 1; // Slightly above mesh
        annotationGroup.add(triangle);

        // Add small ground line beneath triangle
        const groundLineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x - size * 1.2, y - size, 1),
          new THREE.Vector3(x + size * 1.2, y - size, 1),
        ]);
        const groundLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const groundLine = new THREE.Line(groundLineGeometry, groundLineMaterial);
        annotationGroup.add(groundLine);
      } else if (annotation.type === 'load') {
        // Create force arrow (lực) for point load
        const magnitude = annotation.magnitude;
        const direction = annotation.direction;

        // Determine arrow direction vector
        let dx = 0, dy = 0;
        if (direction === 'x') {
          dx = magnitude > 0 ? 1 : -1;
        } else if (direction === 'y') {
          dy = magnitude > 0 ? 1 : -1;
        } else if (typeof direction === 'number') {
          // Direction is an angle in degrees
          const angleRad = (direction * Math.PI) / 180;
          dx = Math.cos(angleRad);
          dy = Math.sin(angleRad);
        }

        // Normalize and scale
        const length = baseSize * 3 * Math.min(Math.abs(magnitude) / 100 + 1, 3);
        dx *= length;
        dy *= length;

        // Arrow shaft
        const shaftGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, y, 1),
          new THREE.Vector3(x + dx, y + dy, 1),
        ]);
        const arrowMaterial = new THREE.LineBasicMaterial({ color: 0x0066ff, linewidth: 3 });
        const shaft = new THREE.Line(shaftGeometry, arrowMaterial);
        annotationGroup.add(shaft);

        // Arrow head (triangle)
        const headSize = baseSize * 0.8;
        const headAngle = Math.atan2(dy, dx);
        const headShape = new THREE.Shape();

        // Triangle pointing in arrow direction
        const tipX = x + dx;
        const tipY = y + dy;
        const backAngle1 = headAngle + Math.PI * 0.85;
        const backAngle2 = headAngle - Math.PI * 0.85;

        headShape.moveTo(tipX, tipY);
        headShape.lineTo(
          tipX + headSize * Math.cos(backAngle1),
          tipY + headSize * Math.sin(backAngle1)
        );
        headShape.lineTo(
          tipX + headSize * Math.cos(backAngle2),
          tipY + headSize * Math.sin(backAngle2)
        );
        headShape.closePath();

        const headGeometry = new THREE.ShapeGeometry(headShape);
        const headMaterial = new THREE.MeshBasicMaterial({
          color: 0x0066ff,
          side: THREE.DoubleSide,
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 1;
        annotationGroup.add(head);

        // Add magnitude label as small colored circle
        const labelGeometry = new THREE.CircleGeometry(baseSize * 0.4, 16);
        const labelMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(x + dx * 0.5, y + dy * 0.5, 2);
        annotationGroup.add(label);
      }
    });

    // Add annotation group to mesh group
    meshGroupRef.current.add(annotationGroup);

    // Re-render scene
    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [annotations, mesh]);

  if (webglError) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-yellow-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3D Visualization Not Available</h2>
          <p className="text-gray-600">{webglError}</p>
        </div>
      </div>
    );
  }

  const handleBCSelect = (_bc: { nodeID: number; bcType: 'FixedSupport' | 'PointLoad' }) => {
    // Store BC selection in component state (Position 4-5 will handle backend integration)
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full bg-white border border-gray-200 rounded-lg touch-none select-none"
        style={{ touchAction: 'none', userSelect: 'none' }}
        data-testid="mesh-visualization-container"
        tabIndex={0}
        onFocus={(e) => {
          // Ensure canvas can receive keyboard events
          const canvas = e.currentTarget.querySelector('canvas');
          if (canvas) {
            (canvas as HTMLCanvasElement).focus();
          }
        }}
        onMouseEnter={() => setShowControlsGuide(true)}
        onMouseLeave={() => setShowControlsGuide(false)}
        onWheel={() => setShowControlsGuide(false)}
      />

      {/* Controls Guide Overlay */}
      {showControlsGuide && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 select-none pointer-events-none transition-opacity duration-300">
          <div className="font-semibold mb-2 text-gray-900">Mesh Controls</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border text-[10px] font-mono">Drag</span>
              <span>Pan view</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border text-[10px] font-mono">Scroll</span>
              <span>Zoom in/out</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border text-[10px] font-mono">Click</span>
              <span>Select node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border text-[10px] font-mono">Ctrl+Click</span>
              <span>Multi-select</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border text-[10px] font-mono">Right-click</span>
              <span>Node options</span>
            </div>
          </div>
        </div>
      )}

      <BoundaryConditionMenu
        selectedNodes={selectedNodes}
        onBCSelect={handleBCSelect}
        visible={contextMenuVisible}
        x={contextMenuX}
        y={contextMenuY}
        onClose={() => setContextMenuVisible(false)}
      />
      <MagnifierZoom
        mesh={mesh}
        mainCamera={cameraRef.current!}
        visible={magnifierVisible}
        zoomFactor={4}
      />
    </div>
  );
}
