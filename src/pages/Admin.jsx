import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import { useAuth } from '../contexts/AuthContext';
import { 
  getQuestions, 
  addQuestion, 
  updateQuestion, 
  deleteQuestion,
  getAllSubmissions,
  getUserProfile 
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
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  // 문제 목록 및 제출물 불러오기
  useEffect(() => {
    loadQuestions();
    loadSubmissions();
  }, []);

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
        </div>
      </main>

      <TabBar />
    </>
  );
}

export default Admin;

