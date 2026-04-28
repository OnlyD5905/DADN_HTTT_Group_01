/**
 * Mesh Generation Utilities
 * 
 * Generates quad mesh data structures from parameters for FEA analysis.
 * Produces regular rectangular grid meshes with nodes and edges.
 */

/**
 * Represents a mesh structure with nodes and edges
 */
export interface Mesh {
  /** Array of node coordinates [x, y] */
  nodes: [number, number][];
  /** Array of edge connectivity as [nodeI, nodeJ] pairs */
  edges: [number, number][];
}

/**
 * Generates a rectangular quad mesh grid
 * 
 * Creates a regular p × m grid of nodes spanning the domain [0, d1] × [0, d2].
 * Nodes are placed at positions (i*d1/p, j*d2/m) for i=0..p, j=0..m.
 * 
 * Edges connect nodes horizontally (within rows) and vertically (within columns).
 * This creates a quad mesh structure suitable for FEA analysis.
 * 
 * @param p - Number of divisions in x-direction (integer >= 1)
 * @param m - Number of divisions in y-direction (integer >= 1)
 * @param d1 - Domain width [0, d1] in x-direction
 * @param d2 - Domain height [0, d2] in y-direction
 * @returns Mesh object with nodes and edges arrays
 * 
 * @example
 * // Generate a 2x2 grid on domain [0,10]×[0,10]
 * const mesh = generateQuadMesh(2, 2, 10, 10);
 * // Returns: { nodes: [[0,0],[5,0],[10,0],[0,5],[5,5],[10,5],[0,10],[5,10],[10,10]], edges: [...] }
 * // Result: 9 nodes (3×3 grid), 12 edges (2*3 + 3*2)
 * 
 * @example
 * // Generate a 3x2 grid on domain [0,6]×[0,4]
 * const mesh = generateQuadMesh(3, 2, 6, 4);
 * // Nodes at x: [0, 2, 4, 6], y: [0, 2, 4]
 * // Result: 12 nodes (4×3), 17 edges
 * 
 * Edge count formula for quad mesh: p*(m+1) + (p+1)*m
 * - Horizontal edges: p edges per row × (m+1) rows = p*(m+1)
 * - Vertical edges: (p+1) edges per column × m columns = (p+1)*m
 * - Total nodes: (p+1) × (m+1)
 */
export function generateQuadMesh(
  p: number,
  m: number,
  d1: number,
  d2: number
): Mesh {
  // Generate node coordinates
  const nodes: [number, number][] = [];
  
  // Grid of (p+1) × (m+1) nodes
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= p; i++) {
      const x = (i / p) * d1;
      const y = (j / m) * d2;
      nodes.push([x, y]);
    }
  }

  // Generate edges: horizontal and vertical connections
  const edges: [number, number][] = [];
  
  // Horizontal edges (within rows)
  // Each row j has (p+1) nodes numbered from j*(p+1) to (j+1)*(p+1)-1
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i < p; i++) {
      const nodeIdx = j * (p + 1) + i;
      const nextNodeIdx = nodeIdx + 1;
      edges.push([nodeIdx, nextNodeIdx]);
    }
  }

  // Vertical edges (within columns)
  // Each column i connects nodes vertically through m+1 rows
  for (let i = 0; i <= p; i++) {
    for (let j = 0; j < m; j++) {
      const nodeIdx = j * (p + 1) + i;
      const nextNodeIdx = (j + 1) * (p + 1) + i;
      edges.push([nodeIdx, nextNodeIdx]);
    }
  }

  return { nodes, edges };
}

/**
 * Loads mesh data from a JSON file
 * 
 * Useful for testing with predefined mesh configurations.
 * The JSON file should contain an object with 'nodes' and 'edges' arrays.
 * 
 * @param filepath - Path to the JSON file
 * @returns Promise resolving to Mesh object
 * 
 * @example
 * const mesh = await loadMeshFromJSON('src/mocks/mesh.json');
 */
export async function loadMeshFromJSON(filepath: string): Promise<Mesh> {
  const response = await fetch(filepath);
  if (!response.ok) {
    throw new Error(`Failed to load mesh from ${filepath}: ${response.statusText}`);
  }
  const data = await response.json();
  
  // Validate structure
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid mesh JSON: must contain "nodes" and "edges" arrays');
  }
  
  return data as Mesh;
}
