import React from 'react';
import { Button } from '../ui/Button';

interface PurchaseSuccessModalProps {
  open: boolean;
  onContinueShopping: () => void;
  onGoToBackpack: () => void;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  open,
  onContinueShopping,
  onGoToBackpack,
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          width: 620,
          background: 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '4px solid var(--color-border-soft)',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'var(--color-status-available)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>!</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            购买成功
          </span>
        </div>

        <div style={{ padding: '32px 24px' }}>
          <p
            style={{
              fontSize: 20,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
              margin: 0,
              textAlign: 'center',
            }}
          >
            谢谢惠顾，商品已放入您的背包之中，
            <br />
            可返回家前往使用。
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            padding: '16px 24px',
            borderTop: '3px solid var(--color-border-soft)',
          }}
        >
          <Button variant="secondary" onClick={onContinueShopping} style={{ width: 190, height: 60 }}>
            继续购物
          </Button>
          <Button variant="primary" onClick={onGoToBackpack} style={{ width: 190, height: 60 }}>
            前往背包
          </Button>
        </div>
      </div>
    </div>
  );
};
