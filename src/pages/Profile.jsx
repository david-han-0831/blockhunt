import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';

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

  useEffect(() => {
    // Load user data
    const savedUser = JSON.parse(localStorage.getItem('BlockHunt_user') || '{}');
    if (savedUser.name) {
      setUser(savedUser);
    }

    // Load collected blocks
    const savedBlocks = JSON.parse(localStorage.getItem('BlockHunt_collected_set') || '[]');
    setCollected(new Set(savedBlocks));
  }, []);

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

  const handleToggleBlock = (blockId) => {
    const newCollected = new Set(collected);
    if (newCollected.has(blockId)) {
      newCollected.delete(blockId);
    } else {
      newCollected.add(blockId);
    }
    setCollected(newCollected);
    localStorage.setItem('BlockHunt_collected_set', JSON.stringify([...newCollected]));
  };

  const filteredBlocks = BLOCK_CATALOG.filter(block => {
    const hasBlock = collected.has(block.id);
    const matchesFilter = filterMode === 'all' || 
                         (filterMode === 'collected' && hasBlock) ||
                         (filterMode === 'missing' && !hasBlock);
    const matchesSearch = !searchQuery || 
                         block.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalBlocks = BLOCK_CATALOG.length;
  const collectedCount = collected.size;
  const missingCount = totalBlocks - collectedCount;
  const collectedPercent = Math.round((collectedCount / totalBlocks) * 100);

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
            return (
              <div key={block.id} className="col-12 col-md-6 col-lg-4">
                <div className={`block-card ${hasBlock ? 'collected' : ''} ${getCatClass(block.cat)}`}>
                  <div className="left">
                    <i className={`bi ${block.icon}`}></i>
                    <div>
                      <div className="name">{block.name}</div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="cat-badge">{block.cat}</span>
                        {hasBlock ? (
                          <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                            <i className="bi bi-check2"></i> collected
                          </span>
                        ) : (
                          <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
                            <i className="bi bi-plus-circle"></i> missing
                          </span>
                        )}
                      </div>
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

      <button className="fab d-inline-flex align-items-center">
        <i className="bi bi-qr-code-scan"></i> <span className="fab-label">Scan</span>
      </button>

      <Link to="/admin">
        <button className="fab fab--secondary fab-admin fab--sm" aria-label="Open Admin">
          <i className="bi bi-shield-lock"></i>
          <span className="fab-label">Admin</span>
        </button>
      </Link>

      <TabBar />
    </>
  );
}

export default Profile;

