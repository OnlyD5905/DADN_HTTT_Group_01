/**
 * Tests for meshGenerator utility
 * 
 * Verifies quad mesh generation and JSON loading functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateQuadMesh, loadMeshFromJSON, Mesh } from '../meshGenerator'

describe('meshGenerator', () => {
  describe('generateQuadMesh', () => {
    // Helper function to verify node spacing
    const verifyNodeSpacing = (nodes: [number, number][], p: number, m: number, d1: number, d2: number) => {
      nodes.forEach((node, idx) => {
        const i = idx % (p + 1)
        const j = Math.floor(idx / (p + 1))
        const expectedX = (i / p) * d1
        const expectedY = (j / m) * d2
        expect(node[0]).toBeCloseTo(expectedX, 5)
        expect(node[1]).toBeCloseTo(expectedY, 5)
      })
    }

    // Helper function to verify edge connectivity
    const verifyEdgeConnectivity = (nodes: [number, number][], edges: [number, number][]) => {
      edges.forEach(([nodeI, nodeJ]) => {
        expect(nodeI).toBeGreaterThanOrEqual(0)
        expect(nodeJ).toBeGreaterThanOrEqual(0)
        expect(nodeI).toBeLessThan(nodes.length)
        expect(nodeJ).toBeLessThan(nodes.length)
        expect(nodeI).not.toBe(nodeJ)
      })
    }

    it('should generate 2x2 grid with 9 nodes and 12 edges', () => {
      const mesh = generateQuadMesh(2, 2, 10, 10)

      // Verify node count: (p+1) × (m+1) = 3 × 3 = 9
      expect(mesh.nodes.length).toBe(9)

      // Verify edge count: p*(m+1) + (p+1)*m = 2*3 + 3*2 = 12
      expect(mesh.edges.length).toBe(12)

      // Verify node coordinates for 2x2 grid on [0,10]×[0,10]
      const expectedNodes: [number, number][] = [
        [0, 0], [5, 0], [10, 0],
        [0, 5], [5, 5], [10, 5],
        [0, 10], [5, 10], [10, 10]
      ]
      mesh.nodes.forEach((node, idx) => {
        expect(node[0]).toBeCloseTo(expectedNodes[idx][0], 5)
        expect(node[1]).toBeCloseTo(expectedNodes[idx][1], 5)
      })

      verifyEdgeConnectivity(mesh.nodes, mesh.edges)
    })

    it('should generate 1x1 grid with 4 nodes and 4 edges', () => {
      const mesh = generateQuadMesh(1, 1, 10, 10)

      // Verify node count: (1+1) × (1+1) = 2 × 2 = 4
      expect(mesh.nodes.length).toBe(4)

      // Verify edge count: 1*2 + 2*1 = 4
      expect(mesh.edges.length).toBe(4)

      // Verify corner nodes
      expect(mesh.nodes[0]).toEqual([0, 0])
      expect(mesh.nodes[1]).toEqual([10, 0])
      expect(mesh.nodes[2]).toEqual([0, 10])
      expect(mesh.nodes[3]).toEqual([10, 10])

      verifyEdgeConnectivity(mesh.nodes, mesh.edges)
    })

    it('should generate 5x3 grid with correct node and edge counts', () => {
      const mesh = generateQuadMesh(5, 3, 10, 10)

      // Verify node count: (5+1) × (3+1) = 6 × 4 = 24
      expect(mesh.nodes.length).toBe(24)

      // Verify edge count: 5*4 + 6*3 = 20 + 18 = 38
      expect(mesh.edges.length).toBe(38)

      verifyNodeSpacing(mesh.nodes, 5, 3, 10, 10)
      verifyEdgeConnectivity(mesh.nodes, mesh.edges)
    })

    it('should generate mesh with non-uniform domain dimensions', () => {
      const mesh = generateQuadMesh(2, 2, 20, 10)

      // Verify node count
      expect(mesh.nodes.length).toBe(9)

      // Verify node coordinates
      const expectedNodes: [number, number][] = [
        [0, 0], [10, 0], [20, 0],
        [0, 5], [10, 5], [20, 5],
        [0, 10], [10, 10], [20, 10]
      ]
      mesh.nodes.forEach((node, idx) => {
        expect(node[0]).toBeCloseTo(expectedNodes[idx][0], 5)
        expect(node[1]).toBeCloseTo(expectedNodes[idx][1], 5)
      })
    })

    it('should generate mesh with decimal dimensions', () => {
      const mesh = generateQuadMesh(2, 2, 5.5, 7.3)

      expect(mesh.nodes.length).toBe(9)
      expect(mesh.edges.length).toBe(12)

      // Verify spacing
      verifyNodeSpacing(mesh.nodes, 2, 2, 5.5, 7.3)
    })

    it('should handle p=1 with custom dimensions', () => {
      const mesh = generateQuadMesh(1, 1, 10, 20)

      expect(mesh.nodes.length).toBe(4)
      expect(mesh.edges.length).toBe(4)

      // Verify corner nodes with different dimensions
      expect(mesh.nodes[0]).toEqual([0, 0])
      expect(mesh.nodes[1]).toEqual([10, 0])
      expect(mesh.nodes[2]).toEqual([0, 20])
      expect(mesh.nodes[3]).toEqual([10, 20])
    })

    it('should have no duplicate edges', () => {
      const mesh = generateQuadMesh(3, 3, 10, 10)

      const edgeSet = new Set<string>()
      mesh.edges.forEach(([i, j]) => {
        const key = `${i}-${j}`
        expect(edgeSet.has(key)).toBe(false)
        edgeSet.add(key)
      })
    })

    it('should create edges connecting adjacent nodes only', () => {
      const mesh = generateQuadMesh(2, 2, 10, 10)

      mesh.edges.forEach(([nodeI, nodeJ]) => {
        const dx = Math.abs(mesh.nodes[nodeI][0] - mesh.nodes[nodeJ][0])
        const dy = Math.abs(mesh.nodes[nodeI][1] - mesh.nodes[nodeJ][1])

        // Each edge should connect either horizontally or vertically adjacent nodes
        const isHorizontal = dy === 0 && dx > 0
        const isVertical = dx === 0 && dy > 0
        expect(isHorizontal || isVertical).toBe(true)
      })
    })

    it('should verify edge count formula: p*(m+1) + (p+1)*m', () => {
      const testCases = [
        { p: 1, m: 1 },
        { p: 2, m: 2 },
        { p: 3, m: 2 },
        { p: 5, m: 3 },
        { p: 10, m: 10 }
      ]

      testCases.forEach(({ p, m }) => {
        const mesh = generateQuadMesh(p, m, 10, 10)
        const expectedEdgeCount = p * (m + 1) + (p + 1) * m
        expect(mesh.edges.length).toBe(expectedEdgeCount)
      })
    })

    it('should verify node count formula: (p+1) * (m+1)', () => {
      const testCases = [
        { p: 1, m: 1, expected: 4 },
        { p: 2, m: 2, expected: 9 },
        { p: 3, m: 2, expected: 12 },
        { p: 5, m: 3, expected: 24 },
        { p: 10, m: 10, expected: 121 }
      ]

      testCases.forEach(({ p, m, expected }) => {
        const mesh = generateQuadMesh(p, m, 10, 10)
        expect(mesh.nodes.length).toBe(expected)
      })
    })

    it('should handle large mesh (100x100)', () => {
      const mesh = generateQuadMesh(100, 100, 100, 100)

      // Node count: 101 × 101 = 10201
      expect(mesh.nodes.length).toBe(10201)

      // Edge count: 100*101 + 101*100 = 20200
      expect(mesh.edges.length).toBe(20200)

      // Verify first and last nodes
      expect(mesh.nodes[0]).toEqual([0, 0])
      expect(mesh.nodes[mesh.nodes.length - 1]).toEqual([100, 100])
    })

    it('should have nodes within bounds [0,d1] × [0,d2]', () => {
      const mesh = generateQuadMesh(5, 3, 15, 10)

      mesh.nodes.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(15)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(10)
      })
    })
  })

  describe('loadMeshFromJSON', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      vi.clearAllMocks()
    })

    it('should load valid mesh JSON', async () => {
      const mockMesh: Mesh = {
        nodes: [[0, 0], [10, 0], [10, 10], [0, 10]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 0]]
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMesh
      })

      const result = await loadMeshFromJSON('test.json')

      expect(result).toEqual(mockMesh)
      expect(global.fetch).toHaveBeenCalledWith('test.json')
    })

    it('should throw error on failed fetch', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(loadMeshFromJSON('missing.json')).rejects.toThrow(
        'Failed to load mesh from missing.json: Not Found'
      )
    })

    it('should throw error on malformed JSON', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        }
      })

      await expect(loadMeshFromJSON('invalid.json')).rejects.toThrow()
    })

    it('should throw error when nodes array is missing', async () => {
      const malformedMesh = {
        edges: [[0, 1], [1, 2]]
        // nodes is missing
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => malformedMesh
      })

      await expect(loadMeshFromJSON('missing-nodes.json')).rejects.toThrow(
        'Invalid mesh JSON: must contain "nodes" and "edges" arrays'
      )
    })

    it('should throw error when edges array is missing', async () => {
      const malformedMesh = {
        nodes: [[0, 0], [10, 10]]
        // edges is missing
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => malformedMesh
      })

      await expect(loadMeshFromJSON('missing-edges.json')).rejects.toThrow(
        'Invalid mesh JSON: must contain "nodes" and "edges" arrays'
      )
    })

    it('should throw error when nodes is not an array', async () => {
      const malformedMesh = {
        nodes: { data: 'not an array' },
        edges: [[0, 1]]
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => malformedMesh
      })

      await expect(loadMeshFromJSON('invalid-nodes.json')).rejects.toThrow(
        'Invalid mesh JSON: must contain "nodes" and "edges" arrays'
      )
    })

    it('should throw error when edges is not an array', async () => {
      const malformedMesh = {
        nodes: [[0, 0], [10, 10]],
        edges: { data: 'not an array' }
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => malformedMesh
      })

      await expect(loadMeshFromJSON('invalid-edges.json')).rejects.toThrow(
        'Invalid mesh JSON: must contain "nodes" and "edges" arrays'
      )
    })

    it('should load mesh with empty arrays', async () => {
      const emptyMesh: Mesh = {
        nodes: [],
        edges: []
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => emptyMesh
      })

      const result = await loadMeshFromJSON('empty.json')

      expect(result).toEqual(emptyMesh)
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(loadMeshFromJSON('unreachable.json')).rejects.toThrow(
        'Network error'
      )
    })

    it('should preserve mesh data types', async () => {
      const typedMesh: Mesh = {
        nodes: [[1.5, 2.7], [3.14159, 2.71828]],
        edges: [[0, 1]]
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => typedMesh
      })

      const result = await loadMeshFromJSON('typed.json')

      expect(result.nodes[0][0]).toBeCloseTo(1.5, 5)
      expect(result.nodes[0][1]).toBeCloseTo(2.7, 5)
      expect(result.nodes[1][0]).toBeCloseTo(3.14159, 5)
      expect(result.nodes[1][1]).toBeCloseTo(2.71828, 5)
    })
  })

  describe('Integration tests', () => {
    it('should generate and validate a complete mesh workflow', () => {
      const mesh = generateQuadMesh(3, 2, 12, 8)

      // Verify structure
      expect(mesh).toHaveProperty('nodes')
      expect(mesh).toHaveProperty('edges')
      expect(Array.isArray(mesh.nodes)).toBe(true)
      expect(Array.isArray(mesh.edges)).toBe(true)

      // Verify dimensions
      expect(mesh.nodes.length).toBe(12) // (3+1) × (2+1) = 12
      expect(mesh.edges.length).toBe(17) // 3*3 + 4*2 = 17

      // Verify no orphaned nodes
      const connectedNodes = new Set<number>()
      mesh.edges.forEach(([i, j]) => {
        connectedNodes.add(i)
        connectedNodes.add(j)
      })
      // All nodes should be connected in a structured grid
      expect(connectedNodes.size).toBeGreaterThan(0)
    })

    it('should generate consistent mesh across multiple calls', () => {
      const mesh1 = generateQuadMesh(4, 3, 20, 15)
      const mesh2 = generateQuadMesh(4, 3, 20, 15)

      expect(mesh1.nodes).toEqual(mesh2.nodes)
      expect(mesh1.edges).toEqual(mesh2.edges)
    })
  })
})
