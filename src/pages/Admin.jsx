import React, { useState, useEffect, useCallback } from 'react';
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
  deleteQRCode,
  gradeSubmission
} from '../firebase/firestore';
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
  
  
  // QR 코드 뷰 모달 상태
  const [showQRViewModal, setShowQRViewModal] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState(null);
  
  // Review 모달 상태
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeFormData, setGradeFormData] = useState({
    status: 'pending',
    score: '',
    visibility: 'private',
    feedback: ''
  });
  const [gradingLoading, setGradingLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  // 문제 목록 및 제출물 불러오기
  useEffect(() => {
    loadQuestions();
    loadSubmissions();
  }, [loadQuestions, loadSubmissions]);

  // Blocks & QR 데이터 로딩
  useEffect(() => {
    if (activeTab === 'blocks') {
      loadBlocks();
      loadQRCodes();
    }
  }, [activeTab, loadBlocks, loadQRCodes]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQuestions();
      if (result.success) {
        setQuestions(result.data);
      } else {
        error('Failed to load question list: ' + result.error);
      }
    } catch (err) {
      error('Failed to load question list.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  // 제출물 불러오기
  const loadSubmissions = useCallback(async (filters = {}) => {
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
        error('Failed to load submission list: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
      error('Failed to load submission list.');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [error]);

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
          success('Question updated successfully.');
          setEditingQuestion(null);
        }
      } else {
        result = await addQuestion(questionData);
        if (result.success) {
          success('Question created successfully.');
        }
      }

      if (result.success) {
        await loadQuestions();
        e.target.reset();
      } else {
        error('Failed to save question: ' + result.error);
      }
    } catch (err) {
      error('Failed to save question.');
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
      error('Built-in questions cannot be deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        success('Question deleted successfully.');
        await loadQuestions();
      } else {
        error('Failed to delete question: ' + result.error);
      }
    } catch (err) {
      error('Failed to delete question.');
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
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== 블록 관리 함수들 ====================

  // 블록 목록 불러오기
  const loadBlocks = useCallback(async () => {
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
        error('Failed to load block list: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error loading blocks:', err);
      error('Failed to load block list.');
    } finally {
      setBlocksLoading(false);
    }
  }, [error]);

  // 블록 설정 업데이트
  const handleBlockToggle = async (blockId, isDefaultBlock) => {
    try {
      const result = await updateBlockSettings(blockId, { isDefaultBlock });
      if (result.success) {
        // 로컬 상태 업데이트
        setBlocks(prev => prev.map(block => 
          block.id === blockId ? { ...block, isDefaultBlock } : block
        ));
        success('Block settings updated successfully.');
      } else {
        error('Failed to update block settings: ' + result.error);
      }
    } catch (err) {
      error('Failed to update block settings.');
    }
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

  const loadQRCodes = useCallback(async () => {
    try {
      const result = await getQRCodes();
      if (result.success) {
        setQrCodes(result.data);
      } else {
        error('Failed to load QR code list: ' + result.error);
      }
    } catch (err) {
      error('Failed to load QR code list.');
    } finally {
      setQrCodesLoading(false);
    }
  }, [error]);

  // 문제 목록 및 제출물 불러오기
  useEffect(() => {
    loadQuestions();
    loadSubmissions();
  }, [loadQuestions, loadSubmissions]);

  // Blocks & QR 데이터 로딩
  useEffect(() => {
    if (activeTab === 'blocks') {
      loadBlocks();
      loadQRCodes();
    }
  }, [activeTab, loadBlocks, loadQRCodes]);
  const handleCreateQR = async (e) => {
    e.preventDefault();
    
    if (!qrFormData.block) {
      error('Please select a block.');
      return;
    }

    setLoading(true);
    try {
      const result = await createQRCode({
        ...qrFormData,
        createdBy: currentUser.uid
      });
      
      if (result.success) {
        success('QR code created successfully!');
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
        error('Failed to create QR code: ' + result.error);
      }
    } catch (err) {
      error('Failed to create QR code.');
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
        success(`QR code ${isActive ? 'activated' : 'deactivated'} successfully.`);
      } else {
        error('Failed to change QR code status: ' + result.error);
      }
    } catch (err) {
      error('Failed to change QR code status.');
    }
  };

  // QR 코드 삭제
  const handleDeleteQR = async (qrCodeId) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteQRCode(qrCodeId);
      if (result.success) {
        success('QR code deleted successfully.');
        await loadQRCodes();
      } else {
        error('Failed to delete QR code: ' + result.error);
      }
    } catch (err) {
      error('Failed to delete QR code.');
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

  // Review 모달 열기
  const handleOpenReview = (submission) => {
    setSelectedSubmission(submission);
    setGradeFormData({
      status: submission.status || 'pending',
      score: submission.score || '',
      visibility: 'private',
      feedback: submission.feedback || ''
    });
    setShowReviewModal(true);
  };

  // Review 모달 닫기
  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
    setGradeFormData({
      status: 'pending',
      score: '',
      visibility: 'private',
      feedback: ''
    });
  };

  // 채점 제출
  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setGradingLoading(true);
    try {
      const gradeData = {
        grade: gradeFormData.score >= 80 ? 'Accepted' : gradeFormData.score >= 60 ? 'Needs Work' : 'Rejected',
        score: parseInt(gradeFormData.score) || 0,
        feedback: gradeFormData.feedback,
        status: gradeFormData.status
      };

      const result = await gradeSubmission(selectedSubmission.id, gradeData);
      
      if (result.success) {
        success('Grading completed successfully.');
        await loadSubmissions();
        handleCloseReviewModal();
      } else {
        error('Failed to save grading: ' + result.error);
      }
    } catch (err) {
      error('An error occurred during grading.');
    } finally {
      setGradingLoading(false);
    }
  };

  // 채점 액션 버튼 핸들러
  const handleGradeAction = (action) => {
    if (action === 'graded') {
      setGradeFormData(prev => ({ ...prev, status: 'graded' }));
    } else if (action === 'needs_revision') {
      setGradeFormData(prev => ({ ...prev, status: 'needs_revision' }));
    }
  };


  return (
    <>
      <AppBar title="BlockHunt" />
      
      <main>
        <div className="page-head">
          <div>
            <div className="kicker">Admin</div>
            <h1 className="title">Review &amp; Manage</h1>
          </div>
          <div className="tabs" role="tablist" aria-label="Admin Tabs">
            <button 
              className="tab-btn" 
              data-target="pane-subs" 
              data-active={activeTab === 'submissions' ? 'true' : 'false'}
              role="tab" 
              aria-controls="pane-subs" 
              aria-selected={activeTab === 'submissions'}
              onClick={() => setActiveTab('submissions')}
            >
              <i className="bi bi-inbox me-1"></i> Submissions
            </button>
            <button 
              className="tab-btn" 
              data-target="pane-questions" 
              data-active={activeTab === 'questions' ? 'true' : 'false'}
              role="tab" 
              aria-controls="pane-questions" 
              aria-selected={activeTab === 'questions'}
              onClick={() => setActiveTab('questions')}
            >
              <i className="bi bi-journal-text me-1"></i> Questions
            </button>
            <button 
              className="tab-btn" 
              data-target="pane-blocks" 
              data-active={activeTab === 'blocks' ? 'true' : 'false'}
              role="tab" 
              aria-controls="pane-blocks" 
              aria-selected={activeTab === 'blocks'}
              onClick={() => setActiveTab('blocks')}
            >
              <i className="bi bi-boxes me-1"></i> Blocks &amp; QR
            </button>
          </div>
        </div>

        {activeTab === 'submissions' && (
          <section id="pane-subs" role="tabpanel" aria-labelledby="tab-subs">
            <div className="panel">
              <div className="section">
                <form className="filters" onSubmit={handleApplyFilters}>
                  <div>
                    <label className="label small">Question</label>
                    <select 
                      className="select w-100" 
                      value={filterQuestion}
                      onChange={(e) => setFilterQuestion(e.target.value)}
                      aria-label="Filter by question"
                    >
                      <option value="">All questions</option>
                      {questions.map(q => (
                        <option key={q.id} value={q.id}>{q.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label small">Status</label>
                    <select 
                      className="select w-100" 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      aria-label="Filter by status"
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="graded">Graded</option>
                    </select>
                  </div>
                  <div>
                    <label className="label small">Search</label>
                    <input 
                      type="search" 
                      className="input w-100" 
                      placeholder="User, email, id…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search submissions"
                    />
                  </div>
                  <div className="text-end">
                    <button className="btn-brand" type="submit">
                      <i className="bi bi-funnel me-1"></i>Apply Filters
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="panel">
              <div className="section" style={{ paddingTop: '.5rem' }}>
                <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
                  <table className="data" aria-label="Submissions">
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
                            <div className="spinner"></div>
                            <div className="mt-2 muted">Loading submissions...</div>
                          </td>
                        </tr>
                      ) : filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 muted">
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
                                    ? 'badge-warning'
                                    : submission.status === 'graded'
                                    ? 'badge-success'
                                    : 'badge-secondary'
                                }`}>
                                  {submission.status}
                                </span>
                              </td>
                              <td>
                                {submission.grade ? (
                                  <div>
                                    <span className={`badge ${
                                      submission.grade === 'Accepted' 
                                        ? 'badge-success'
                                        : submission.grade === 'Needs Work'
                                        ? 'badge-warning'
                                        : 'badge-danger'
                                    }`}>
                                      {submission.grade}
                                    </span>
                                    {submission.score !== undefined && (
                                      <div className="small muted mt-1">{submission.score} points</div>
                                    )}
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="text-nowrap">
                                <button 
                                  className="btn-ghost sm"
                                  onClick={() => handleOpenReview(submission)}
                                >
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
              </div>
            </div>
          </section>
        )}

        {activeTab === 'questions' && (
          <section id="pane-questions" role="tabpanel" aria-labelledby="tab-questions">
            <div className="q-grid">
              <div className="panel">
                <div className="section">
                  <h6 className="title" style={{ fontWeight: '900', margin: '0 0 .6rem' }}>
                    {editingQuestion ? 'Update Question' : 'Create / Update Question'}
                  </h6>
                  <form id="questionForm" onSubmit={handleSubmit} className="vstack" style={{ gap: '.75rem' }}>
                    <div className="field">
                      <label className="label">ID (unique, URL-friendly)</label>
                      <input className="input" name="id" placeholder="e.g. sum-1-to-n" required />
                    </div>
                    <div className="field">
                      <label className="label">Title</label>
                      <input className="input" name="title" placeholder="e.g. Sum from 1 to n" required />
                    </div>
                    <div style={{ display: 'grid', gap: '.6rem', gridTemplateColumns: '1fr', alignItems: 'start' }}>
                      <div className="field">
                        <label className="label">Difficulty</label>
                        <select className="select" name="difficulty">
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="label">Tags (comma separated)</label>
                        <input className="input" name="tags" placeholder="math, loops" />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label">Question Body (supports HTML)</label>
                      <textarea className="input" name="body" rows="6" placeholder="Write the prompt here…"></textarea>
                    </div>
                    <br />
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-start' }}>
                      <button 
                        className="btn-brand" 
                        type="submit" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner"></span>
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
                          className="btn-ghost" 
                          type="button"
                          onClick={handleCancelEdit}
                        >
                          <i className="bi bi-x-circle me-1"></i>Cancel
                        </button>
                      ) : (
                        <button className="btn-ghost" type="reset">
                          <i className="bi bi-eraser me-1"></i>Clear
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              <div className="panel">
                <div className="section">
                  <div className="d-flex align-items-center justify-content-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                    <h6 className="title" style={{ fontWeight: '900', margin: 0 }}>Existing Questions</h6>
                    <div className="small muted">
                      {loading ? (
                        <span className="spinner"></span>
                      ) : (
                        `${questions.length} questions`
                      )}
                    </div>
                  </div>

                  <div className="vstack" style={{ display: 'grid', gap: '.6rem' }}>
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="spinner"></div>
                        <div className="mt-2 muted">Loading questions...</div>
                      </div>
                    ) : questions.length === 0 ? (
                      <div className="text-center py-4 muted">
                        <i className="bi bi-journal-text" style={{ fontSize: '2rem' }}></i>
                        <div className="mt-2">No questions found</div>
                        <div className="small">Create your first question using the form on the left</div>
                      </div>
                    ) : (
                      questions.map((question) => (
                        <div key={question.id} className="border rounded-3 p-2 d-flex align-items-center justify-content-between" style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '.7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                          <div className="me-2" style={{ marginRight: '.75rem' }}>
                            <div className="fw-semibold">
                              {question.title} <span className="small muted">({question.id})</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.25rem' }}>
                              <span className={`badge text-uppercase ${
                                question.difficulty === 'easy' ? 'badge-easy' :
                                question.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                              }`}>
                                {question.difficulty}
                              </span>
                              {question.tags && question.tags.map((tag, index) => (
                                <span key={index} className="badge text-bg-light border" style={{ border: '1px solid var(--line)' }}>
                                  <i className="bi bi-hash"></i> {tag}
                                </span>
                              ))}
                              <span className={`badge ${
                                question.isBuiltIn ? 'text-bg-secondary' : 'text-bg-warning'
                              }`} style={question.isBuiltIn ? { background: '#f3f4ff', border: '1px solid #e5e7ff', color: '#3a3d4f' } : { background: '#fff5e6', border: '1px solid #ffe0a6', color: '#7a4a03' }}>
                                {question.isBuiltIn ? 'built-in' : 'custom'}
                              </span>
                            </div>
                          </div>
                          <div className="text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                            <button 
                              className="btn-ghost sm"
                              onClick={() => handleEdit(question)}
                              title="Edit question"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn-ghost sm" 
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
          </section>
        )}

        {activeTab === 'blocks' && (
          <section id="pane-blocks" role="tabpanel" aria-labelledby="tab-blocks">
              <div className="row g-3">
                {/* 좌측: 블록 관리 */}
                <div className="col-lg-7">
                  <div className="panel p-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h6 className="mb-0">
                          <i className="bi bi-puzzle me-2"></i>
                          Block Management
                        </h6>
                        <div className="small text-muted mt-1" style={{ maxWidth: '400px', lineHeight: '1.4' }}>
                          <i className="bi bi-info-circle me-1"></i>
                          Default: Available to all users. QR Required: Must be collected via QR scan.
                        </div>
                      </div>
                      <div className="small text-muted">
                        {blocksLoading ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        ) : (
                          <>
                            {blocks.length} blocks
                            {blocks.length > 0 && (
                              <span className="ms-2">
                                (<span className="text-success">🔓 {blocks.filter(b => b.isDefaultBlock === true).length}</span>
                                {' / '}
                                <span className="text-warning">🔒 {blocks.filter(b => b.isDefaultBlock === false).length}</span>)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

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
                                <div key={block.id} className="d-flex align-items-center justify-content-between p-2 border rounded" style={{ gap: '0.5rem' }}>
                                  <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
                                    <i className={`${block.icon} me-2 text-muted`}></i>
                                    <span className="small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.name}</span>
                                    <span className="badge bg-light text-dark ms-2 small" style={{ flexShrink: 0 }}>{block.id}</span>
                                  </div>
                                  <div className="btn-group btn-group-sm" role="group" style={{ minWidth: '180px', flexShrink: 0 }}>
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
                                      style={{ minWidth: '85px' }}
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
                                      style={{ minWidth: '95px' }}
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
                <div className="col-lg-5">
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
          </section>
        )}
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

      {/* Review 모달 */}
      {showReviewModal && selectedSubmission && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseReviewModal();
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content review-modal">
              <form onSubmit={handleGradeSubmit} id="gradeForm">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Grade Submission #{selectedSubmission.id.substring(0, 8)}
                    </h5>
                    <div className="small muted">Programming · Manual grading</div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={handleCloseReviewModal}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="small muted">Question</div>
                      <div className="fw-semibold">
                        {getQuestionInfo(selectedSubmission.questionId)?.title || selectedSubmission.questionId}
                        {getQuestionInfo(selectedSubmission.questionId) && (
                          <span className="small muted"> ({selectedSubmission.questionId})</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="small muted">User</div>
                      <div className="fw-semibold">
                        {selectedSubmission.userInfo?.displayName || 'Unknown User'}
                        <span className="small muted"> {selectedSubmission.userInfo?.email || selectedSubmission.userId}</span>
                      </div>
                    </div>

                    <div className="col-12"><hr className="my-2" /></div>

                    {/* Submitted code */}
                    <div className="col-12">
                      <div className="small muted mb-1">Submitted Code</div>
                      <pre className="code-box mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedSubmission.code || '(no code submitted)'}
                      </pre>
                    </div>

                    <div className="col-12"><hr className="my-2" /></div>

                    {/* Grading panel */}
                    <div className="col-md-4">
                      <label className="label small">Status</label>
                      <select 
                        className="select w-100" 
                        name="status" 
                        id="gradeStatus"
                        value={gradeFormData.status}
                        onChange={(e) => setGradeFormData(prev => ({ ...prev, status: e.target.value }))}
                        aria-label="Grading status"
                      >
                        <option value="pending">Pending</option>
                        <option value="graded">Graded</option>
                        <option value="needs_revision">Needs revision</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="label small">Score</label>
                      <div className="input-group">
                        <input 
                          type="number" 
                          className="input" 
                          name="score" 
                          id="gradeScore"
                          min="0" 
                          max="100" 
                          step="1" 
                          placeholder="0–100"
                          value={gradeFormData.score}
                          onChange={(e) => setGradeFormData(prev => ({ ...prev, score: e.target.value }))}
                          aria-label="Score (0 to 100)"
                        />
                        <span className="input-group-text">/100</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="label small">Visibility</label>
                      <select 
                        className="select w-100" 
                        name="visibility"
                        value={gradeFormData.visibility}
                        onChange={(e) => setGradeFormData(prev => ({ ...prev, visibility: e.target.value }))}
                        aria-label="Visibility"
                      >
                        <option value="student">Share with student</option>
                        <option value="private">Private (admin only)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="label small">Feedback to Student (optional)</label>
                      <br />
                      <textarea 
                        className="input" 
                        name="feedback" 
                        rows="5" 
                        placeholder="Explain what was correct/incorrect, suggestions for improvement…"
                        value={gradeFormData.feedback}
                        onChange={(e) => setGradeFormData(prev => ({ ...prev, feedback: e.target.value }))}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn-ghost" 
                    onClick={handleCloseReviewModal}
                    disabled={gradingLoading}
                  >
                    Close
                  </button>
                  <button 
                    type="submit" 
                    className="btn-brand" 
                    id="btnSave"
                    disabled={gradingLoading}
                  >
                    {gradingLoading ? (
                      <>
                        <span className="spinner"></span> Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn-brand" 
                    id="btnMarkGraded"
                    onClick={() => {
                      handleGradeAction('graded');
                      setTimeout(() => {
                        document.getElementById('gradeForm').requestSubmit();
                      }, 100);
                    }}
                    disabled={gradingLoading}
                  >
                    Mark as Graded
                  </button>
                  <button 
                    type="button" 
                    className="btn-ghost" 
                    id="btnRequestRev"
                    onClick={() => {
                      handleGradeAction('needs_revision');
                      setTimeout(() => {
                        document.getElementById('gradeForm').requestSubmit();
                      }, 100);
                    }}
                    disabled={gradingLoading}
                  >
                    Request Revision
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Admin;

