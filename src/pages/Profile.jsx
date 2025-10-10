import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import QRTestModal from '../components/QRTestModal';
import QRResultModal from '../components/QRResultModal';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, processQRScan, getBlocks, removeCollectedBlock } from '../firebase/firestore';
import useToast from '../hooks/useToast';
import useAdminAuth from '../hooks/useAdminAuth';

const BLOCK_CATALOG = [
  { id:'controls_if', name:'if / else', cat:'Logic', icon:'bi-braces' },
  { id:'logic_compare', name:'compare', cat:'Logic', icon:'bi-braces' },
  { id:'math_number', name:'number', cat:'Math', icon:'bi-123' },
  { id:'math_arithmetic', name:'+ - × ÷', cat:'Math', icon:'bi-123' },
  { id:'text', name:'text', cat:'Text', icon:'bi-chat-dots' },
  { id:'text_print', name:'print', cat:'Text', icon:'bi-chat-dots' },
  { id:'lists_create_with', name:'make list', cat:'Lists', icon:'bi-list-ul' }
];

function Profile() {
  const [user, setUser] = useState({ name: 'Student Name', email: 'student@example.com' });
  const [collected, setCollected] = useState(new Set());
  const [filterMode, setFilterMode] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const { isAdmin, isLoading } = useAdminAuth();

  // 디버깅: 관리자 상태 확인
  console.log('🔍 Profile - Admin status:', { isAdmin, isLoading, currentUser: currentUser?.uid });

  useEffect(() => {
    loadUserData();
    loadBlocks();
  }, [currentUser]);

  // 사용자 데이터 및 블록 정보 로드
  const loadUserData = async () => {
    if (!currentUser) {
      console.log('⚠️ No current user, skipping loadUserData');
      return;
    }

    try {
      console.log('🔄 Loading user data for:', currentUser.uid);
      // Firebase에서 사용자 프로필 가져오기
      const result = await getUserProfile(currentUser.uid);
      console.log('📊 getUserProfile result:', result);
      
      if (result.success) {
        const userData = result.data;
        console.log('👤 User data from Firebase:', userData);
        
        setUser({
          name: userData.displayName || 'Student',
          email: userData.email || 'student@example.com'
        });
        
        // 수집한 블록 설정
        const collectedBlocks = userData.collectedBlocks || [];
        console.log('📦 Collected blocks from Firebase:', collectedBlocks);
        setCollected(new Set(collectedBlocks));
      } else {
        console.log('⚠️ Firebase profile not found, loading from localStorage');
        // Firebase 프로필이 없으면 localStorage에서 로드
        const savedUser = JSON.parse(localStorage.getItem('BlockHunt_user') || '{}');
        if (savedUser.name) {
          setUser(savedUser);
        }
        const savedBlocks = JSON.parse(localStorage.getItem('BlockHunt_collected_set') || '[]');
        console.log('💾 Collected blocks from localStorage:', savedBlocks);
        setCollected(new Set(savedBlocks));
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      // 에러 시 localStorage에서 로드
      const savedUser = JSON.parse(localStorage.getItem('BlockHunt_user') || '{}');
      if (savedUser.name) {
        setUser(savedUser);
      }
      const savedBlocks = JSON.parse(localStorage.getItem('BlockHunt_collected_set') || '[]');
      console.log('💾 Error fallback - blocks from localStorage:', savedBlocks);
      setCollected(new Set(savedBlocks));
    }
  };

  // 블록 카탈로그 로드
  const loadBlocks = async () => {
    try {
      console.log('🔄 Loading blocks catalog...');
      const result = await getBlocks();
      console.log('📊 getBlocks result:', result);
      
      if (result.success) {
        console.log('📦 Blocks loaded from Firebase:', result.data.length, 'blocks');
        setBlocks(result.data);
      } else {
        console.log('⚠️ Firebase blocks failed, using default catalog');
        // Firebase에서 로드 실패 시 기본 카탈로그 사용
        setBlocks(BLOCK_CATALOG);
      }
    } catch (err) {
      console.error('Failed to load blocks:', err);
      console.log('💾 Error fallback - using default catalog');
      setBlocks(BLOCK_CATALOG);
    }
  };

  const getCatClass = (cat) => {
    const catMap = {
      'Logic': 'cat-logic',
      'Loops': 'cat-loops',
      'Math': 'cat-math',
      'Text': 'cat-text',
      'Lists': 'cat-lists',
      'Variables': 'cat-vars',
      'Functions': 'cat-func'
    };
    return catMap[cat] || '';
  };

  // QR 스캔 처리
  const handleQRScan = async (qrData) => {
    if (!currentUser) {
      error('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Processing QR scan:', qrData);
      console.log('👤 Current user:', currentUser.uid);
      console.log('📦 Current collected blocks:', Array.from(collected));
      
      const result = await processQRScan(currentUser.uid, qrData);
      console.log('✅ QR scan result:', result);
      
      if (result.success) {
        if (result.alreadyCollected) {
          // 이미 보유한 블록인 경우
          const blockNames = result.blocksObtained.map(blockId => {
            const block = blocks.find(b => b.id === blockId);
            return block ? block.name : blockId;
          }).join(', ');
          
          // 스캐너 모달 닫기
          setShowScanner(false);
          
          setScanResult({
            success: true,
            alreadyCollected: true,
            blocksObtained: result.blocksObtained,
            blockNames: blockNames
          });
          setShowResultModal(true);
        } else {
          // 새로운 블록을 획득한 경우
          const blockNames = result.blocksObtained.map(blockId => {
            const block = blocks.find(b => b.id === blockId);
            return block ? block.name : blockId;
          }).join(', ');
          
          console.log('🎉 New blocks obtained:', result.blocksObtained);
          console.log('📝 Block names:', blockNames);
          
          // 즉시 로컬 상태 업데이트 (빠른 UI 반응)
          setCollected(prev => {
            const newCollected = new Set(prev);
            result.blocksObtained.forEach(blockId => newCollected.add(blockId));
            console.log('🔄 Updated collected blocks:', Array.from(newCollected));
            return newCollected;
          });
          
          // Firebase에서 최신 데이터 다시 로드
          console.log('🔄 Reloading user data from Firebase...');
          await loadUserData();
          console.log('✅ User data reloaded');
          
          // 스캐너 모달 닫기
          setShowScanner(false);
          
          // 성공 모달 표시
          setScanResult({
            success: true,
            alreadyCollected: false,
            blocksObtained: result.blocksObtained,
            blockNames: blockNames
          });
          setShowResultModal(true);
        }
      } else {
        console.error('❌ QR scan failed:', result.error);
        
        // 스캐너 모달 닫기
        setShowScanner(false);
        
        // 실패 모달 표시
        setScanResult({
          success: false,
          error: result.error
        });
        setShowResultModal(true);
      }
    } catch (err) {
      console.error('QR scan error:', err);
      error('QR 스캔 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (blockId) => {
    if (!currentUser) {
      error('로그인이 필요합니다.');
      return;
    }

    try {
      const hasBlock = collected.has(blockId);
      
      if (hasBlock) {
        // 블록 제거
        console.log('🗑️ Removing block:', blockId);
        const result = await removeCollectedBlock(currentUser.uid, blockId);
        
        if (result.success) {
          // 로컬 상태 업데이트
          const newCollected = new Set(collected);
          newCollected.delete(blockId);
          setCollected(newCollected);
          
          // localStorage에도 저장
          localStorage.setItem('BlockHunt_collected_set', JSON.stringify([...newCollected]));
          
          success('블록이 제거되었습니다.');
          console.log('✅ Block removed successfully:', blockId);
        } else {
          error(result.error || '블록 제거에 실패했습니다.');
          console.error('❌ Failed to remove block:', result.error);
        }
      } else {
        // 블록 추가 (기존 로직 유지)
        const newCollected = new Set(collected);
        newCollected.add(blockId);
        setCollected(newCollected);
        
        // localStorage에도 저장 (오프라인 지원)
        localStorage.setItem('BlockHunt_collected_set', JSON.stringify([...newCollected]));
        
        success('블록이 추가되었습니다.');
        console.log('✅ Block added locally:', blockId);
      }
    } catch (err) {
      console.error('❌ Error toggling block:', err);
      error('블록 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const filteredBlocks = blocks.filter(block => {
    const hasBlock = collected.has(block.id);
    const matchesFilter = filterMode === 'all' || 
                         (filterMode === 'collected' && hasBlock) ||
                         (filterMode === 'missing' && !hasBlock);
    const matchesSearch = !searchQuery || 
                         block.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalBlocks = blocks.length;
  const collectedCount = collected.size;
  const missingCount = totalBlocks - collectedCount;
  const collectedPercent = totalBlocks > 0 ? Math.round((collectedCount / totalBlocks) * 100) : 0;

  return (
    <>
      <Navbar />
      <AppBar title="BlockHunt" />
      
      <main className="container py-4">
        <div className="panel p-3 p-md-4 mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="avatar">
              {user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h1 className="h5 mb-0">{user.name}</h1>
              </div>
              <div className="muted small">{user.email}</div>
            </div>
            <div className="d-none d-md-flex gap-2">
              <Link className="btn btn-ghost" to="/challenges">
                <i className="bi bi-list-task me-1"></i>Challenges
              </Link>
              <Link className="btn btn-brand" to="/studio">
                <i className="bi bi-code-slash me-1"></i>Open Studio
              </Link>
            </div>
          </div>
        </div>

        <div className="row g-3 equal-row mb-3">
          <div className="col-md-4">
            <div className="panel p-3 h-100">
              <div className="muted small">Total Blocks</div>
              <div className="display-6 fw-bold">{totalBlocks}</div>
              <div className="small">All available in curriculum</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="panel p-3 h-100">
              <div className="muted small">Collected (AR)</div>
              <div className="display-6 fw-bold">{collectedCount}</div>
              <div className="progress mt-2">
                <div className="progress-bar" style={{ width: `${collectedPercent}%` }}></div>
              </div>
              <div className="small mt-1">{collectedPercent}% complete</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="panel p-3 h-100">
              <div className="muted small">Missing</div>
              <div className="display-6 fw-bold">{missingCount}</div>
              <div className="small">Keep scanning QR codes to unlock more!</div>
            </div>
          </div>
        </div>

        <div className="panel p-3 mb-3">
          <div className="toolbar d-flex flex-wrap align-items-center gap-2">
            <div className="btn-group" role="group">
              <button 
                className={`btn btn-ghost ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                <i className="bi bi-grid-3x3-gap me-1"></i>All
              </button>
              <button 
                className={`btn btn-ghost ${filterMode === 'collected' ? 'active' : ''}`}
                onClick={() => setFilterMode('collected')}
              >
                <i className="bi bi-check2-circle me-1"></i>Collected
              </button>
              <button 
                className={`btn btn-ghost ${filterMode === 'missing' ? 'active' : ''}`}
                onClick={() => setFilterMode('missing')}
              >
                <i className="bi bi-dash-circle me-1"></i>Missing
              </button>
            </div>
            <div className="ms-auto" style={{ minWidth: '220px' }}>
              <input 
                type="search" 
                className="form-control" 
                placeholder="Search blocks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          {filteredBlocks.map(block => {
            const hasBlock = collected.has(block.id);
            const isDefaultBlock = block.isDefaultBlock;
            
            return (
              <div key={block.id} className="col-12 col-md-6 col-lg-4">
                <div className={`block-card ${hasBlock ? 'collected' : ''} ${getCatClass(block.category || block.cat)}`}>
                  <div className="left">
                    <div className="block-icon-container">
                      <i className={`bi ${block.icon}`}></i>
                      {hasBlock && (
                        <div className="collected-indicator">
                          <i className="bi bi-check-circle-fill"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="name">{block.name}</div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="cat-badge">{block.cat}</span>
                        {hasBlock ? (
                          <span className="badge rounded-pill bg-success-subtle text-success-emphasis">
                            <i className="bi bi-check2"></i> collected
                          </span>
                        ) : (
                          <span className={`badge rounded-pill ${
                            isDefaultBlock 
                              ? 'bg-primary-subtle text-primary-emphasis' 
                              : 'bg-warning-subtle text-warning-emphasis'
                          }`}>
                            <i className={`bi ${isDefaultBlock ? 'bi-unlock' : 'bi-lock'}`}></i>
                            {isDefaultBlock ? 'default' : 'QR required'}
                          </span>
                        )}
                      </div>
                      {hasBlock && (
                        <div className="small text-success mt-1">
                          <i className="bi bi-trophy me-1"></i>
                          Ready to use in Studio!
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <button 
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleToggleBlock(block.id)}
                    >
                      {hasBlock ? (
                        <><i className="bi bi-x-circle me-1"></i>Remove</>
                      ) : (
                        <><i className="bi bi-check2-circle me-1"></i>Mark Collected</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 small muted">
          Tip: Blocks are collected via AR QR scans and synced to your account; you can then use them in the Studio.
        </div>
      </main>

      {/* QR 스캔 FAB 버튼 */}
      <button 
        className="fab d-inline-flex align-items-center"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔍 Scan button clicked');
          setShowScanner(true);
        }}
        disabled={loading}
        title="Scan QR Code"
        style={{
          cursor: loading ? 'not-allowed' : 'pointer',
          pointerEvents: loading ? 'none' : 'auto'
        }}
      >
        {loading ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ) : (
          <i className="bi bi-qr-code-scan"></i>
        )}
        <span className="fab-label">Scan</span>
      </button>

      {/* Admin FAB 버튼 - 관리자만 표시 */}
      {isAdmin && (
        <Link to="/admin">
          <button 
            className="fab fab--secondary fab-admin fab--sm" 
            aria-label="Open Admin"
            onClick={() => console.log('🔍 Admin button clicked')}
          >
            <i className="bi bi-shield-lock"></i>
            <span className="fab-label">Admin</span>
          </button>
        </Link>
      )}
      
      {/* 디버깅: Admin 버튼 표시 상태 */}
      {console.log('🔍 Admin button render check:', { isAdmin, shouldShow: isAdmin })}

      {/* QR 테스트 모달 */}
      <QRTestModal 
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          // 스캐너가 닫힐 때 결과 모달도 닫기
          setShowResultModal(false);
        }}
        onScan={handleQRScan}
      />

      {/* QR 스캔 결과 모달 */}
      <QRResultModal 
        isOpen={showResultModal}
        result={scanResult}
        onClose={() => setShowResultModal(false)}
      />

      <TabBar />
    </>
  );
}

export default Profile;

