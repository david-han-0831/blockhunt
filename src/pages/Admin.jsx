import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import QRViewModal from '../components/QRViewModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  getQuestions, 
  addQuestion, 
  updateQuestion, 
  deleteQuestion,
  getAllSubmissions,
  getUserProfile,
  getBlocks,
  updateBlockSettings,
  getQRCodes,
  createQRCode,
  updateQRCode,
  deleteQRCode
} from '../firebase/firestore';
import { migrateBlocksToFirestore, migrateBlocksToFirestoreWithProgress, verifyBlocksInFirestore } from '../utils/migrateBlocks';
import useToast from '../hooks/useToast';

function Admin() {
  const [activeTab, setActiveTab] = useState('submissions');
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQuestion, setFilterQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Blocks & QR 관련 상태
  const [blocks, setBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [qrCodes, setQrCodes] = useState([]);
  const [qrCodesLoading, setQrCodesLoading] = useState(false);
  const [showQRForm, setShowQRForm] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [qrFormData, setQrFormData] = useState({
    name: '',
    block: '',
    isActive: true,
    startDate: '',
    endDate: ''
  });
  
  // 마이그레이션 관련 상태
  const [migrationStatus, setMigrationStatus] = useState('idle'); // 'idle', 'migrating', 'completed', 'error'
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationResult, setMigrationResult] = useState(null);
  
  // QR 코드 뷰 모달 상태
  const [showQRViewModal, setShowQRViewModal] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState(null);
  
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  // 문제 목록 및 제출물 불러오기
  useEffect(() => {
    loadQuestions();
    loadSubmissions();
  }, []);

  // Blocks & QR 데이터 로딩
  useEffect(() => {
    if (activeTab === 'blocks') {
      loadBlocks();
      loadQRCodes();
    }
  }, [activeTab]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const result = await getQuestions();
      if (result.success) {
        setQuestions(result.data);
      } else {
        error('문제 목록을 불러오는데 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('문제 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 제출물 불러오기
  const loadSubmissions = async (filters = {}) => {
    setSubmissionsLoading(true);
    try {
      const result = await getAllSubmissions(filters);
      if (result.success) {
        // 각 제출물에 대해 사용자 정보와 문제 정보 추가
        const submissionsWithDetails = await Promise.all(
          result.data.map(async (submission) => {
            // 사용자 정보 가져오기
            const userResult = await getUserProfile(submission.userId);
            const userInfo = userResult.success ? userResult.data : null;

            return {
              ...submission,
              userInfo
            };
          })
        );
        setSubmissions(submissionsWithDetails);
      } else {
        error('제출물 목록을 불러오는데 실패했습니다: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
      error('제출물 목록을 불러오는데 실패했습니다.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // 문제 생성/수정
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const questionData = {
      id: formData.get('id'),
      title: formData.get('title'),
      difficulty: formData.get('difficulty'),
      tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
      body: formData.get('body'),
      createdBy: currentUser.uid
    };

    setLoading(true);
    try {
      let result;
      if (editingQuestion) {
        result = await updateQuestion(editingQuestion.id, questionData);
        if (result.success) {
          success('문제가 수정되었습니다.');
          setEditingQuestion(null);
        }
      } else {
        result = await addQuestion(questionData);
        if (result.success) {
          success('문제가 생성되었습니다.');
        }
      }

      if (result.success) {
        await loadQuestions();
        e.target.reset();
      } else {
        error('문제 저장에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('문제 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 문제 수정 시작
  const handleEdit = (question) => {
    setEditingQuestion(question);
    // 폼에 데이터 채우기
    const form = document.getElementById('questionForm');
    if (form) {
      form.reset();
      form.id.value = question.id;
      form.title.value = question.title;
      form.difficulty.value = question.difficulty;
      form.tags.value = question.tags.join(', ');
      form.body.value = question.body;
    }
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingQuestion(null);
    const form = document.getElementById('questionForm');
    if (form) {
      form.reset();
    }
  };

  // 문제 삭제
  const handleDelete = async (questionId, isBuiltIn) => {
    if (isBuiltIn) {
      error('내장 문제는 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm('정말로 이 문제를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        success('문제가 삭제되었습니다.');
        await loadQuestions();
      } else {
        error('문제 삭제에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('문제 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 제출물 필터 적용
  const handleApplyFilters = (e) => {
    e.preventDefault();
    const filters = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterQuestion) filters.questionId = filterQuestion;
    loadSubmissions(filters);
  };

  // 제출물 필터링 (클라이언트 사이드 검색)
  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const userEmail = submission.userInfo?.email?.toLowerCase() || '';
    const userName = submission.userInfo?.displayName?.toLowerCase() || '';
    const submissionId = submission.id.toLowerCase();
    return userEmail.includes(query) || userName.includes(query) || submissionId.includes(query);
  });

  // 문제 정보 찾기 헬퍼
  const getQuestionInfo = (questionId) => {
    return questions.find(q => q.id === questionId);
  };

  // 날짜 포맷 헬퍼
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== 블록 관리 함수들 ====================

  // 블록 목록 불러오기
  const loadBlocks = async () => {
    setBlocksLoading(true);
    try {
      console.log('🔍 Loading blocks from Firestore...');
      const result = await getBlocks();
      console.log('📦 Blocks result:', result);
      
      if (result.success) {
        setBlocks(result.data);
        console.log(`✅ Loaded ${result.data.length} blocks`);
      } else {
        console.error('❌ Failed to load blocks:', result.error);
        error('블록 목록을 불러오는데 실패했습니다: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error loading blocks:', err);
      error('블록 목록을 불러오는데 실패했습니다.');
    } finally {
      setBlocksLoading(false);
    }
  };

  // 블록 설정 업데이트
  const handleBlockToggle = async (blockId, isDefaultBlock) => {
    try {
      const result = await updateBlockSettings(blockId, { isDefaultBlock });
      if (result.success) {
        // 로컬 상태 업데이트
        setBlocks(prev => prev.map(block => 
          block.id === blockId ? { ...block, isDefaultBlock } : block
        ));
        success(`블록 설정이 업데이트되었습니다.`);
      } else {
        error('블록 설정 업데이트에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('블록 설정 업데이트에 실패했습니다.');
    }
  };

  // 블록 마이그레이션
  const handleMigrateBlocks = async () => {
    if (!window.confirm('Firebase에 블록 데이터를 마이그레이션하시겠습니까? 기존 데이터가 덮어써질 수 있습니다.')) {
      return;
    }

    setMigrationStatus('migrating');
    setMigrationProgress(0);
    setMigrationResult(null);
    
    try {
      console.log('🚀 Starting block migration...');
      
      // 마이그레이션 함수를 수정하여 진행 상황 콜백 지원
      const result = await migrateBlocksToFirestoreWithProgress((progress) => {
        setMigrationProgress(progress);
      });
      
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('completed');
        success(`블록 마이그레이션이 완료되었습니다! (성공: ${result.successCount}, 실패: ${result.errorCount})`);
        await loadBlocks(); // 블록 목록 새로고침
      } else {
        setMigrationStatus('error');
        error('블록 마이그레이션에 실패했습니다.');
      }
    } catch (err) {
      console.error('Migration error:', err);
      setMigrationStatus('error');
      setMigrationResult({ success: false, error: err.message });
      error('블록 마이그레이션 중 오류가 발생했습니다.');
    }
  };

  // 블록 검증
  const handleVerifyBlocks = async () => {
    setLoading(true);
    try {
      const result = await verifyBlocksInFirestore();
      if (result.success) {
        console.log('✅ Block verification completed. Check console for details.');
        success('블록 검증이 완료되었습니다. 콘솔을 확인하세요.');
      } else {
        error('블록 검증에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('블록 검증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== QR 코드 관리 함수들 ====================

  // QR 코드 목록 불러오기
  const loadQRCodes = async () => {
    setQrCodesLoading(true);
    try {
      const result = await getQRCodes();
      if (result.success) {
        setQrCodes(result.data);
      } else {
        error('QR 코드 목록을 불러오는데 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('QR 코드 목록을 불러오는데 실패했습니다.');
    } finally {
      setQrCodesLoading(false);
    }
  };

  // QR 코드 생성
  const handleCreateQR = async (e) => {
    e.preventDefault();
    
    if (!qrFormData.block) {
      error('블록을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await createQRCode({
        ...qrFormData,
        createdBy: currentUser.uid
      });
      
      if (result.success) {
        success('QR 코드가 성공적으로 생성되었습니다!');
        setShowQRForm(false);
        setQrFormData({
          name: '',
          block: '',
          isActive: true,
          startDate: '',
          endDate: ''
        });
        setSelectedBlock('');
        await loadQRCodes();
        
        // 생성된 QR 코드를 자동으로 표시
        if (result.data) {
          setTimeout(() => {
            handleViewQR(result.data);
          }, 500);
        }
      } else {
        error('QR 코드 생성에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('QR 코드 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // QR 코드 활성화/비활성화
  const handleQRToggle = async (qrCodeId, isActive) => {
    try {
      const result = await updateQRCode(qrCodeId, { isActive });
      if (result.success) {
        setQrCodes(prev => prev.map(qr => 
          qr.id === qrCodeId ? { ...qr, isActive } : qr
        ));
        success(`QR 코드가 ${isActive ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        error('QR 코드 상태 변경에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('QR 코드 상태 변경에 실패했습니다.');
    }
  };

  // QR 코드 삭제
  const handleDeleteQR = async (qrCodeId) => {
    if (!window.confirm('정말로 이 QR 코드를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteQRCode(qrCodeId);
      if (result.success) {
        success('QR 코드가 삭제되었습니다.');
        await loadQRCodes();
      } else {
        error('QR 코드 삭제에 실패했습니다: ' + result.error);
      }
    } catch (err) {
      error('QR 코드 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 블록 선택 변경
  const handleBlockSelect = (blockId) => {
    setSelectedBlock(blockId);
    setQrFormData(prev => ({
      ...prev,
      block: blockId
    }));
  };

  // QR 코드 보기
  const handleViewQR = (qrCode) => {
    setSelectedQRCode(qrCode);
    setShowQRViewModal(true);
  };

  // QR 모달 닫기
  const handleCloseQRModal = () => {
    setShowQRViewModal(false);
    setSelectedQRCode(null);
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

  // 카테고리 아이콘
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

  return (
    <>
      <Navbar />
      <AppBar title="BlockHunt Admin" />
      
      <main className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="small text-uppercase text-muted fw-bold">Admin</div>
            <h1 className="h5 mb-0">Review & Manage</h1>
          </div>
        </div>

        <ul className="nav nav-pills mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              <i className="bi bi-inbox me-1"></i> Submissions
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              <i className="bi bi-journal-text me-1"></i> Questions
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'blocks' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocks')}
            >
              <i className="bi bi-boxes me-1"></i> Blocks & QR
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {activeTab === 'submissions' && (
            <div className="tab-pane fade show active">
              <div className="panel p-3 mb-3">
                <form className="row g-2 align-items-end" onSubmit={handleApplyFilters}>
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Question</label>
                    <select 
                      className="form-select" 
                      value={filterQuestion}
                      onChange={(e) => setFilterQuestion(e.target.value)}
                    >
                      <option value="">All questions</option>
                      {questions.map(q => (
                        <option key={q.id} value={q.id}>{q.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small text-muted mb-1">Status</label>
                    <select 
                      className="form-select" 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="graded">Graded</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Search</label>
                    <input 
                      type="search" 
                      className="form-control" 
                      placeholder="User, email, id…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 text-end">
                    <button className="btn btn-brand" type="submit">
                      <i className="bi bi-funnel me-1"></i>Apply Filters
                    </button>
                  </div>
                </form>
              </div>

              <div className="panel p-0">
                <div className="table-responsive" style={{ maxHeight: '60vh' }}>
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Submission</th>
                        <th>Question</th>
                        <th>User</th>
                        <th>Status</th>
                        <th>Grade</th>
                        <th style={{ width: '140px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsLoading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <div className="spinner-border text-brand" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="mt-2 text-muted">Loading submissions...</div>
                          </td>
                        </tr>
                      ) : filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                            <div className="mt-2">No submissions found</div>
                            <div className="small">Submissions will appear here when students submit their code</div>
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((submission) => {
                          const questionInfo = getQuestionInfo(submission.questionId);
                          return (
                            <tr key={submission.id}>
                              <td>
                                <div className="fw-semibold">#{submission.id.substring(0, 8)}</div>
                                <div className="small muted">{formatDate(submission.submittedAt)}</div>
                              </td>
                              <td>
                                <div className="fw-semibold">{questionInfo?.title || submission.questionId}</div>
                                {questionInfo && (
                                  <span className={`badge text-uppercase ${
                                    questionInfo.difficulty === 'easy' ? 'badge-easy' :
                                    questionInfo.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                                  }`}>
                                    {questionInfo.difficulty}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {submission.userInfo?.displayName || 'Unknown User'}
                                </div>
                                <div className="small muted">
                                  {submission.userInfo?.email || submission.userId}
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${
                                  submission.status === 'pending' 
                                    ? 'bg-warning-subtle text-warning-emphasis'
                                    : submission.status === 'graded'
                                    ? 'bg-success-subtle text-success-emphasis'
                                    : 'bg-secondary-subtle text-secondary-emphasis'
                                }`}>
                                  {submission.status}
                                </span>
                              </td>
                              <td>
                                {submission.grade ? (
                                  <div>
                                    <span className={`badge ${
                                      submission.grade === 'Accepted' 
                                        ? 'bg-success'
                                        : submission.grade === 'Needs Work'
                                        ? 'bg-warning'
                                        : 'bg-danger'
                                    }`}>
                                      {submission.grade}
                                    </span>
                                    {submission.score !== undefined && (
                                      <div className="small muted mt-1">{submission.score}점</div>
                                    )}
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="text-nowrap">
                                <button className="btn btn-sm btn-ghost">
                                  <i className="bi bi-eye me-1"></i>Review
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 small muted">
                  {submissionsLoading ? (
                    'Loading...'
                  ) : (
                    `Showing ${filteredSubmissions.length} result${filteredSubmissions.length !== 1 ? 's' : ''}`
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="tab-pane fade show active">
              <div className="row g-3">
                <div className="col-lg-5">
                  <div className="panel p-3">
                    <h6 className="mb-2">
                      {editingQuestion ? 'Update Question' : 'Create / Update Question'}
                    </h6>
                    <form id="questionForm" onSubmit={handleSubmit}>
                      <div className="mb-2">
                        <label className="form-label">ID (unique, URL-friendly)</label>
                        <input className="form-control" name="id" placeholder="e.g. sum-1-to-n" required />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Title</label>
                        <input className="form-control" name="title" placeholder="e.g. Sum from 1 to n" required />
                      </div>
                      <div className="row g-2 mb-2">
                        <div className="col-md-6">
                          <label className="form-label">Difficulty</label>
                          <select className="form-select" name="difficulty">
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Tags (comma separated)</label>
                          <input className="form-control" name="tags" placeholder="math, loops" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Question Body (supports HTML)</label>
                        <textarea className="form-control" name="body" rows="6" placeholder="Write the prompt here…"></textarea>
                      </div>
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-brand" 
                          type="submit" 
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              {editingQuestion ? 'Updating...' : 'Saving...'}
                            </>
                          ) : (
                            <>
                              <i className="bi bi-save me-1"></i>
                              {editingQuestion ? 'Update' : 'Save'}
                            </>
                          )}
                        </button>
                        {editingQuestion ? (
                          <button 
                            className="btn btn-ghost" 
                            type="button"
                            onClick={handleCancelEdit}
                          >
                            <i className="bi bi-x-circle me-1"></i>Cancel
                          </button>
                        ) : (
                          <button className="btn btn-ghost" type="reset">
                            <i className="bi bi-eraser me-1"></i>Clear
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="panel p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="mb-0">Existing Questions</h6>
                      <div className="small muted">
                        {loading ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        ) : (
                          `${questions.length} questions`
                        )}
                      </div>
                    </div>

                    <div className="vstack gap-2">
                      {loading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-brand" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="mt-2 text-muted">Loading questions...</div>
                        </div>
                      ) : questions.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-journal-text" style={{ fontSize: '2rem' }}></i>
                          <div className="mt-2">No questions found</div>
                          <div className="small">Create your first question using the form on the left</div>
                        </div>
                      ) : (
                        questions.map((question) => (
                          <div key={question.id} className="border rounded-3 p-2 d-flex align-items-center justify-content-between">
                            <div className="me-2">
                              <div className="fw-semibold">
                                {question.title} <span className="small muted">({question.id})</span>
                              </div>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className={`badge text-uppercase ${
                                  question.difficulty === 'easy' ? 'badge-easy' :
                                  question.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                                }`}>
                                  {question.difficulty}
                                </span>
                                {question.tags && question.tags.map((tag, index) => (
                                  <span key={index} className="badge text-bg-light border">
                                    <i className="bi bi-hash"></i> {tag}
                                  </span>
                                ))}
                                <span className={`badge ${
                                  question.isBuiltIn ? 'text-bg-secondary' : 'text-bg-warning'
                                }`}>
                                  {question.isBuiltIn ? 'built-in' : 'custom'}
                                </span>
                              </div>
                            </div>
                            <div className="text-nowrap">
                              <button 
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleEdit(question)}
                                title="Edit question"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                disabled={question.isBuiltIn || loading}
                                onClick={() => handleDelete(question.id, question.isBuiltIn)}
                                title={question.isBuiltIn ? "Built-in questions cannot be deleted" : "Delete question"}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blocks' && (
            <div className="tab-pane fade show active">
              <div className="row g-3">
                {/* 좌측: 블록 관리 */}
                <div className="col-lg-6">
                  <div className="panel p-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0">
                        <i className="bi bi-puzzle me-2"></i>
                        Block Management
                      </h6>
                      <div className="d-flex align-items-center gap-2">
                        <div className="small text-muted">
                          {blocksLoading ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : (
                            `${blocks.length} blocks`
                          )}
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleMigrateBlocks}
                          disabled={migrationStatus === 'migrating' || loading}
                          title="Firebase에 블록 데이터 마이그레이션"
                        >
                          {migrationStatus === 'migrating' ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              Migrating...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-download me-1"></i>
                              Migrate
                            </>
                          )}
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleVerifyBlocks}
                          disabled={migrationStatus === 'migrating' || loading}
                          title="Firebase 블록 데이터 검증"
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          Verify
                        </button>
                      </div>
                    </div>

                    {/* 마이그레이션 상태 표시 */}
                    {migrationStatus !== 'idle' && (
                      <div className="border rounded p-3 mb-3 bg-light">
                        {migrationStatus === 'migrating' && (
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <h6 className="mb-0 small">
                                <i className="bi bi-arrow-clockwise me-1"></i>
                                블록 마이그레이션 진행 중...
                              </h6>
                              <span className="small text-muted">{migrationProgress}%</span>
                            </div>
                            <div className="progress">
                              <div 
                                className="progress-bar progress-bar-striped progress-bar-animated" 
                                style={{ width: `${migrationProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {migrationStatus === 'completed' && migrationResult && (
                          <div>
                            <h6 className="mb-2 small text-success">
                              <i className="bi bi-check-circle me-1"></i>
                              마이그레이션 완료!
                            </h6>
                            <div className="small text-muted">
                              성공: {migrationResult.successCount}개 | 
                              실패: {migrationResult.errorCount}개
                            </div>
                            {migrationResult.errors && migrationResult.errors.length > 0 && (
                              <div className="mt-2">
                                <div className="small text-danger">오류:</div>
                                {migrationResult.errors.map((err, index) => (
                                  <div key={index} className="small text-danger">• {err.block}: {err.error}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {migrationStatus === 'error' && migrationResult && (
                          <div>
                            <h6 className="mb-2 small text-danger">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              마이그레이션 실패
                            </h6>
                            <div className="small text-muted">{migrationResult.error}</div>
                          </div>
                        )}
                        
                        <div className="text-end mt-2">
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setMigrationStatus('idle');
                              setMigrationProgress(0);
                              setMigrationResult(null);
                            }}
                          >
                            <i className="bi bi-x me-1"></i>
                            닫기
                          </button>
                        </div>
                      </div>
                    )}

                    {blocksLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-brand" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="mt-2 text-muted">Loading blocks...</div>
                      </div>
                    ) : (
                      <div className="vstack gap-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {Object.entries(groupBlocksByCategory(blocks)).map(([category, categoryBlocks]) => (
                          <div key={category} className="border rounded p-2">
                            <h6 className="mb-2 small fw-bold text-muted">
                              <i className={`${getCategoryIcon(category)} me-1`}></i>
                              {category} ({categoryBlocks.length})
                            </h6>
                            <div className="vstack gap-1">
                              {categoryBlocks.map(block => (
                                <div key={block.id} className="d-flex align-items-center justify-content-between p-2 border rounded">
                                  <div className="d-flex align-items-center">
                                    <i className={`${block.icon} me-2 text-muted`}></i>
                                    <span className="small">{block.name}</span>
                                    <span className="badge bg-light text-dark ms-2 small">{block.id}</span>
                                  </div>
                                  <div className="btn-group btn-group-sm" role="group">
                                    <input 
                                      type="radio" 
                                      className="btn-check" 
                                      name={`block-${block.id}`}
                                      id={`block-${block.id}-default`}
                                      checked={block.isDefaultBlock === true}
                                      onChange={() => handleBlockToggle(block.id, true)}
                                    />
                                    <label 
                                      className="btn btn-outline-success btn-sm" 
                                      htmlFor={`block-${block.id}-default`}
                                    >
                                      🔓 Default
                                    </label>
                                    
                                    <input 
                                      type="radio" 
                                      className="btn-check" 
                                      name={`block-${block.id}`}
                                      id={`block-${block.id}-qr`}
                                      checked={block.isDefaultBlock === false}
                                      onChange={() => handleBlockToggle(block.id, false)}
                                    />
                                    <label 
                                      className="btn btn-outline-warning btn-sm" 
                                      htmlFor={`block-${block.id}-qr`}
                                    >
                                      🔒 QR Required
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 우측: QR 생성 및 관리 */}
                <div className="col-lg-6">
                  <div className="panel p-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0">
                        <i className="bi bi-qr-code me-2"></i>
                        QR Code Management
                      </h6>
                      <button 
                        className="btn btn-sm btn-brand"
                        onClick={() => setShowQRForm(!showQRForm)}
                      >
                        <i className="bi bi-plus me-1"></i>
                        Create QR
                      </button>
                    </div>

                    {/* QR 생성 폼 */}
                    {showQRForm && (
                      <div className="border rounded p-3 mb-3 bg-light">
                        <h6 className="mb-2">Create New QR Code</h6>
                        <form onSubmit={handleCreateQR}>
                          <div className="mb-2">
                            <label className="form-label small">QR Name</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              placeholder="e.g. Week 1 - Logic Blocks"
                              value={qrFormData.name}
                              onChange={(e) => setQrFormData(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          
                          <div className="mb-2">
                            <label className="form-label small">Select Block</label>
                            <select 
                              className="form-select form-select-sm"
                              value={selectedBlock}
                              onChange={(e) => handleBlockSelect(e.target.value)}
                              required
                            >
                              <option value="">Select a block...</option>
                              {blocks.filter(b => !b.isDefaultBlock).map(block => (
                                <option key={block.id} value={block.id}>
                                  <i className={`${block.icon} me-1`}></i>
                                  {block.name} ({block.category})
                                </option>
                              ))}
                            </select>
                            <div className="small text-muted mt-1">
                              {selectedBlock ? `Selected: ${blocks.find(b => b.id === selectedBlock)?.name}` : 'No block selected'}
                            </div>
                          </div>

                          <div className="row g-2 mb-3">
                            <div className="col-6">
                              <label className="form-label small">Start Date</label>
                              <input 
                                type="date" 
                                className="form-control form-control-sm"
                                value={qrFormData.startDate}
                                onChange={(e) => setQrFormData(prev => ({ ...prev, startDate: e.target.value }))}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label small">End Date</label>
                              <input 
                                type="date" 
                                className="form-control form-control-sm"
                                value={qrFormData.endDate}
                                onChange={(e) => setQrFormData(prev => ({ ...prev, endDate: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="d-flex gap-2">
                            <button 
                              type="submit" 
                              className="btn btn-sm btn-brand"
                              disabled={loading || !selectedBlock}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-qr-code me-1"></i>
                                  Generate QR
                                </>
                              )}
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                setShowQRForm(false);
                                setSelectedBlock('');
                                setQrFormData({
                                  name: '',
                                  block: '',
                                  isActive: true,
                                  startDate: '',
                                  endDate: ''
                                });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* QR 코드 목록 */}
                    <div className="vstack gap-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                      {qrCodesLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-brand" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="mt-2 text-muted">Loading QR codes...</div>
                        </div>
                      ) : qrCodes.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-qr-code" style={{ fontSize: '2rem' }}></i>
                          <div className="mt-2">No QR codes found</div>
                          <div className="small">Create your first QR code using the button above</div>
                        </div>
                      ) : (
                        qrCodes.map(qrCode => (
                          <div key={qrCode.id} className="border rounded p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div>
                                <h6 className="mb-0 small fw-semibold">{qrCode.name}</h6>
                                <div className="small text-muted">
                                  1 block • {formatDate(qrCode.createdAt)}
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <div className="form-check form-switch">
                                  <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    id={`qr-active-${qrCode.id}`}
                                    checked={qrCode.isActive}
                                    onChange={(e) => handleQRToggle(qrCode.id, e.target.checked)}
                                  />
                                  <label className="form-check-label small" htmlFor={`qr-active-${qrCode.id}`}>
                                    {qrCode.isActive ? 'Active' : 'Inactive'}
                                  </label>
                                </div>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleViewQR(qrCode)}
                                  title="QR 코드 보기"
                                >
                                  <i className="bi bi-qr-code"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteQR(qrCode.id)}
                                  disabled={loading}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                            
                            <div className="small">
                              <strong>Block:</strong>
                              <div className="mt-1">
                                {(() => {
                                  const block = blocks.find(b => b.id === qrCode.block);
                                  return block ? (
                                    <span className="badge bg-light text-dark small">
                                      <i className={`${block.icon} me-1`}></i>
                                      {block.name}
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary small">
                                      {qrCode.block}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <TabBar />
      
      {/* QR 코드 보기 모달 */}
      {selectedQRCode && (
        <QRViewModal
          show={showQRViewModal}
          onHide={handleCloseQRModal}
          qrData={selectedQRCode}
          blockInfo={blocks.find(b => b.id === selectedQRCode.block)}
        />
      )}
    </>
  );
}

export default Admin;

