import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapSelector from './MapSelector';
import type { Space } from '@/features/inventory-map/types/inventoryMap.types';

const spaces: Space[] = [
  { id: 'u', name: 'Cartório', type: 'UNIT', order: 0 },
  { id: 'f1', name: 'Térreo', type: 'FLOOR', parentId: 'u', order: 1 },
  { id: 'f2', name: '1º Andar', type: 'FLOOR', parentId: 'u', order: 2 },
  { id: 'm1', name: 'Inventário', type: 'SECTOR', parentId: 'f1', order: 0 },
  { id: 'm2', name: 'Escritura', type: 'SECTOR', parentId: 'f2', order: 0 },
];
afterEach(cleanup);

describe('MapSelector', () => {
  it('keeps units static and floors expandable without selecting a map', () => {
    const change = vi.fn();
    render(<MapSelector spaces={spaces} value="all" onChange={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar mapa' }));
    expect(screen.queryByRole('button', { name: 'Cartório' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Térreo/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /1º Andar/ }));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Térreo/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Inventário' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escritura' }));
    expect(change).toHaveBeenCalledWith('m2');
  });

  it('searches maps across collapsed floors, ignoring accents and keeping context', () => {
    const change = vi.fn();
    render(<MapSelector spaces={spaces} value="all" onChange={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar mapa' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar departamento ou mapa' }), { target: { value: 'inventario' } });
    expect(screen.getByText('Cartório › Térreo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Inventário Cartório/ }));
    expect(change).toHaveBeenCalledWith('m1');
  });
});
