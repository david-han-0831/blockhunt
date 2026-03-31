import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import QRScannerWebRTC from '../components/QRScannerWebRTC';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, processQRScan, getBlocks, removeCollectedBlock, getUserSubmissions, getQuestions } from '../firebase/firestore';
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
  const [selectedCategory, setSelectedCategory] = useState(null); // 카테고리 필터 상태
  const [showScanner, setShowScanner] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(0);
  
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const { isAdmin, isLoading } = useAdminAuth();

  // 디버깅: 관리자 상태 확인
  console.log('🔍 Profile - Admin status:', { isAdmin, isLoading, currentUser: currentUser?.uid });

  // 사용자 데이터 및 블록 정보 로드
  const loadUserData = useCallback(async () => {
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
  }, [currentUser]);

  // 블록 카탈로그 로드
  const loadBlocks = useCallback(async () => {
    try {
      console.log('🔄 Loading blocks catalog...');
      const result = await getBlocks();
      console.log('📊 getBlocks result:', result);
      
      if (result.success) {
        console.log('📦 Blocks loaded from Firebase:', result.data.length, 'blocks');
        setBlocks(result.data);
      } else {
        console.log('⚠️ Firebase blocks failed, using default catalog');
        setBlocks(BLOCK_CATALOG);
      }
    } catch (err) {
      console.error('Failed to load blocks:', err);
      console.log('💾 Error fallback - using default catalog');
      setBlocks(BLOCK_CATALOG);
    }
  }, []);

  const loadSubmissionStats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [submissionsResult, questionsResult] = await Promise.all([
        getUserSubmissions(currentUser.uid),
        getQuestions()
      ]);

      if (submissionsResult.success) {
        const submissions = submissionsResult.data || [];
        setAttemptCount(submissions.length);

        const uniqueQuestionIds = new Set(
          submissions
            .map(submission => submission.questionId)
            .filter(Boolean)
        );
        setSolvedCount(uniqueQuestionIds.size);
      } else {
        setAttemptCount(0);
        setSolvedCount(0);
      }

      if (questionsResult.success) {
        setTotalChallenges((questionsResult.data || []).length);
      } else {
        setTotalChallenges(0);
      }
    } catch (err) {
      console.error('Failed to load submission stats:', err);
      setAttemptCount(0);
      setSolvedCount(0);
      setTotalChallenges(0);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
      loadBlocks();
      loadSubmissionStats();
    }
  }, [currentUser, loadUserData, loadBlocks, loadSubmissionStats]);

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
      error('Login required.');
      setShowScanner(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Processing QR scan:', qrData);
      const result = await processQRScan(currentUser.uid, qrData);
      console.log('✅ QR scan result:', result);
      
      if (result.success) {
        if (result.alreadyCollected) {
          success('You already have this block! 🎯');
        } else {
          // 새로운 블록 획득
          const blockNames = result.blocksObtained?.map(blockId => {
            const block = blocks.find(b => b.id === blockId);
            return block ? block.name : blockId;
          }).join(', ') || '';
          
          success(`New block acquired! 🎉\n${blockNames}\nTotal ${result.totalBlocks} blocks owned`);
          
          // 로컬 상태 업데이트
          setCollected(prev => {
            const newCollected = new Set(prev);
            result.blocksObtained?.forEach(blockId => newCollected.add(blockId));
            return newCollected;
          });
          
          // Firebase에서 최신 데이터 다시 로드
          await loadUserData();
        }
        // setShowScanner(false); // QR 스캐너 내부에서 처리하도록 제거
      } else {
        error('QR code processing failed: ' + result.error);
      }
    } catch (err) {
      console.error('QR scan error:', err);
      error('An error occurred while scanning QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (blockId) => {
    if (!currentUser) {
      error('Login required.');
      return;
    }

    try {
      const hasBlock = collected.has(blockId);
      
      if (hasBlock) {
        // 블록 제거
        console.log('🗑️ Removing block:', blockId);
        const result = await removeCollectedBlock(currentUser.uid, blockId);
        
        // 로컬 상태 업데이트 (Firebase 성공 여부와 관계없이)
        const newCollected = new Set(collected);
        newCollected.delete(blockId);
        setCollected(newCollected);
        
        // localStorage에도 저장
        localStorage.setItem('BlockHunt_collected_set', JSON.stringify([...newCollected]));
        
        if (result.success) {
          // Firebase에서도 제거 성공
          success('Block removed.');
          console.log('✅ Block removed successfully:', blockId);
        } else if (result.error === 'Block not found in collected blocks') {
          // Firebase에 없으면 로컬에서만 제거 (테스트용)
          success('Block removed from local storage.');
          console.log('✅ Block removed from local storage:', blockId);
        } else {
          // 다른 에러 발생 시에도 로컬에서는 제거됨
          success('Block removed from local storage.');
          console.warn('⚠️ Firebase removal failed, but removed locally:', result.error);
        }
      } else {
        // 블록 추가 (기존 로직 유지)
        const newCollected = new Set(collected);
        newCollected.add(blockId);
        setCollected(newCollected);
        
        // localStorage에도 저장 (오프라인 지원)
        localStorage.setItem('BlockHunt_collected_set', JSON.stringify([...newCollected]));
        
        success('Block added.');
        console.log('✅ Block added locally:', blockId);
      }
    } catch (err) {
      console.error('❌ Error toggling block:', err);
      error('An error occurred while changing block status.');
    }
  };

  // QR Required 블록만 필터링 (isDefaultBlock === false)
  const qrRequiredBlocks = blocks.filter(block => block.isDefaultBlock === false);

  // 필터링 로직: QR Required 블록만 대상으로 필터링
  const filteredBlocks = qrRequiredBlocks.filter(block => {
    const hasBlock = collected.has(block.id);
    const blockCategory = block.category || block.cat;
    
    let matchesFilter = false;
    if (filterMode === 'all') {
      // All 탭: QR Required 블록 모두 표시
      matchesFilter = true;
    } else if (filterMode === 'collected') {
      // Collected 탭: QR Required 블록 중 수집한 블록만 표시
      matchesFilter = hasBlock;
    } else if (filterMode === 'missing') {
      // Missing 탭: QR Required 블록 중 미수집 블록만 표시
      matchesFilter = !hasBlock;
    }
    
    // 카테고리 필터: QR Required 블록에서만 필터링
    const matchesCategory = !selectedCategory || blockCategory === selectedCategory;
    
    const matchesSearch = !searchQuery || 
                         block.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesCategory && matchesSearch;
  });

  // Total Blocks: QR Required 블록만 카운트
  const totalBlocks = qrRequiredBlocks.length;
  // Collected Count: QR Required 블록 중 수집한 블록만 카운트
  const collectedCount = qrRequiredBlocks.filter(block => collected.has(block.id)).length;
  const collectedPercent = totalBlocks > 0 ? Math.round((collectedCount / totalBlocks) * 100) : 0;
  const solvedPercent = totalChallenges > 0 ? Math.round((solvedCount / totalChallenges) * 100) : 0;
  const successRate = attemptCount > 0 ? Math.round((solvedCount / attemptCount) * 100) : 0;

  return (
    <>
      <AppBar title="BlockHunt" />
      
      <main className="profile">
        <section className="hero" aria-label="Profile header">
          <div className="hero-wrap">
            <div className="hero-bg"></div>
            <div className="hero-row">
              <div className="avatar-xl" aria-hidden="true">
                {user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="identity">
                <div className="kicker">Your space</div>
                <div className="name">{user.name}</div>
                <div className="role">
                  <i className="bi bi-magic"></i> Learner
                </div>
              </div>
              <Link className="hero-cta" to="/studio">
                <i className="bi bi-play-fill"></i>
                <span>Open Studio</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="stats" aria-label="Profile statistics">
          <div className="stat">
            <div className="k">
              <i className="bi bi-boxes"></i>Total Blocks
            </div>
            <div className="v">{totalBlocks}</div>
            <div className="muted">In curriculum</div>
          </div>
          <div className="stat">
            <div className="k">
              <i className="bi bi-check2-circle"></i>Collected
            </div>
            <div className="v">{collectedCount}</div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${collectedPercent}%` }}></div>
            </div>
            <div className="muted">{collectedPercent}% complete</div>
          </div>
          <div className="stat">
            <div className="k">
              <i className="bi bi-list-task"></i>Solved
            </div>
            <div className="v">{solvedCount}</div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${solvedPercent}%` }}></div>
            </div>
            <div className="muted">{solvedCount} of {totalChallenges} challenges</div>
          </div>
          <div className="stat">
            <div className="k">
              <i className="bi bi-graph-up"></i>Success Rate
            </div>
            <div className="v">{successRate}%</div>
            <div className="muted">Solved / Attempts</div>
          </div>
        </section>

        <section className="panel" aria-label="Blocks inventory">
          <div className="head">
            <h6 className="title m-0">Blocks</h6>
          </div>
          <div className="tools">
            <div className="btn-group" role="group" aria-label="Filter">
              <button 
                className="btn-ghost" 
                data-filter="all" 
                data-active={filterMode === 'all' ? 'true' : 'false'}
                onClick={() => setFilterMode('all')}
              >
                <i className="bi bi-grid-3x3-gap me-1"></i>All
              </button>
              <button 
                className="btn-ghost" 
                data-filter="collected" 
                data-active={filterMode === 'collected' ? 'true' : 'false'}
                onClick={() => setFilterMode('collected')}
              >
                <i className="bi bi-check2-circle me-1"></i>Collected
              </button>
              <button 
                className="btn-ghost" 
                data-filter="missing" 
                data-active={filterMode === 'missing' ? 'true' : 'false'}
                onClick={() => setFilterMode('missing')}
              >
                <i className="bi bi-dash-circle me-1"></i>Missing
              </button>
            </div>
            <div className="legend">
              <span 
                className={`pill logic ${selectedCategory === 'Logic' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Logic' ? null : 'Logic')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-braces"></i> Logic
              </span>
              <span 
                className={`pill loops ${selectedCategory === 'Loops' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Loops' ? null : 'Loops')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-arrow-repeat"></i> Loops
              </span>
              <span 
                className={`pill math ${selectedCategory === 'Math' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Math' ? null : 'Math')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-123"></i> Math
              </span>
              <span 
                className={`pill text ${selectedCategory === 'Text' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Text' ? null : 'Text')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-chat-dots"></i> Text
              </span>
              <span 
                className={`pill lists ${selectedCategory === 'Lists' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Lists' ? null : 'Lists')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-list-ul"></i> Lists
              </span>
              <span 
                className={`pill vars ${selectedCategory === 'Variables' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Variables' ? null : 'Variables')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-sliders"></i> Variables
              </span>
              <span 
                className={`pill func ${selectedCategory === 'Functions' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Functions' ? null : 'Functions')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-puzzle"></i> Functions
              </span>
            </div>
            <div className="search">
              <input 
                type="search" 
                placeholder="Search blocks…" 
                aria-label="Search blocks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="grid">
            {filteredBlocks.map(block => {
              const hasBlock = collected.has(block.id);
              const catClass = getCatClass(block.category || block.cat);
              
              return (
                <div key={block.id} className={catClass}>
                  <div className={`block-card ${hasBlock ? 'collected' : 'missing'}`}>
                    <div className="left">
                      <i className={`bi ${block.icon}`}></i>
                      <div>
                        <div className="name">
                          {block.name} {!hasBlock && <span className="state-missing">(missing)</span>}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="cat-badge">{block.cat}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button 
                        className="btn-ghost sm"
                        onClick={() => handleToggleBlock(block.id)}
                      >
                        {hasBlock ? (
                          <>
                            <i className="bi bi-x-circle me-1"></i>Remove
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle me-1"></i>Mark
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="muted" style={{ padding: '0 16px 16px', fontWeight: '800' }}>
            Tip: scan AR QR codes around campus to collect more blocks.
          </div>
        </section>
      </main>

      <button 
        className="fab"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowScanner(true);
        }}
        disabled={loading}
        aria-label="Scan QR"
      >
        {loading ? (
          <span className="spinner"></span>
        ) : (
          <i className="bi bi-qr-code-scan"></i>
        )}
        <span className="fab-label">Scan</span>
      </button>

      {isAdmin && (
        <Link to="/admin" className="d-inline-flex">
          <button className="fab fab-secondary fab--sm" aria-label="Open Admin">
            <i className="bi bi-shield-lock"></i>
            <span className="fab-label">Admin</span>
          </button>
        </Link>
      )}

      {/* QR 스캐너 모달 */}
      {showScanner && (
        <QRScannerWebRTC
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <TabBar />
    </>
  );
}

export default Profile;

