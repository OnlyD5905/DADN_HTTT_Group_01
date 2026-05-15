import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Mesh } from '../utils/meshGenerator';
import type { MeshAnnotation } from '../types/fea';
import { BoundaryConditionMenu } from './BoundaryConditionMenu';
import { MagnifierZoom } from './MagnifierZoom';

interface MeshVisualizationProps {
  /** Mesh data containing nodes and edges */
  mesh?: Mesh;
  /** Optional element connectivity for heatmap faces [[n1,n2,n3,n4],...] */
  elements?: number[][];
  /** Optional annotations to display (fixed supports, point loads, etc.) */
  annotations?: MeshAnnotation[];
  /** Enable magnifier zoom overlay (default: false) */
  enableMagnifier?: boolean;
  /** Scalar values per node for heatmap coloring */
  nodeValues?: number[];
  /** Whether to show heatmap overlay */
  showHeatmap?: boolean;
  /** Label for heatmap legend */
  heatmapLabel?: string;
}

/** Multi-stop colormap: blue -> cyan -> green -> yellow -> red */
function getHeatmapColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const stops: { t: number; c: [number, number, number] }[] = [
    { t: 0.0, c: [0.0, 0.0, 1.0] },   // blue
    { t: 0.25, c: [0.0, 1.0, 1.0] },  // cyan
    { t: 0.5, c: [0.0, 1.0, 0.0] },   // green
    { t: 0.75, c: [1.0, 1.0, 0.0] },  // yellow
    { t: 1.0, c: [1.0, 0.0, 0.0] },   // red
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      const local = (clamped - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return [
        stops[i].c[0] + local * (stops[i + 1].c[0] - stops[i].c[0]),
        stops[i].c[1] + local * (stops[i + 1].c[1] - stops[i].c[1]),
        stops[i].c[2] + local * (stops[i + 1].c[2] - stops[i].c[2]),
      ];
    }
  }
  return [1, 0, 0];
}

export function MeshVisualization({
  mesh,
  elements,
  annotations = [],
  enableMagnifier = false,
  nodeValues,
  showHeatmap = false,
  heatmapLabel,
}: MeshVisualizationProps) {
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
  const heatmapMeshRef = useRef<THREE.Mesh | null>(null);
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

  // Compute heatmap range
  const heatmapRange = useMemo(() => {
    if (!nodeValues || nodeValues.length === 0) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const v of nodeValues) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === max) { max = min + 1; }
    return { min, max };
  }, [nodeValues]);

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
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer setup
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      if (!renderer || !renderer.domElement) {
        throw new Error('Failed to create WebGL renderer');
      }
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;
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
    controls.rotateSpeed = 0;
    controls.zoomSpeed = 1.0;
    controls.minZoom = 0.5;
    controls.maxZoom = 10;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };

    // Initial render (blank canvas)
    rendererRef.current.render(scene, camera);

    // Handle mouse click for node selection
    const handleCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !mouseRef.current || !cameraRef.current || !nodePointsRef.current) return;

      if (mouseDownPosRef.current) {
        const dx = event.clientX - mouseDownPosRef.current.x;
        const dy = event.clientY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) {
          mouseDownPosRef.current = null;
          return;
        }
      }
      mouseDownPosRef.current = null;

      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouseRef.current.x = (clientX / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY / rect.height) * 2 - 1);

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(nodePointsRef.current);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const clickedNodeIndex = intersect.index;
        if (clickedNodeIndex !== undefined) {
          const isMultiSelect = event.ctrlKey || event.metaKey;
          if (isMultiSelect) {
            setSelectedNodes((prevSelected) => {
              if (prevSelected.includes(clickedNodeIndex)) {
                return prevSelected.filter((n) => n !== clickedNodeIndex);
              } else {
                return [...prevSelected, clickedNodeIndex];
              }
            });
          } else {
            setSelectedNodes([clickedNodeIndex]);
          }
        }
      } else {
        setSelectedNodes([]);
      }
    };

    rendererRef.current.domElement.addEventListener('click', handleCanvasClick);

    // Handle right-click for context menu (only if at least one node is selected)
    const handleCanvasContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (selectedNodes.length === 0) return;
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

      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(nodePointsRef.current);

      if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
      } else if (event.buttons === 1) {
        canvas.style.cursor = 'grabbing';
      } else {
        canvas.style.cursor = 'grab';
      }
    };

    rendererRef.current.domElement.addEventListener('mousemove', handleMouseMove);

    // Handle mouse down/up for grab cursor during pan
    const handleMouseDown = (event: MouseEvent) => {
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
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    rendererRef.current.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Handle window resize - maintain aspect ratio and current zoom
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = containerRef.current.clientHeight || 600;
      const currentWidth = cameraRef.current.right - cameraRef.current.left;
      const currentHeight = cameraRef.current.top - cameraRef.current.bottom;
      const aspect = newWidth / newHeight;

      let viewWidth: number;
      let viewHeight: number;
      if (aspect > currentWidth / currentHeight) {
        viewWidth = currentWidth;
        viewHeight = viewWidth / aspect;
      } else {
        viewHeight = currentHeight;
        viewWidth = viewHeight * aspect;
      }

      const centerX = (cameraRef.current.left + cameraRef.current.right) / 2;
      const centerY = (cameraRef.current.top + cameraRef.current.bottom) / 2;
      cameraRef.current.left = centerX - viewWidth / 2;
      cameraRef.current.right = centerX + viewWidth / 2;
      cameraRef.current.top = centerY + viewHeight / 2;
      cameraRef.current.bottom = centerY - viewHeight / 2;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(newWidth, newHeight);
      rendererRef.current.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop for continuous rendering and zoom monitoring
    let animationFrameId: number;
    const render = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameId = requestAnimationFrame(render);
    };

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
      cancelAnimationFrame(animationFrameId);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current?.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
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
    nodePointsRef.current = null;
    edgeLineRef.current = null;
    heatmapMeshRef.current = null;
    annotationGroupRef.current = null;

    const { nodes, edges } = mesh;

    // Render nodes as point cloud
    if (nodes.length > 0) {
      const nodePositions = new Float32Array(nodes.length * 3);
      const nodeColors = new Float32Array(nodes.length * 3);

      nodes.forEach((node, i) => {
        nodePositions[i * 3] = node[0];
        nodePositions[i * 3 + 1] = node[1];
        nodePositions[i * 3 + 2] = 0;

        nodeColors[i * 3] = 0;
        nodeColors[i * 3 + 1] = 0.4;
        nodeColors[i * 3 + 2] = 1;
      });

      const nodeGeometry = new THREE.BufferGeometry();
      nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
      nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

      const nodeMaterial = new THREE.PointsMaterial({
        vertexColors: true,
        size: 5,
        sizeAttenuation: false,
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

        edgePositions[i * 6] = node1[0];
        edgePositions[i * 6 + 1] = node1[1];
        edgePositions[i * 6 + 2] = 0;

        edgePositions[i * 6 + 3] = node2[0];
        edgePositions[i * 6 + 4] = node2[1];
        edgePositions[i * 6 + 5] = 0;

        edgeColors[i * 6] = 0.6;
        edgeColors[i * 6 + 1] = 0.6;
        edgeColors[i * 6 + 2] = 0.6;

        edgeColors[i * 6 + 3] = 0.6;
        edgeColors[i * 6 + 4] = 0.6;
        edgeColors[i * 6 + 5] = 0.6;
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
      const bbox = new THREE.Box3().setFromObject(meshGroupRef.current);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      const aspect = containerWidth / containerHeight;

      const padding = 1.2;
      const meshWidth = size.x * padding;
      const meshHeight = size.y * padding;

      let viewWidth: number;
      let viewHeight: number;
      if (aspect > meshWidth / meshHeight) {
        viewHeight = meshHeight;
        viewWidth = viewHeight * aspect;
      } else {
        viewWidth = meshWidth;
        viewHeight = viewWidth / aspect;
      }

      if (viewWidth > 0 && viewHeight > 0) {
        cameraRef.current.left = center.x - viewWidth / 2;
        cameraRef.current.right = center.x + viewWidth / 2;
        cameraRef.current.top = center.y + viewHeight / 2;
        cameraRef.current.bottom = center.y - viewHeight / 2;
        cameraRef.current.updateProjectionMatrix();
      }

      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [mesh]);

  // Update heatmap faces when elements/nodeValues/showHeatmap change
  useEffect(() => {
    if (!meshGroupRef.current || !mesh) return;

    // Remove previous heatmap
    if (heatmapMeshRef.current) {
      meshGroupRef.current.remove(heatmapMeshRef.current);
      heatmapMeshRef.current.geometry.dispose();
      (heatmapMeshRef.current.material as THREE.Material).dispose();
      heatmapMeshRef.current = null;
    }

    if (!showHeatmap || !elements || !nodeValues || elements.length === 0 || nodeValues.length === 0) {
      // Restore edge visibility
      if (edgeLineRef.current) edgeLineRef.current.visible = true;
      if (nodePointsRef.current) nodePointsRef.current.visible = true;
      return;
    }

    // Hide default edges and nodes for cleaner heatmap view
    if (edgeLineRef.current) edgeLineRef.current.visible = false;
    if (nodePointsRef.current) nodePointsRef.current.visible = false;

    const { min, max } = heatmapRange;
    const range = max - min;

    const positions: number[] = [];
    const colors: number[] = [];

    for (const el of elements) {
      if (el.length < 4) continue;
      const n1 = mesh.nodes[el[0]];
      const n2 = mesh.nodes[el[1]];
      const n3 = mesh.nodes[el[2]];
      const n4 = mesh.nodes[el[3]];
      if (!n1 || !n2 || !n3 || !n4) continue;

      const v1 = nodeValues[el[0]] ?? 0;
      const v2 = nodeValues[el[1]] ?? 0;
      const v3 = nodeValues[el[2]] ?? 0;
      const v4 = nodeValues[el[3]] ?? 0;

      const c1 = getHeatmapColor(range > 0 ? (v1 - min) / range : 0);
      const c2 = getHeatmapColor(range > 0 ? (v2 - min) / range : 0);
      const c3 = getHeatmapColor(range > 0 ? (v3 - min) / range : 0);
      const c4 = getHeatmapColor(range > 0 ? (v4 - min) / range : 0);

      // Triangle 1: n1, n2, n3
      positions.push(n1[0], n1[1], 0);
      colors.push(c1[0], c1[1], c1[2]);
      positions.push(n2[0], n2[1], 0);
      colors.push(c2[0], c2[1], c2[2]);
      positions.push(n3[0], n3[1], 0);
      colors.push(c3[0], c3[1], c3[2]);

      // Triangle 2: n1, n3, n4
      positions.push(n1[0], n1[1], 0);
      colors.push(c1[0], c1[1], c1[2]);
      positions.push(n3[0], n3[1], 0);
      colors.push(c3[0], c3[1], c3[2]);
      positions.push(n4[0], n4[1], 0);
      colors.push(c4[0], c4[1], c4[2]);
    }

    if (positions.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    const heatmapMesh = new THREE.Mesh(geometry, material);
    heatmapMeshRef.current = heatmapMesh;
    meshGroupRef.current.add(heatmapMesh);

    // Add wireframe overlay on top of heatmap for mesh structure
    if (edgeLineRef.current) {
      edgeLineRef.current.visible = true;
      // Make edges semi-transparent
      (edgeLineRef.current.material as THREE.LineBasicMaterial).opacity = 0.3;
      (edgeLineRef.current.material as THREE.LineBasicMaterial).transparent = true;
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [mesh, elements, nodeValues, showHeatmap, heatmapRange]);

  // Update node highlighting and connected edge highlighting when selection changes
  useEffect(() => {
    if (!nodePointsRef.current || !mesh) return;

    const geometry = nodePointsRef.current.geometry as THREE.BufferGeometry;
    const colors = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colors.array as Float32Array;

    // Reset all nodes to blue
    for (let i = 0; i < mesh.nodes.length; i++) {
      colorArray[i * 3] = 0;
      colorArray[i * 3 + 1] = 0.4;
      colorArray[i * 3 + 2] = 1;
    }

    // Highlight all selected nodes in orange-red
    for (const nodeIdx of selectedNodes) {
      if (nodeIdx < mesh.nodes.length) {
        colorArray[nodeIdx * 3] = 1;
        colorArray[nodeIdx * 3 + 1] = 0.84;
        colorArray[nodeIdx * 3 + 2] = 0;
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
        edgeColorArray[i] = 0.6;
        edgeColorArray[i + 1] = 0.6;
        edgeColorArray[i + 2] = 0.6;
      }

      // Highlight connected edges for any selected node
      if (selectedNodes.length > 0) {
        mesh.edges.forEach((edge, edgeIndex) => {
          const [nodeIdx1, nodeIdx2] = edge;
          if (selectedNodes.includes(nodeIdx1) || selectedNodes.includes(nodeIdx2)) {
            const vertexIndex1 = edgeIndex * 2;
            const vertexIndex2 = edgeIndex * 2 + 1;

            edgeColorArray[vertexIndex1 * 3] = 1;
            edgeColorArray[vertexIndex1 * 3 + 1] = 0;
            edgeColorArray[vertexIndex1 * 3 + 2] = 0;

            edgeColorArray[vertexIndex2 * 3] = 1;
            edgeColorArray[vertexIndex2 * 3 + 1] = 0;
            edgeColorArray[vertexIndex2 * 3 + 2] = 0;
          }
        });
      }

      edgeColors.needsUpdate = true;
    }

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
    const baseSize = avgMeshDim * 0.03;

    annotations.forEach((annotation) => {
      const node = mesh.nodes[annotation.nodeIndex];
      if (!node) return;

      const [x, y] = node;

      if (annotation.type === 'fixed') {
        // Create triangle marker (ngàm) for fixed support
        const triangleShape = new THREE.Shape();
        const size = baseSize * 1.5;

        triangleShape.moveTo(x - size, y + size * 0.5);
        triangleShape.lineTo(x + size, y + size * 0.5);
        triangleShape.lineTo(x, y - size);
        triangleShape.closePath();

        const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
        const triangleMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          side: THREE.DoubleSide,
        });
        const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
        triangle.position.z = 1;
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

        let dx = 0, dy = 0;
        if (direction === 'x') {
          dx = magnitude > 0 ? 1 : -1;
        } else if (direction === 'y') {
          dy = magnitude > 0 ? 1 : -1;
        } else if (typeof direction === 'number') {
          const angleRad = (direction * Math.PI) / 180;
          dx = Math.cos(angleRad);
          dy = Math.sin(angleRad);
        }

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

  const formatLegendValue = (v: number) => {
    if (Math.abs(v) < 1e-6) return '0';
    if (Math.abs(v) >= 1e3 || Math.abs(v) < 1e-3) return v.toExponential(2);
    return v.toFixed(v % 1 === 0 ? 0 : 3);
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
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 select-none pointer-events-none transition-opacity duration-300 z-10">
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

      {/* Heatmap Legend Overlay */}
      {showHeatmap && nodeValues && nodeValues.length > 0 && (
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 z-10">
          <div className="text-[10px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            {heatmapLabel ?? 'Scalar Field'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-12 text-right tabular-nums">
              {formatLegendValue(heatmapRange.min)}
            </span>
            <div
              className="w-4 h-32 rounded border border-gray-200"
              style={{
                background: 'linear-gradient(to top, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))',
              }}
            />
            <span className="text-[10px] text-gray-500 w-12 tabular-nums">
              {formatLegendValue(heatmapRange.max)}
            </span>
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
