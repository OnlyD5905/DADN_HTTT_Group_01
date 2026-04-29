import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import type { Mesh } from '../utils/meshGenerator';

/**
 * MagnifierZoom Component
 * 
 * Renders a magnified view of the mesh in a corner overlay (top-right).
 * - Secondary Three.js scene with independent renderer and camera
 * - Synchronized with main viewport camera (same mesh data, 3x-5x zoom)
 * - Fixed position overlay (20% of viewport size)
 * - Handles window resize to maintain correct positioning
 * 
 * @component
 */

interface MagnifierZoomProps {
  /** Mesh data to render (same geometry as main view) */
  mesh?: Mesh;
  /** Main viewport camera for synchronization */
  mainCamera: THREE.OrthographicCamera;
  /** Main viewport OrbitControls for state synchronization */
  _mainControls?: OrbitControls;
  /** Whether magnifier overlay is visible */
  visible: boolean;
  /** Zoom multiplier (3-5x magnification, default 4x) */
  zoomFactor?: number;
}

/**
 * MagnifierZoom Component
 * 
 * Renders a magnified view of the mesh in a corner overlay (top-right).
 * - Secondary Three.js scene with independent renderer and camera
 * - Synchronized with main viewport camera (same mesh data, 3x-5x zoom)
 * - Fixed position overlay (20% of viewport size)
 * - Handles window resize to maintain correct positioning
 * 
 * @component
 * @param {MagnifierZoomProps} props - Component props
 * @param {Mesh} [props.mesh] - Mesh data to render (same geometry as main view)
 * @param {THREE.OrthographicCamera} props.mainCamera - Main viewport camera for synchronization
 * @param {boolean} props.visible - Whether magnifier overlay is visible
 * @param {number} [props.zoomFactor=4] - Zoom multiplier (3-5x magnification)
 * @example
 * ```tsx
 * <MagnifierZoom 
 *   mesh={meshData} 
 *   mainCamera={camera} 
 *   visible={isZoomedIn} 
 *   zoomFactor={4} 
 * />
 * ```
 */
export function MagnifierZoom({
  mesh,
  mainCamera,
  visible,
  zoomFactor = 4,
}: MagnifierZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Setup and animation loop
  useEffect(() => {
    if (!containerRef.current || !visible) return;

    // Get container dimensions (20% of viewport)
    const width = containerRef.current.clientWidth || 200;
    const height = containerRef.current.clientHeight || 150;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Orthographic camera for magnified view
    // Calculate zoom factor: magnifier shows area at 3x-5x zoom
    const mainZoom = mainCamera.zoom;
    const magnifierZoom = mainZoom * zoomFactor;

    // For orthographic camera, zoom affects left/right/top/bottom bounds
    const magnifiedBounds = 1 / magnifierZoom;
    const camera = new THREE.OrthographicCamera(
      -width / 2 * magnifiedBounds,
      width / 2 * magnifiedBounds,
      height / 2 * magnifiedBounds,
      -height / 2 * magnifiedBounds,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer setup
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      
      if (!renderer || !renderer.domElement) {
        throw new Error('Failed to create WebGL renderer for magnifier');
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;

      // Append canvas to container
      containerRef.current.appendChild(renderer.domElement);
    } catch (error) {
      console.error('MagnifierZoom WebGL initialization failed:', error);
      return;
    }

    // Create mesh group to hold nodes and edges
    const meshGroup = new THREE.Group();
    meshGroupRef.current = meshGroup;
    scene.add(meshGroup);

    // Render function: update magnifier camera position/zoom and render
    const render = () => {
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;

      // Synchronize camera position with main camera
      const mainCameraPos = mainCamera.position.clone();

      cameraRef.current.position.copy(mainCameraPos);

      // Update zoom: magnifier shows 3x-5x magnification
      const mainZoom = mainCamera.zoom;
      const magnifierZoom = mainZoom * zoomFactor;
      const magnifiedBounds = 1 / magnifierZoom;

      // Update camera bounds to match magnified view
      cameraRef.current.left = -containerRef.current!.clientWidth / 2 * magnifiedBounds;
      cameraRef.current.right = containerRef.current!.clientWidth / 2 * magnifiedBounds;
      cameraRef.current.top = containerRef.current!.clientHeight / 2 * magnifiedBounds;
      cameraRef.current.bottom = -containerRef.current!.clientHeight / 2 * magnifiedBounds;
      cameraRef.current.updateProjectionMatrix();

      // Render magnified scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // Continue animation loop
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    // Start animation loop
    animationFrameIdRef.current = requestAnimationFrame(render);

    // Cleanup function
    return () => {
      // Cancel animation frame
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
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
  }, [visible, zoomFactor]);

  // Update mesh rendering when mesh prop changes
  useEffect(() => {
    if (!mesh || !meshGroupRef.current || !sceneRef.current || !rendererRef.current) return;

    // Clear previous mesh objects
    meshGroupRef.current.clear();

    const { nodes, edges } = mesh;

    // Render nodes as point cloud (same as main view)
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
        size: 3, // Slightly smaller than main view
      });

      const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
      meshGroupRef.current.add(nodePoints);
    }

    // Render edges as line segments (same as main view)
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
      meshGroupRef.current.add(edgeLines);
    }
  }, [mesh]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const newWidth = containerRef.current.clientWidth || 200;
      const newHeight = containerRef.current.clientHeight || 150;

      // Update renderer
      rendererRef.current.setSize(newWidth, newHeight);

      // Update camera projection matrix
      const mainZoom = mainCamera.zoom;
      const magnifierZoom = mainZoom * zoomFactor;
      const magnifiedBounds = 1 / magnifierZoom;

      cameraRef.current.left = -newWidth / 2 * magnifiedBounds;
      cameraRef.current.right = newWidth / 2 * magnifiedBounds;
      cameraRef.current.top = newHeight / 2 * magnifiedBounds;
      cameraRef.current.bottom = -newHeight / 2 * magnifiedBounds;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomFactor, mainCamera]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 border-2 border-gray-300 rounded-lg bg-white shadow-lg overflow-hidden"
      style={{
        width: '200px',
        height: '150px',
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      data-testid="magnifier-zoom-container"
    />
  );
}
