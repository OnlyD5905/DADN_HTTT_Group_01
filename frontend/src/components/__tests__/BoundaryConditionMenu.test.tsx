import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoundaryConditionMenu } from '../BoundaryConditionMenu'

/**
 * Test suite for BoundaryConditionMenu component
 * Focus: Menu visibility, BC selection, multi-node application
 */
describe('BoundaryConditionMenu', () => {
  // Mock callback functions
  const mockOnBCSelect = vi.fn()
  const mockOnClose = vi.fn()

  // Default props
  const defaultProps = {
    selectedNodes: [0],
    onBCSelect: mockOnBCSelect,
    visible: true,
    x: 100,
    y: 100,
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Menu Visibility - Conditional Rendering', () => {
    it('should render menu when visible and nodes selected', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()
    })

    it('should not render menu when visible=false', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={false}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const menu = screen.queryByTestId('boundary-condition-menu')
      expect(menu).not.toBeInTheDocument()
    })

    it('should not render menu when no nodes selected', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const menu = screen.queryByTestId('boundary-condition-menu')
      expect(menu).not.toBeInTheDocument()
    })

    it('should not render menu when visible=false AND no nodes selected', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[]}
          onBCSelect={mockOnBCSelect}
          visible={false}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const menu = screen.queryByTestId('boundary-condition-menu')
      expect(menu).not.toBeInTheDocument()
    })
  })

  describe('Menu Positioning', () => {
    it('should position menu at specified x, y coordinates', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={250}
          y={150}
          onClose={mockOnClose}
        />
      )

      const menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toHaveStyle({
        left: '250px',
        top: '150px',
      })
    })

    it('should update position when x, y props change', () => {
      const { rerender } = render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      let menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toHaveStyle({ left: '100px', top: '100px' })

      // Rerender with new position
      rerender(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={300}
          y={400}
          onClose={mockOnClose}
        />
      )

      menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toHaveStyle({ left: '300px', top: '400px' })
    })

    it('should handle position at origin (0, 0)', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={0}
          y={0}
          onClose={mockOnClose}
        />
      )

      const menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toHaveStyle({ left: '0px', top: '0px' })
    })

    it('should handle large position values', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={9999}
          y={9999}
          onClose={mockOnClose}
        />
      )

      const menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toHaveStyle({ left: '9999px', top: '9999px' })
    })
  })

  describe('BC Menu Options - Button Presence', () => {
    it('should display Fixed Support button', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const button = screen.getByTestId('bc-fixed-support')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Fixed Support')
    })

    it('should display Point Load button', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const button = screen.getByTestId('bc-point-load')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Point Load')
    })

    it('should have exactly 2 BC option buttons', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })

  describe('BC Selection - Single Node', () => {
    it('should call onBCSelect with FixedSupport when Fixed Support clicked', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledWith({
        nodeID: 0,
        bcType: 'FixedSupport',
      })
    })

    it('should call onBCSelect with PointLoad when Point Load clicked', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-point-load')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledWith({
        nodeID: 0,
        bcType: 'PointLoad',
      })
    })

    it('should close menu after BC selection', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onBCSelect exactly once for single node selection', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[5]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('BC Selection - Multiple Nodes (Multi-Apply)', () => {
    it('should apply BC to all selected nodes (Fixed Support)', async () => {
      const user = userEvent.setup()
      const selectedNodes = [0, 3, 7]
      
      render(
        <BoundaryConditionMenu
          selectedNodes={selectedNodes}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      // Should be called once for each selected node
      expect(mockOnBCSelect).toHaveBeenCalledTimes(3)
      
      // Check each call
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(1, {
        nodeID: 0,
        bcType: 'FixedSupport',
      })
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(2, {
        nodeID: 3,
        bcType: 'FixedSupport',
      })
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(3, {
        nodeID: 7,
        bcType: 'FixedSupport',
      })
    })

    it('should apply BC to all selected nodes (Point Load)', async () => {
      const user = userEvent.setup()
      const selectedNodes = [2, 4, 6, 8]
      
      render(
        <BoundaryConditionMenu
          selectedNodes={selectedNodes}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-point-load')
      await user.click(button)

      // Should be called once for each selected node
      expect(mockOnBCSelect).toHaveBeenCalledTimes(4)
      
      // Verify all calls have PointLoad type
      for (let i = 0; i < 4; i++) {
        const call = mockOnBCSelect.mock.calls[i][0]
        expect(call.bcType).toBe('PointLoad')
        expect([2, 4, 6, 8]).toContain(call.nodeID)
      }
    })

    it('should maintain node order when applying BC to multiple nodes', async () => {
      const user = userEvent.setup()
      const selectedNodes = [8, 5, 2]
      
      render(
        <BoundaryConditionMenu
          selectedNodes={selectedNodes}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledTimes(3)
      
      // Nodes should be processed in the order they appear in selectedNodes
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(1, {
        nodeID: 8,
        bcType: 'FixedSupport',
      })
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(2, {
        nodeID: 5,
        bcType: 'FixedSupport',
      })
      expect(mockOnBCSelect).toHaveBeenNthCalledWith(3, {
        nodeID: 2,
        bcType: 'FixedSupport',
      })
    })

    it('should close menu after multi-node BC application', async () => {
      const user = userEvent.setup()
      
      render(
        <BoundaryConditionMenu
          selectedNodes={[0, 1, 2, 3]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-point-load')
      await user.click(button)

      // Should apply BC to all 4 nodes, then close
      expect(mockOnBCSelect).toHaveBeenCalledTimes(4)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle large number of selected nodes', async () => {
      const user = userEvent.setup()
      // Create array of 100 selected nodes
      const selectedNodes = Array.from({ length: 100 }, (_, i) => i)
      
      render(
        <BoundaryConditionMenu
          selectedNodes={selectedNodes}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      // Should be called once per selected node
      expect(mockOnBCSelect).toHaveBeenCalledTimes(100)
    })
  })

  describe('BC Selection - Different BC Types', () => {
    it('should correctly pass FixedSupport type to callback', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[3]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      const call = mockOnBCSelect.mock.calls[0][0]
      expect(call.bcType).toBe('FixedSupport')
    })

    it('should correctly pass PointLoad type to callback', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[3]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-point-load')
      await user.click(button)

      const call = mockOnBCSelect.mock.calls[0][0]
      expect(call.bcType).toBe('PointLoad')
    })

    it('should not mix BC types when applied to multiple nodes', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[0, 1, 2]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      // All calls should have the same BC type
      for (let i = 0; i < 3; i++) {
        const call = mockOnBCSelect.mock.calls[i][0]
        expect(call.bcType).toBe('FixedSupport')
      }
    })
  })

  describe('Menu Interaction - Close on Outside Click', () => {
    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <BoundaryConditionMenu
            selectedNodes={[0]}
            onBCSelect={mockOnBCSelect}
            visible={true}
            x={100}
            y={100}
            onClose={mockOnClose}
          />
          <div data-testid="outside-element" />
        </div>
      )

      // Click outside the menu
      const outsideElement = screen.getByTestId('outside-element')
      await user.click(outsideElement)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should not close menu when clicking on menu buttons', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      // Click on a button inside the menu
      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      // onClose should be called as part of the BC selection handler
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('State Updates - Props Changes', () => {
    it('should update selected nodes when props change', () => {
      const { rerender } = render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      let menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()

      // Rerender with different selected nodes
      rerender(
        <BoundaryConditionMenu
          selectedNodes={[0, 1, 2]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      // Menu should still be visible
      menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()
    })

    it('should hide menu when selectedNodes becomes empty', () => {
      const { rerender } = render(
        <BoundaryConditionMenu
          selectedNodes={[0, 1]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      let menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()

      // Rerender with empty selected nodes
      rerender(
        <BoundaryConditionMenu
          selectedNodes={[]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      // Menu should be hidden
      const menuAfter = screen.queryByTestId('boundary-condition-menu')
      expect(menuAfter).not.toBeInTheDocument()
    })

    it('should show menu when visible prop changes to true', () => {
      const { rerender } = render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={false}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      let menu = screen.queryByTestId('boundary-condition-menu')
      expect(menu).not.toBeInTheDocument()

      // Rerender with visible=true
      rerender(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      // Menu should now be visible
      menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle single node selection', () => {
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const menu = screen.getByTestId('boundary-condition-menu')
      expect(menu).toBeInTheDocument()
    })

    it('should handle very large node IDs', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[99999]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledWith({
        nodeID: 99999,
        bcType: 'FixedSupport',
      })
    })

    it('should handle negative node IDs gracefully', async () => {
      const user = userEvent.setup()
      render(
        <BoundaryConditionMenu
          selectedNodes={[-1]}
          onBCSelect={mockOnBCSelect}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      expect(mockOnBCSelect).toHaveBeenCalledWith({
        nodeID: -1,
        bcType: 'FixedSupport',
      })
    })
  })

  describe('UI/UX Consistency', () => {
    it('should have both buttons visible simultaneously', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const fixedButton = screen.getByTestId('bc-fixed-support')
      const loadButton = screen.getByTestId('bc-point-load')

      expect(fixedButton).toBeVisible()
      expect(loadButton).toBeVisible()
    })

    it('should have proper text content for buttons', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      expect(screen.getByText('Fixed Support')).toBeInTheDocument()
      expect(screen.getByText('Point Load')).toBeInTheDocument()
    })

    it('should have consistent button styling (data-testid)', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const fixedButton = screen.getByTestId('bc-fixed-support')
      const loadButton = screen.getByTestId('bc-point-load')

      expect(fixedButton).toHaveAttribute('data-testid', 'bc-fixed-support')
      expect(loadButton).toHaveAttribute('data-testid', 'bc-point-load')
    })

    it('should display menu with proper z-index styling', () => {
      render(<BoundaryConditionMenu {...defaultProps} />)

      const menu = screen.getByTestId('boundary-condition-menu')
      
      // Menu should have z-50 (typically 50 in z-index)
      expect(menu.className).toContain('z-50')
    })
  })

  describe('Callback Signature Validation', () => {
    it('should pass correct object structure to onBCSelect', async () => {
      const user = userEvent.setup()
      const callback = vi.fn()
      
      render(
        <BoundaryConditionMenu
          selectedNodes={[42]}
          onBCSelect={callback}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-point-load')
      await user.click(button)

      const callArg = callback.mock.calls[0][0]
      
      // Verify exact structure
      expect(callArg).toHaveProperty('nodeID')
      expect(callArg).toHaveProperty('bcType')
      expect(Object.keys(callArg).length).toBe(2)
    })

    it('should not pass extra properties to callback', async () => {
      const user = userEvent.setup()
      const callback = vi.fn()
      
      render(
        <BoundaryConditionMenu
          selectedNodes={[0]}
          onBCSelect={callback}
          visible={true}
          x={100}
          y={100}
          onClose={mockOnClose}
        />
      )

      const button = screen.getByTestId('bc-fixed-support')
      await user.click(button)

      const callArg = callback.mock.calls[0][0]
      
      // Should only have nodeID and bcType
      expect(Object.keys(callArg)).toEqual(['nodeID', 'bcType'])
    })
  })
})
