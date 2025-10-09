import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';

function Admin() {
  const [activeTab, setActiveTab] = useState('submissions');

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
                <form className="row g-2 align-items-end">
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Question</label>
                    <select className="form-select" name="question">
                      <option value="">All questions</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small text-muted mb-1">Status</label>
                    <select className="form-select" name="status">
                      <option value="pending">Pending</option>
                      <option value="graded">Graded</option>
                      <option value="">All</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Search</label>
                    <input type="search" className="form-control" name="q" placeholder="User, email, id…" />
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
                      <tr>
                        <td>
                          <div className="fw-semibold">#123</div>
                          <div className="small muted">2025-02-01 14:32</div>
                        </td>
                        <td>
                          <div className="fw-semibold">Sum from 1 to n</div>
                          <span className="badge badge-easy text-uppercase">easy</span>
                        </td>
                        <td>
                          <div className="fw-semibold">Student Name</div>
                          <div className="small muted">student@example.com</div>
                        </td>
                        <td>
                          <span className="badge bg-warning-subtle text-warning-emphasis">pending</span>
                        </td>
                        <td>—</td>
                        <td className="text-nowrap">
                          <button className="btn btn-sm btn-ghost">
                            <i className="bi bi-eye me-1"></i>Review
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-3 small muted">Showing 1 result</div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="tab-pane fade show active">
              <div className="row g-3">
                <div className="col-lg-5">
                  <div className="panel p-3">
                    <h6 className="mb-2">Create / Update Question</h6>
                    <form>
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
                        <button className="btn btn-brand" type="submit">
                          <i className="bi bi-save me-1"></i>Save
                        </button>
                        <button className="btn btn-ghost" type="reset">
                          <i className="bi bi-eraser me-1"></i>Clear
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="panel p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="mb-0">Existing Questions</h6>
                      <div className="small muted">Server renders list</div>
                    </div>

                    <div className="vstack gap-2">
                      <div className="border rounded-3 p-2 d-flex align-items-center justify-content-between">
                        <div className="me-2">
                          <div className="fw-semibold">
                            Sum from 1 to n <span className="small muted">(sum-1-to-n)</span>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge badge-easy text-uppercase">easy</span>
                            <span className="badge text-bg-light border">
                              <i className="bi bi-hash"></i> math
                            </span>
                            <span className="badge text-bg-light border">
                              <i className="bi bi-hash"></i> loops
                            </span>
                            <span className="badge text-bg-secondary">built-in</span>
                          </div>
                        </div>
                        <div className="text-nowrap">
                          <button className="btn btn-sm btn-ghost">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-ghost" disabled title="Built-in questions cannot be deleted">
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
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

