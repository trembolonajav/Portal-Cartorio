import type { CSSProperties } from 'react';
import AppShell from '@/components/layout/AppShell';

/*
 * Porta fiel do artboard 4a "Catálogo — paleta do editor de planta".
 * Móveis e equipamentos usando os recortes reais em /pack/ (assets do design).
 */

const MONO = "'IBM Plex Mono', monospace";
const tile: CSSProperties = { border: '1px solid #E4E0DB', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: '#FAF9F7' };
const tileEq: CSSProperties = { ...tile, border: '1px solid #D6E4E9', background: '#F7FBFC' };
const imgWrap: CSSProperties = { height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const img: CSSProperties = { maxWidth: '100%', maxHeight: 76, objectFit: 'contain', display: 'block' };
const nameStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#1B2430' };
const metaStyle: CSSProperties = { fontFamily: MONO, fontSize: 11, color: '#8A9099' };
const sectionLabel = (color: string): CSSProperties => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', color });

const MOBILIARIO = [
  { img: 'mesa-reta-recorte.png', name: 'Mesa reta', meta: '1,40 × 0,70 m' },
  { img: 'mesa-retangular.png', name: 'Mesa retangular', meta: '1,20 × 0,60 m' },
  { img: 'mesa-canto-chanfrada.png', name: 'Mesa de canto', meta: 'chanfrada' },
  { img: 'mesa-l.png', name: 'Mesa em L', meta: '1,60 × 1,40 m' },
  { img: 'cadeira-giratoria.png', name: 'Cadeira giratória', meta: 'com braços' },
  { img: 'armario-topo.svg', name: 'Armário (visão superior)', meta: 'para a planta' },
  { img: 'armario-2portas-pastas.png', name: 'Armário de pastas', meta: '2 portas + nicho' },
];
const EQUIPAMENTOS = [
  { img: 'monitor.png', name: 'Monitor', meta: 'categoria Monitor' },
  { img: 'gabinete-torre.png', name: 'Gabinete', meta: 'categoria CPU/Desktop' },
  { img: 'notebook.svg', name: 'Notebook', meta: 'categoria Notebook' },
  { img: 'teclado.png', name: 'Teclado', meta: 'periférico' },
  { img: 'mouse.png', name: 'Mouse', meta: 'periférico' },
  { img: 'impressora.svg', name: 'Impressora', meta: 'categoria Impressora' },
  { img: 'multifuncional.svg', name: 'Multifuncional', meta: 'impressora + scanner' },
  { img: 'scanner.svg', name: 'Scanner', meta: 'categoria Scanner' },
  { img: 'switch.svg', name: 'Switch', meta: 'rede · rack' },
];

const CatalogoPage = () => (
  <AppShell active="catalogo">
    <div className="flex h-full flex-col gap-4 overflow-auto px-4 py-6 md:px-7">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Catálogo de móveis e equipamentos</h2>
        <p className="text-sm text-muted-foreground">Paleta do editor de planta · recortes reais do inventário</p>
      </div>

      <div
        style={{
          maxWidth: 1180, background: '#FFFFFF', border: '1px solid #E4E0DB', borderRadius: 12,
          padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 26,
          boxShadow: '0 20px 50px -40px rgba(0,35,75,.5)',
        }}
      >
        {/* Mobiliário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={sectionLabel('#8A6E32')}>Mobiliário</span>
            <span style={{ flex: 1, height: 1, background: '#EDEAE5' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
            {MOBILIARIO.map((it) => (
              <div key={it.img} style={tile}>
                <div style={imgWrap}><img src={`/pack/${it.img}`} alt={it.name} style={img} /></div>
                <span style={nameStyle}>{it.name}</span>
                <span style={metaStyle}>{it.meta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Equipamentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={sectionLabel('#2E6E86')}>Equipamentos</span>
            <span style={{ flex: 1, height: 1, background: '#EDEAE5' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
            {EQUIPAMENTOS.map((it) => (
              <div key={it.img} style={tileEq}>
                <div style={imgWrap}><img src={`/pack/${it.img}`} alt={it.name} style={img} /></div>
                <span style={nameStyle}>{it.name}</span>
                <span style={metaStyle}>{it.meta}</span>
              </div>
            ))}
            {/* Novo tipo */}
            <div style={{ border: '1px dashed #C8C3BA', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', background: '#FAF9F7', minHeight: 132 }}>
              <span style={{ fontSize: 26, color: '#B9B3A9', lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 12, color: '#6B7480', textAlign: 'center' }}>Novo tipo de<br />patrimônio</span>
            </div>
            {/* 229 recortes */}
            <div style={{ border: '1px solid #E4E0DB', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', background: '#FFFFFF' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1B2430' }}>229 recortes</span>
              <span style={{ fontSize: 12, color: '#6B7480', lineHeight: 1.45 }}>extraídos das folhas enviadas, em <span style={{ fontFamily: MONO }}>/pack/</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
);

export default CatalogoPage;
