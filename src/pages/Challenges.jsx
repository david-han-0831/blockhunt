import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  easy: 'badge-easy',
  medium: 'badge-medium',
  hard: 'badge-hard'
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
        error('Failed to load question list. Using local data.');
      }
    } catch (err) {
      // 에러 시 로컬 데이터 사용
      setQuestions(QUESTIONS);
      error('Failed to load question list. Using local data.');
    } finally {
      setLoading(false);
    }
  };

  const matchesDiff = (q) => diffFilter === 'all' || q.difficulty === diffFilter;
  const matchesTag = (q) => {
    if (!tagFilter) return true;
    // 태그 비교 시 대소문자 무시
    const normalizedFilter = tagFilter.toLowerCase();
    return q.tags && q.tags.some(tag => tag.toLowerCase() === normalizedFilter);
  };
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
      error('Login required.');
      setShowQRScanner(false);
      return;
    }

    setScanLoading(true);
    try {
      console.log('QR scan data:', qrData);
      const result = await processQRScan(currentUser.uid, qrData);
      
      if (result.success) {
        if (result.alreadyCollected) {
          success('You already have this block! 🎯');
        } else {
          success(`New block acquired! 🎉\nTotal ${result.totalBlocks} blocks owned`);
        }
        // setShowQRScanner(false); // QR 스캐너 내부에서 처리하도록 제거
      } else {
        error('QR code processing failed: ' + result.error);
      }
    } catch (err) {
      console.error('QR scan error:', err);
      error('An error occurred while processing QR code.');
    } finally {
      setScanLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    matchesDiff(q) && matchesTag(q) && matchesSearch(q)
  );

  return (
    <>
      <AppBar title="BlockHunt" />
      
      <main>
        <div className="page-head">
          <div>
            <div className="kicker">Right now</div>
            <h1 className="title">Pick a Challenge</h1>
          </div>
        </div>

        <div className="panel">
          <div className="toolbar">
            <div className="diff-group" role="group" aria-label="Difficulty">
              <button 
                className="diff-btn" 
                data-diff="all" 
                data-active={diffFilter === 'all' ? 'true' : 'false'}
                onClick={() => setDiffFilter('all')}
              >
                All
              </button>
              <button 
                className="diff-btn" 
                data-diff="easy" 
                data-active={diffFilter === 'easy' ? 'true' : 'false'}
                onClick={() => setDiffFilter('easy')}
              >
                Easy
              </button>
              <button 
                className="diff-btn" 
                data-diff="medium" 
                data-active={diffFilter === 'medium' ? 'true' : 'false'}
                onClick={() => setDiffFilter('medium')}
              >
                Medium
              </button>
              <button 
                className="diff-btn" 
                data-diff="hard" 
                data-active={diffFilter === 'hard' ? 'true' : 'false'}
                onClick={() => setDiffFilter('hard')}
              >
                Hard
              </button>
            </div>

            <div className="chips">
              {['math', 'strings', 'lists', 'loops'].map(tag => {
                const tagIcons = {
                  math: 'bi-123',
                  strings: 'bi-input-cursor-text',
                  lists: 'bi-list-ul',
                  loops: 'bi-arrow-repeat'
                };
                return (
                  <span 
                    key={tag}
                    className={`chip ${tagFilter === tag ? 'active' : ''}`}
                    data-tag={tag}
                    data-active={tagFilter === tag ? 'true' : 'false'}
                    onClick={() => handleTagClick(tag)}
                  >
                    <i className={`bi ${tagIcons[tag] || 'bi-hash'}`}></i> {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                );
              })}
            </div>

            <div className="search">
              <input 
                type="search" 
                placeholder="Search challenges…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <section className="grid">
          {loading ? (
            <div className="empty">
              <div style={{ fontSize: '1.2rem', marginBottom: '.4rem' }}>Loading challenges...</div>
              <div>Please wait...</div>
            </div>
          ) : filteredQuestions.length > 0 ? (
            filteredQuestions.map(q => (
              <article key={q.id} className={`card-q diff-${q.difficulty}`}>
                <div className="content">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                    <h3 className="title">{q.title}</h3>
                    <span className={`badge ${DIFF_BADGES[q.difficulty]}`} aria-label={`Difficulty ${q.difficulty}`}>
                      {q.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="body" dangerouslySetInnerHTML={{ __html: q.body }} />
                  <div className="q-tags">
                    {q.tags.map(t => (
                      <button 
                        key={t}
                        className="chip chip-tag" 
                        data-tag={t}
                        type="button"
                        aria-label={`Filter by ${t}`}
                        onClick={() => handleTagClick(t)}
                      >
                        <i className="bi bi-hash"></i>{t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="q-actions">
                  <button 
                    className="btn-solve" 
                    onClick={() => handleSolve(q)}
                    aria-label={`Solve ${q.title}`}
                  >
                    <i className="bi bi-play-fill"></i>
                    <span>Solve</span>
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <div style={{ fontSize: '1.2rem', marginBottom: '.4rem' }}>No challenges match.</div>
              <div>Try another difficulty, tag, or search word.</div>
            </div>
          )}
        </section>

        <p style={{ margin: '.75rem 0' }} className="muted">
          <strong>Tip:</strong> Type "prime" or tap a tag to filter quickly.
        </p>
      </main>

      <button 
        className="fab"
        onClick={() => setShowQRScanner(true)}
        disabled={scanLoading || !currentUser}
        aria-label="Scan QR"
      >
        <i className="bi bi-qr-code-scan"></i>
        <span className="fab-label">Scan</span>
      </button>

      {/* Admin FAB 버튼 - 관리자만 표시 */}
      {isAdmin && (
        <Link to="/admin" className="fab fab-secondary" aria-label="Open Admin">
          <i className="bi bi-shield-lock"></i>
          <span className="fab-label">Admin</span>
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

