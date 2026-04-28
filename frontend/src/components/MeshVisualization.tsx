import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * MeshVisualization Component
 *
 * Scaffold component for visualizing FEA mesh data using Three.js
 * Provides a 2D orthographic canvas for rendering mesh elements
 *
 * Features:
 * - Orthographic camera for consistent 2D rendering
 * - Automatic canvas resizing
 * - Proper resource cleanup on unmount
 *
 * Future enhancements:
 * - Mesh rendering (Task 5)
 * - User interactions (pan, zoom) (Task 5)
 * - Result visualization (coloring by field values)
 */
export function MeshVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

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

    // Initial render (blank canvas)
    renderer.render(scene, camera);

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
      renderer.setSize(newWidth, newHeight);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);

      // Remove canvas from DOM
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      // Dispose of Three.js resources
      renderer.dispose();

      // Clear scene
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white border border-gray-200 rounded-lg"
      data-testid="mesh-visualization-container"
    />
  );
}
