import { useEffect, useRef } from 'react';

/**
 * BoundaryConditionMenu Component
 *
 * Context menu for applying boundary conditions to selected nodes.
 * Displays "Fixed Support" and "Point Load" options.
 *
 * Props:
 * - selectedNode: Index of the selected node (null if no selection)
 * - onBCSelect: Callback function when BC option is clicked
 *   Receives: { nodeID: number, bcType: 'FixedSupport' | 'PointLoad' }
 * - visible: Whether menu is currently visible
 * - x: X position of menu (from mouse event)
 * - y: Y position of menu (from mouse event)
 * - onClose: Callback to close the menu
 */
interface BoundaryConditionMenuProps {
  selectedNode: number | null;
  onBCSelect: (bc: { nodeID: number; bcType: 'FixedSupport' | 'PointLoad' }) => void;
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
}

export function BoundaryConditionMenu({
  selectedNode,
  onBCSelect,
  visible,
  x,
  y,
  onClose,
}: BoundaryConditionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  if (!visible || selectedNode === null) {
    return null;
  }

  const handleBCSelect = (bcType: 'FixedSupport' | 'PointLoad') => {
    onBCSelect({ nodeID: selectedNode, bcType });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-1 min-w-max"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      data-testid="boundary-condition-menu"
    >
      <button
        className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-blue-50 transition-colors"
        onClick={() => handleBCSelect('FixedSupport')}
        data-testid="bc-fixed-support"
      >
        Fixed Support
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-blue-50 transition-colors"
        onClick={() => handleBCSelect('PointLoad')}
        data-testid="bc-point-load"
      >
        Point Load
      </button>
    </div>
  );
}
