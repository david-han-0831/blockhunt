import React from 'react';

/**
 * QR 스캔 결과를 보여주는 모달 컴포넌트
 * 
 * 사용법:
 * <QRResultModal 
 *   isOpen={showResultModal}
 *   result={scanResult}
 *   onClose={() => setShowResultModal(false)} 
 * />
 */
function QRResultModal({ isOpen, result, onClose }) {
  if (!isOpen || !result) return null;

  const { success, alreadyCollected, blocksObtained, error, blockNames } = result;

  return (
    <div className="modal-backdrop show" onClick={onClose}>
      <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className={`bi ${success ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} me-2`}></i>
                QR 스캔 결과
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {success ? (
                <div>
                  {alreadyCollected ? (
                    <div className="text-center py-3">
                      <div className="text-warning mb-3">
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
                      </div>
                      <h6 className="mb-2">이미 보유한 블록입니다!</h6>
                      <p className="text-muted mb-0">이 블록은 이미 수집되어 있습니다.</p>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <div className="text-success mb-3">
                        <i className="bi bi-trophy-fill" style={{ fontSize: '3rem' }}></i>
                      </div>
                      <h6 className="mb-2 text-success">블록 획득 성공!</h6>
                      <div className="bg-success-subtle rounded p-3 mb-3">
                        <div className="small text-success-emphasis mb-1">
                          <i className="bi bi-gift me-1"></i>
                          새로운 블록
                        </div>
                        <div className="fw-bold text-success">{blockNames}</div>
                      </div>
                      <p className="text-muted mb-0">
                        <i className="bi bi-check-circle me-1"></i>
                        프로필 페이지에서 확인할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="text-danger mb-3">
                    <i className="bi bi-x-circle-fill" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h6 className="mb-2 text-danger">QR 스캔 실패</h6>
                  <div className="bg-danger-subtle rounded p-3">
                    <div className="small text-danger-emphasis">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      오류 내용
                    </div>
                    <div className="text-danger mt-1">{error}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-brand" 
                onClick={onClose}
              >
                <i className="bi bi-check-circle me-1"></i>
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRResultModal;

