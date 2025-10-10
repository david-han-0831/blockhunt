import React, { useState } from 'react';
import SimpleModal from './SimpleModal';

function QRTestModal({ isOpen, onClose, onScan }) {
  const [qrData, setQrData] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (qrData.trim()) {
      onScan(qrData.trim());
      setQrData('');
      onClose();
    }
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose}>
      <div>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
          🔍 QR 스캔 테스트
        </h3>
        
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Admin에서 생성한 QR 데이터를 입력하세요
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            placeholder='{"type":"blockhunt_blocks","qrId":"qr_abc123","blocks":["procedures_defnoreturn"],"timestamp":"2025-10-10T10:00:00.000Z"}'
            style={{
              width: '100%',
              height: '120px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              marginBottom: '20px',
              resize: 'vertical'
            }}
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={!qrData.trim()}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: qrData.trim() ? 'pointer' : 'not-allowed',
                opacity: qrData.trim() ? 1 : 0.5
              }}
            >
              QR 처리
            </button>
            
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </form>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
          <strong>사용법:</strong><br/>
          1. Admin → Blocks & QR → Create QR<br/>
          2. 생성된 QR의 qrData 복사<br/>
          3. 위 텍스트 영역에 붙여넣기<br/>
          4. QR 처리 버튼 클릭
        </div>
      </div>
    </SimpleModal>
  );
}

export default QRTestModal;
