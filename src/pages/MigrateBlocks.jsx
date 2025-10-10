import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateBlocksToFirestore, verifyBlocksInFirestore } from '../utils/migrateBlocks';
import useToast from '../hooks/useToast';

/**
 * 블록 카탈로그 마이그레이션 페이지
 * 
 * 용도: 초기 블록 데이터를 Firestore에 마이그레이션
 * 주의: Admin만 접근 가능하며, 한 번만 실행하면 됩니다.
 */
function MigrateBlocks() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleMigrate = async () => {
    if (!window.confirm('블록 데이터를 Firestore에 마이그레이션하시겠습니까?\n\n⚠️ 이미 데이터가 있으면 덮어씌워집니다.')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      console.log('🚀 Starting migration...');
      const result = await migrateBlocksToFirestore();
      
      setMigrationResult(result);
      
      if (result.success) {
        success(`✅ ${result.successCount}개의 블록이 성공적으로 마이그레이션되었습니다!`);
      } else {
        error(`마이그레이션 중 오류 발생: ${result.errorCount}개 실패`);
      }
    } catch (err) {
      console.error('Migration error:', err);
      error('마이그레이션 실행 중 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      console.log('🔍 Verifying blocks...');
      const result = await verifyBlocksInFirestore();
      
      setVerificationResult(result);
      
      if (result.success) {
        success(`✅ ${result.blocks.length}개의 블록이 확인되었습니다!`);
      } else {
        error('블록 확인 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      error('블록 확인 실행 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Logic': 'bi-braces',
      'Loops': 'bi-arrow-repeat',
      'Math': 'bi-123',
      'Text': 'bi-chat-dots',
      'Lists': 'bi-list-ul',
      'Variables': 'bi-box',
      'Functions': 'bi-gear'
    };
    return icons[category] || 'bi-puzzle';
  };

  // 카테고리별 블록 그룹화
  const groupBlocksByCategory = (blocks) => {
    const grouped = {};
    blocks.forEach(block => {
      if (!grouped[block.category]) {
        grouped[block.category] = [];
      }
      grouped[block.category].push(block);
    });
    return grouped;
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        {/* 헤더 */}
        <div className="mb-4">
          <button 
            className="btn btn-ghost mb-3" 
            onClick={() => navigate('/admin')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Admin
          </button>
          <h1 className="h3 mb-2">
            <i className="bi bi-database-gear me-2"></i>
            Block Catalog Migration
          </h1>
          <p className="text-muted">
            초기 블록 데이터를 Firestore에 마이그레이션합니다. (Admin 전용)
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="panel p-4 mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="d-flex flex-column h-100">
                <h5 className="mb-2">
                  <i className="bi bi-cloud-upload me-2"></i>
                  마이그레이션 실행
                </h5>
                <p className="text-muted small mb-3">
                  33개의 블록 데이터를 Firestore에 업로드합니다.
                </p>
                <button 
                  className="btn btn-brand mt-auto" 
                  onClick={handleMigrate}
                  disabled={isMigrating}
                >
                  {isMigrating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Migrating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-2"></i>
                      Start Migration
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex flex-column h-100">
                <h5 className="mb-2">
                  <i className="bi bi-search me-2"></i>
                  데이터 확인
                </h5>
                <p className="text-muted small mb-3">
                  Firestore에 저장된 블록 데이터를 확인합니다.
                </p>
                <button 
                  className="btn btn-outline-primary mt-auto" 
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Verify Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 마이그레이션 결과 */}
        {migrationResult && (
          <div className={`alert ${migrationResult.success ? 'alert-success' : 'alert-danger'} mb-4`}>
            <h5 className="alert-heading">
              <i className={`bi ${migrationResult.success ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
              Migration Result
            </h5>
            <hr />
            <div className="mb-0">
              <div>✅ Success: {migrationResult.successCount}</div>
              <div>❌ Failed: {migrationResult.errorCount}</div>
              {migrationResult.errors && migrationResult.errors.length > 0 && (
                <div className="mt-2">
                  <strong>Errors:</strong>
                  <ul className="mb-0 mt-1">
                    {migrationResult.errors.map((err, idx) => (
                      <li key={idx}>{err.block}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 검증 결과 */}
        {verificationResult && verificationResult.success && (
          <div className="panel p-4">
            <h5 className="mb-3">
              <i className="bi bi-check-circle-fill text-success me-2"></i>
              Verified Blocks ({verificationResult.blocks.length})
            </h5>
            
            {/* 통계 */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <div className="text-muted small mb-1">Total Blocks</div>
                  <div className="h4 mb-0">{verificationResult.blocks.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <div className="text-muted small mb-1">🔓 Default Blocks</div>
                  <div className="h4 mb-0">
                    {verificationResult.blocks.filter(b => b.isDefaultBlock).length}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <div className="text-muted small mb-1">🔒 QR Required</div>
                  <div className="h4 mb-0">
                    {verificationResult.blocks.filter(b => !b.isDefaultBlock).length}
                  </div>
                </div>
              </div>
            </div>

            {/* 카테고리별 블록 목록 */}
            <div className="vstack gap-3">
              {Object.entries(groupBlocksByCategory(verificationResult.blocks)).map(([category, blocks]) => (
                <div key={category} className="border rounded p-3">
                  <h6 className="mb-2">
                    <i className={`${getCategoryIcon(category)} me-2`}></i>
                    {category} ({blocks.length})
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {blocks.map(block => (
                      <span 
                        key={block.id} 
                        className={`badge ${block.isDefaultBlock ? 'bg-success' : 'bg-warning text-dark'}`}
                        title={block.id}
                      >
                        {block.isDefaultBlock ? '🔓' : '🔒'} {block.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        {!migrationResult && !verificationResult && (
          <div className="alert alert-info">
            <h5 className="alert-heading">
              <i className="bi bi-info-circle me-2"></i>
              사용 방법
            </h5>
            <hr />
            <ol className="mb-0">
              <li className="mb-2">
                <strong>"Start Migration"</strong> 버튼을 클릭하여 블록 데이터를 Firestore에 업로드합니다.
              </li>
              <li className="mb-2">
                마이그레이션 후 <strong>"Verify Data"</strong> 버튼으로 데이터를 확인합니다.
              </li>
              <li className="mb-2">
                마이그레이션은 한 번만 실행하면 되며, 필요시 Admin 페이지에서 개별 블록 설정을 수정할 수 있습니다.
              </li>
              <li>
                ⚠️ 이미 데이터가 있는 경우 덮어씌워지므로 주의하세요.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default MigrateBlocks;

