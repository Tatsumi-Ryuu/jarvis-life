import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { ExamCompanyBackground } from './ExamCompanyBackground';

interface MapNode {
  id: string;
  name: string;
  x: number;
  y: number;
  active: boolean;
}

const mapNodes: MapNode[] = [
  { id: 'home', name: '家', x: 300, y: 300, active: false },
  { id: 'school', name: '学校', x: 650, y: 200, active: false },
  { id: 'park', name: '公园', x: 1000, y: 350, active: false },
  { id: 'company', name: '基石公司', x: 1350, y: 250, active: true },
  { id: 'government', name: '政府大楼', x: 500, y: 550, active: false },
  { id: 'mall', name: '购物中心', x: 850, y: 600, active: false },
  { id: 'office', name: '研究所', x: 1200, y: 550, active: false },
  { id: 'logistics', name: '物流站', x: 1500, y: 650, active: false },
];

export const ExamMapPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ExamCompanyBackground className="flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-8"
        style={{
          height: 80,
          backgroundColor: 'rgba(64, 78, 95, 0.62)',
          borderBottom: '1px solid var(--color-border-soft)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            城市地图
          </span>
          <span
            style={{
              fontSize: 18,
              color: 'var(--color-text-muted)',
              marginLeft: 16,
            }}
          >
            前往基石公司进行例行体检
          </span>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/exam/idle')}
          style={{
            width: 190,
            height: 60,
          }}
        >
          返回
        </Button>
      </div>

      {/* Map area */}
      <div
        className="flex-1 relative"
        style={{
          ...chromePanelStyle({ strong: true, padding: 0 }),
          margin: '24px 48px',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        {/* Map nodes */}
        {mapNodes.map((node) => (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: node.x,
              top: node.y,
            }}
          >
            <button
              onClick={() => {
                if (node.active) navigate('/exam/company-entrance');
              }}
              className="cursor-pointer flex flex-col items-center"
              style={{
                opacity: node.active ? 1 : 0.35,
                cursor: node.active ? 'pointer' : 'not-allowed',
                background: 'none',
                border: 'none',
                padding: 0,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => {
                if (node.active) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {/* Node box */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: node.active ? 180 : 140,
                  height: node.active ? 80 : 60,
                  backgroundColor: node.active
                    ? 'rgba(143, 224, 255, 0.28)'
                    : 'rgba(255,255,255,0.08)',
                  border: node.active
                    ? '1px solid var(--color-border-strong)'
                    : '1px solid var(--color-border-soft)',
                  boxShadow: node.active
                    ? '8px 8px 0 rgba(31, 111, 152, 0.30), 0 0 20px rgba(143, 224, 255, 0.4)'
                    : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: node.active ? 22 : 18,
                    fontWeight: 700,
                    color: node.active
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {node.active ? node.name : `🔒 ${node.name}`}
                </span>
              </div>
            </button>
          </div>
        ))}

        {/* Instruction hint */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 211, 94, 0.24)',
            border: '1px solid var(--color-warm-accent)',
            padding: '12px 32px',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            ⚠ 请点击「基石公司」前往体检
          </span>
        </div>
      </div>
    </ExamCompanyBackground>
  );
};
