import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import QRScannerWebRTC from '../components/QRScannerWebRTC';
import { getQuestions, processQRScan } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';
import useAdminAuth from '../hooks/useAdminAuth';

const QUESTIONS = [
  {
    id: 'sum-1-to-n',
    title: 'Sum from 1 to n',
    difficulty: 'easy',
    tags: ['math', 'loops'],
    body: `Write a program that reads an integer <em>n</em> and prints the sum 1+2+...+n.
If <em>n</em> is negative, print <code>0</code>. Example: input <code>5</code> → output <code>15</code>.`
  },
  {
    id: 'reverse-string',
    title: 'Reverse a String',
    difficulty: 'easy',
    tags: ['strings'],
    body: `Read a line of text and print it reversed. Example: <code>hello</code> → <code>olleh</code>.`
  },
  {
    id: 'count-vowels',
    title: 'Count Vowels',
    difficulty: 'medium',
    tags: ['strings'],
    body: `Read a string and print the number of vowels (a,e,i,o,u). Case-insensitive.`
  },
  {
    id: 'max-in-list',
    title: 'Maximum in List',
    difficulty: 'medium',
    tags: ['lists', 'loops'],
    body: `Read an integer <em>n</em>, then read <em>n</em> integers. Print the maximum value.`
  },
  {
    id: 'prime-check',
    title: 'Prime Check',
    difficulty: 'hard',
    tags: ['math', 'loops'],
    body: `Read an integer and print <code>YES</code> if it is prime, otherwise <code>NO</code>.`
  }
];

const DIFF_BADGES = {
  easy: 'bg-success-subtle text-success-emphasis',
  medium: 'bg-warning-subtle text-warning-emphasis',
  hard: 'bg-danger-subtle text-danger-emphasis'
};

function Challenges() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diffFilter, setDiffFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const { currentUser } = useAuth();
  const { error, success } = useToast();
  const { isAdmin } = useAdminAuth();

  // Firebase에서 문제 목록 불러오기
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const result = await getQuestions();
      
      if (result.success) {
        // 활성화된 문제만 필터링
        const activeQuestions = result.data.filter(q => q.isActive !== false);
        setQuestions(activeQuestions);
      } else {
        // Firebase에서 불러오기 실패 시 로컬 데이터 사용
        setQuestions(QUESTIONS);
        error('문제 목록을 불러오는데 실패했습니다. 로컬 데이터를 사용합니다.');
      }
    } catch (err) {
      // 에러 시 로컬 데이터 사용
      setQuestions(QUESTIONS);
      error('문제 목록을 불러오는데 실패했습니다. 로컬 데이터를 사용합니다.');
    } finally {
      setLoading(false);
    }
  };

  const matchesDiff = (q) => diffFilter === 'all' || q.difficulty === diffFilter;
  const matchesTag = (q) => !tagFilter || q.tags.includes(tagFilter);
  const matchesSearch = (q) => {
    const qstr = searchQuery.toLowerCase().trim();
    if (!qstr) return true;
    return (
      q.title.toLowerCase().includes(qstr) ||
      q.body.toLowerCase().includes(qstr) ||
      q.tags.join(' ').toLowerCase().includes(qstr)
    );
  };

  const handleSolve = (q) => {
    localStorage.setItem('BlockHunt_current_question', JSON.stringify(q));
    navigate('/studio');
  };

  const handleTagClick = (tag) => {
    setTagFilter(tagFilter === tag ? null : tag);
  };

  // QR 스캔 처리
  const handleQRScan = async (qrData) => {
    if (!currentUser) {
      error('로그인이 필요합니다.');
      setShowQRScanner(false);
      return;
    }

    setScanLoading(true);
    try {
      console.log('QR 스캔 데이터:', qrData);
      const result = await processQRScan(currentUser.uid, qrData);
      
      if (result.success) {
        if (result.alreadyCollected) {
          success('이미 보유하고 있는 블록입니다! 🎯');
        } else {
          success(`새로운 블록을 획득했습니다! 🎉\n총 ${result.totalBlocks}개의 블록 보유`);
        }
        // setShowQRScanner(false); // QR 스캐너 내부에서 처리하도록 제거
      } else {
        error('QR 코드 처리 실패: ' + result.error);
      }
    } catch (err) {
      console.error('QR 스캔 오류:', err);
      error('QR 코드 처리 중 오류가 발생했습니다.');
    } finally {
      setScanLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    matchesDiff(q) && matchesTag(q) && matchesSearch(q)
  );

  return (
    <>
      <Navbar />
      <AppBar title="BlockHunt" />
      
      <main className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="small text-uppercase text-muted fw-bold">Now</div>
            <h1 className="h5 mb-0">Programming Challenges</h1>
          </div>
          <Link className="btn btn-ghost" to="/studio">
            <i className="bi bi-code-slash me-1"></i>Go to Studio
          </Link>
        </div>

        <div className="panel p-3 mb-3">
          <div className="toolbar d-flex flex-wrap align-items-center gap-2">
            <div className="btn-group" role="group" aria-label="Difficulty">
              <button 
                className={`btn btn-ghost ${diffFilter === 'all' ? 'active' : ''}`} 
                onClick={() => setDiffFilter('all')}
              >
                All
              </button>
              <button 
                className={`btn btn-ghost ${diffFilter === 'easy' ? 'active' : ''}`} 
                onClick={() => setDiffFilter('easy')}
              >
                Easy
              </button>
              <button 
                className={`btn btn-ghost ${diffFilter === 'medium' ? 'active' : ''}`} 
                onClick={() => setDiffFilter('medium')}
              >
                Medium
              </button>
              <button 
                className={`btn btn-ghost ${diffFilter === 'hard' ? 'active' : ''}`} 
                onClick={() => setDiffFilter('hard')}
              >
                Hard
              </button>
            </div>

            <div className="ms-auto d-flex align-items-center gap-2 flex-wrap">
              {['math', 'strings', 'lists', 'loops'].map(tag => (
                <span 
                  key={tag}
                  className={`chip ${tagFilter === tag ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="bi bi-hash"></i> {tag}
                </span>
              ))}
            </div>

            <div className="ms-auto" style={{ minWidth: '260px' }}>
              <input 
                type="search" 
                className="form-control" 
                placeholder="Search questions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          {loading ? (
            <div className="col-12">
              <div className="panel p-4 text-center">
                <div className="spinner-border text-brand mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="fw-bold">문제를 불러오는 중...</div>
                <div className="text-muted">잠시만 기다려주세요</div>
              </div>
            </div>
          ) : filteredQuestions.length > 0 ? (
            filteredQuestions.map(q => (
              <div key={q.id} className="col-12">
                <div className={`q-card diff-${q.difficulty}`}>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <div className="q-title">{q.title}</div>
                      <span className={`badge ${DIFF_BADGES[q.difficulty]} text-uppercase`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="q-body mt-1" dangerouslySetInnerHTML={{ __html: q.body }} />
                    <div className="q-meta mt-2 d-flex align-items-center gap-2 flex-wrap">
                      {q.tags.map(t => (
                        <span 
                          key={t} 
                          className="chip" 
                          onClick={() => handleTagClick(t)}
                          style={{ cursor: 'pointer' }}
                        >
                          <i className="bi bi-hash"></i> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="q-actions">
                    <button 
                      className="btn btn-brand" 
                      onClick={() => handleSolve(q)}
                    >
                      <i className="bi bi-play-fill me-1"></i>Solve in Studio
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="panel p-4 text-center">
                <div className="mb-2">
                  <i className="bi bi-search" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div className="fw-bold">No questions match your filters.</div>
                <div className="muted">Try changing difficulty / tag or search terms.</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 small muted">Tip:</div>
      </main>

      <button 
        className="fab d-inline-flex align-items-center"
        onClick={() => setShowQRScanner(true)}
        disabled={scanLoading || !currentUser}
      >
        <i className="bi bi-qr-code-scan"></i> <span className="fab-label">Scan</span>
      </button>

      {/* Admin FAB 버튼 - 관리자만 표시 */}
      {isAdmin && (
        <Link to="/admin">
          <button className="fab fab--secondary fab-admin fab--sm" aria-label="Open Admin">
            <i className="bi bi-shield-lock"></i>
            <span className="fab-label">Admin</span>
          </button>
        </Link>
      )}

      {/* QR 스캐너 모달 */}
      {showQRScanner && (
        <QRScannerWebRTC
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      <TabBar />
    </>
  );
}

export default Challenges;

