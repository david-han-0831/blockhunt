import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import { useAuth } from '../contexts/AuthContext';
import { saveSubmission, getBlocks, getUserProfile } from '../firebase/firestore';
import { downloadMissingBlocks } from '../utils/testBlockSvgExport';

const LS_KEY = 'BlockHunt_workspace_v2';

// Toolbox XML builder - dynamically builds based on collected blocks and default blocks
const buildToolbox = (collectedBlocks = [], allBlocks = []) => {
  // Create a map of collected block IDs for quick lookup
  const collectedSet = new Set(collectedBlocks);
  
  // Filter blocks:
  // - Default blocks (isDefaultBlock === true): Always available
  // - QR Required blocks (isDefaultBlock === false): Only if collected
  const availableBlocks = allBlocks.filter(block => {
    if (block.isDefaultBlock === true) {
      // Default blocks are always available
      return true;
    } else {
      // QR Required blocks are only available if collected
      return collectedSet.has(block.id);
    }
  });
  
  // If no blocks available, return empty toolbox with only Variables and Functions
  if (availableBlocks.length === 0) {
    return `
<xml id="toolbox" style="display:none">
  <category name="Variables" custom="VARIABLE" colour="#A65C81"></category>
  <category name="Functions" custom="PROCEDURE" colour="#5CA65C"></category>
</xml>`;
  }
  
  // Group blocks by category
  const blocksByCategory = {};
  availableBlocks.forEach(block => {
    const category = block.category || 'Other';
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  });

  // Category color mapping
  const categoryColors = {
    'Logic': '#5CA65C',
    'Loops': '#F59E0B',
    'Math': '#5C68A6',
    'Text': '#8B5CF6',
    'Lists': '#06B6D4',
    'Variables': '#22C55E',
    'Functions': '#10B981',
    'Other': '#9CA3AF'
  };

  // Build category XML
  let categoriesXML = '';
  Object.keys(blocksByCategory).sort().forEach(category => {
    const blocks = blocksByCategory[category];
    const color = categoryColors[category] || categoryColors['Other'];
    
    categoriesXML += `  <category name="${category}" colour="${color}">\n`;
    
    blocks.forEach(block => {
      const blockType = block.blockType || block.id;
      // Add block with appropriate shadow values if needed
      if (blockType === 'controls_repeat_ext') {
        categoriesXML += `    <block type="${blockType}">\n`;
        categoriesXML += `      <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>\n`;
        categoriesXML += `    </block>\n`;
      } else if (blockType === 'controls_for') {
        categoriesXML += `    <block type="${blockType}">\n`;
        categoriesXML += `      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n`;
        categoriesXML += `      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>\n`;
        categoriesXML += `      <value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n`;
        categoriesXML += `    </block>\n`;
      } else if (blockType === 'math_random_int') {
        categoriesXML += `    <block type="${blockType}">\n`;
        categoriesXML += `      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n`;
        categoriesXML += `      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>\n`;
        categoriesXML += `    </block>\n`;
      } else if (blockType === 'math_number') {
        categoriesXML += `    <block type="${blockType}"><field name="NUM">0</field></block>\n`;
      } else if (blockType === 'math_change') {
        categoriesXML += `    <block type="${blockType}">\n`;
        categoriesXML += `      <value name="DELTA"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n`;
        categoriesXML += `    </block>\n`;
      } else if (blockType === 'lists_repeat') {
        categoriesXML += `    <block type="${blockType}">\n`;
        categoriesXML += `      <value name="NUM"><shadow type="math_number"><field name="NUM">5</field></shadow></value>\n`;
        categoriesXML += `    </block>\n`;
      } else if (blockType === 'lists_create_with') {
        categoriesXML += `    <block type="${blockType}"></block>\n`;
        categoriesXML += `    <block type="${blockType}"><mutation items="0"></mutation></block>\n`;
      } else {
        categoriesXML += `    <block type="${blockType}"></block>\n`;
      }
    });
    
    categoriesXML += `  </category>\n`;
  });

  // Always include Variables and Functions
  categoriesXML += `  <category name="Variables" custom="VARIABLE" colour="#22C55E"></category>\n`;
  categoriesXML += `  <category name="Functions" custom="PROCEDURE" colour="#10B981"></category>\n`;

  return `
<xml id="toolbox" style="display:none">
${categoriesXML}</xml>`;
};

// Initial seed workspace
const seedWorkspace = (workspace) => {
  const seedState = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'text_print',
          x: 30,
          y: 30,
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'Hello BlockHunt!' }
              }
            }
          }
        }
      ]
    }
  };
  window.Blockly.serialization.workspaces.load(seedState, workspace);
};

function Studio() {
  const { currentUser } = useAuth();
  const blocklyAreaRef = useRef(null);
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const pyodideRef = useRef(null);
  
  const [pyCode, setPyCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('(no output)');
  const [questionText, setQuestionText] = useState(
    'Write a program that reads an integer <em>n</em> and prints the sum of all integers from 1 to <em>n</em>. If <em>n</em> is negative, print <code>0</code>. For example, input <code>5</code> should output <code>15</code>. You may assume input is a single line with a valid integer.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectedBlocks, setCollectedBlocks] = useState([]);
  const [allBlocks, setAllBlocks] = useState([]);
  const [blocksLoaded, setBlocksLoaded] = useState(false);

  // Load blocks from API
  useEffect(() => {
    const loadBlocksData = async () => {
      if (!currentUser) {
        console.log('⚠️ No current user, skipping block load');
        setBlocksLoaded(true);
        return;
      }

      try {
        console.log('🔄 Loading blocks for Studio...');
        
        // Load all blocks catalog
        const blocksResult = await getBlocks();
        if (blocksResult.success) {
          console.log('📦 Blocks loaded:', blocksResult.data.length);
          setAllBlocks(blocksResult.data);
        } else {
          console.warn('⚠️ Failed to load blocks:', blocksResult.error);
        }

        // Load user's collected blocks
        const userResult = await getUserProfile(currentUser.uid);
        if (userResult.success) {
          const collected = userResult.data.collectedBlocks || [];
          console.log('📦 Collected blocks:', collected.length);
          setCollectedBlocks(collected);
        } else {
          console.warn('⚠️ Failed to load user profile:', userResult.error);
        }
      } catch (err) {
        console.error('❌ Error loading blocks:', err);
      } finally {
        setBlocksLoaded(true);
      }
    };

    loadBlocksData();
  }, [currentUser]);

  // Initialize Blockly
  useEffect(() => {
    // Wait for blocks to be loaded
    if (!blocksLoaded) {
      return;
    }

    // Load saved question
    const saved = localStorage.getItem('BlockHunt_current_question');
    if (saved) {
      try {
        const q = JSON.parse(saved);
        setQuestionText(q.body || questionText);
      } catch (e) {
        console.error('Failed to load question:', e);
      }
    }

    // Wait for Blockly to be available
    if (!window.Blockly) {
      console.error('Blockly not loaded');
      return;
    }

    const area = blocklyAreaRef.current;
    const div = blocklyDivRef.current;

    if (!area || !div) return;

    // Resize handler
    const onResize = () => {
      const rect = area.getBoundingClientRect();
      div.style.width = rect.width + 'px';
      div.style.height = rect.height + 'px';
      if (workspaceRef.current) {
        window.Blockly.svgResize(workspaceRef.current);
      }
    };

    window.addEventListener('resize', onResize);

    // Parse toolbox with collected blocks
    const parser = new DOMParser();
    const toolboxXML = buildToolbox(collectedBlocks, allBlocks);
    const toolboxDom = parser.parseFromString(toolboxXML, 'text/xml').documentElement;

    // Initialize workspace
    workspaceRef.current = window.Blockly.inject(div, {
      toolbox: toolboxDom,
      trashcan: true,
      renderer: 'zelos',
      zoom: { controls: true, wheel: true }
    });

    // 전역 함수로 등록: 누락된 3개 블록 SVG 다운로드
    // 브라우저 콘솔에서 downloadMissingBlocks() 호출 가능
    if (typeof window !== 'undefined' && !window.downloadMissingBlocks) {
      // workspace ref를 전역으로 노출 (downloadMissingBlocks에서 사용)
      window.workspaceRef = workspaceRef;
      
      window.downloadMissingBlocks = downloadMissingBlocks;
      console.log('✅ SVG 다운로드 함수 등록 완료!');
      console.log('사용 방법: 브라우저 콘솔에서 downloadMissingBlocks() 실행');
    }

    onResize();

    // Restore saved state or seed initial blocks
    const savedWorkspace = localStorage.getItem(LS_KEY);
    if (savedWorkspace) {
      try {
        window.Blockly.serialization.workspaces.load(
          JSON.parse(savedWorkspace),
          workspaceRef.current
        );
      } catch (e) {
        console.warn('Failed to load saved workspace:', e);
        seedWorkspace(workspaceRef.current);
      }
    } else {
      seedWorkspace(workspaceRef.current);
    }

    // Auto-update Python code on workspace change
    workspaceRef.current.addChangeListener(() => {
      const code = getPython();
      setPyCode(code);
    });

    // Initial code generation
    setPyCode(getPython());

    return () => {
      window.removeEventListener('resize', onResize);
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
    };
  }, [blocksLoaded, collectedBlocks, allBlocks, questionText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get Python code from Blockly workspace
  const getPython = () => {
    if (!workspaceRef.current) return '';
    const gen = window.Blockly.Python || window.Blockly['Python'];
    if (!gen) {
      console.error('Blockly Python generator not loaded');
      return '';
    }
    return gen.workspaceToCode(workspaceRef.current);
  };

  // Initialize Pyodide
  const bootPyodide = async () => {
    if (pyodideRef.current) return pyodideRef.current;
    
    if (!window.loadPyodide) {
      throw new Error('Pyodide not loaded');
    }
    
    setConsoleOutput('Loading Python environment...');
    pyodideRef.current = await window.loadPyodide();
    return pyodideRef.current;
  };

  // Run Python code with Pyodide
  const runPython = async (code) => {
    try {
      const py = await bootPyodide();
      let output = '';
      
      py.setStdout({ batched: (s) => { output += s; } });
      py.setStderr({ batched: (s) => { output += s; } });
      
      await py.runPythonAsync(code);
      return output;
    } catch (e) {
      return `\n[Error] ${e.message}`;
    }
  };

  // Toast notification
  const showToast = (msg) => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 rounded-3 text-white';
    toast.style.background = 'rgba(15,23,42,.9)';
    toast.style.zIndex = '2000';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1400);
  };

  // Action handlers
  const handleSave = () => {
    if (!workspaceRef.current) return;
    const state = window.Blockly.serialization.workspaces.save(workspaceRef.current);
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    showToast('Saved locally.');
  };

  const handleRun = async () => {
    const code = getPython();
    if (!code) {
      setConsoleOutput('(no code to run)');
      return;
    }
    
    setPyCode(code);
    setConsoleOutput('Running...');
    
    const output = await runPython(code);
    setConsoleOutput(output || '(no output)');
  };

  const handleDownload = () => {
    const code = getPython();
    if (!code) return;
    
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solution.py';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Reset workspace to initial state
  const resetWorkspace = () => {
    if (!workspaceRef.current) return;
    
    // 1. Blockly 워크스페이스를 초기 상태로 되돌리기
    seedWorkspace(workspaceRef.current);
    
    // 2. Python 코드 초기화
    setPyCode('');
    
    // 3. 콘솔 출력 초기화
    setConsoleOutput('(no output)');
    
    // 4. localStorage의 워크스페이스 저장 데이터를 초기 상태로 저장
    const seedState = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'text_print',
            x: 30,
            y: 30,
            inputs: {
              TEXT: {
                shadow: {
                  type: 'text',
                  fields: { TEXT: 'Hello BlockHunt!' }
                }
              }
            }
          }
        ]
      }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(seedState));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      showToast('Login required.');
      return;
    }

    if (!workspaceRef.current) {
      showToast('Workspace is not initialized.');
      return;
    }

    const code = getPython();
    if (!code || code.trim() === '') {
      showToast('No code to submit.');
      return;
    }

    // localStorage에서 현재 문제 ID 가져오기
    let questionId = 'default-question';
    try {
      const saved = localStorage.getItem('BlockHunt_current_question');
      if (saved) {
        const q = JSON.parse(saved);
        questionId = q.id || 'default-question';
      }
    } catch (e) {
      console.error('Failed to load question ID:', e);
    }

    setIsSubmitting(true);

    try {
      const state = window.Blockly.serialization.workspaces.save(workspaceRef.current);
      
      const result = await saveSubmission(currentUser.uid, questionId, {
        code: code,
        workspaceState: state
      });

      if (result.success) {
        showToast('✅ Submission completed!');
        console.log('[Submit] Submission ID:', result.id);
        
        // 서밋 성공 후 화면 초기화
        resetWorkspace();
      } else {
        showToast('❌ Submission failed: ' + (result.error || 'Unknown error'));
        console.error('[Submit] Error:', result.error);
      }
    } catch (error) {
      showToast('❌ Error occurred during submission');
      console.error('[Submit] Exception:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // body에 studio 클래스 추가/제거
  useEffect(() => {
    document.body.classList.add('studio');
    return () => {
      document.body.classList.remove('studio');
    };
  }, []);

  return (
    <>
      <AppBar title="BlockHunt" />
      
      <main className="wrap" aria-live="polite">
        <section className="panel panel--q" aria-label="Programming question">
          <div className="q-header">
            <div className="q-left">
              <div className="kicker">Programming Question</div>
              <p className="question-text" dangerouslySetInnerHTML={{ __html: questionText }} />
            </div>
            <div className="q-actions">
              <button className="btn-ghost" onClick={handleSave}>
                <i className="bi bi-save"></i> Save
              </button>
              <button 
                className="btn-ghost" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span> Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload"></i> Submit
                  </>
                )}
              </button>
              <button className="btn-ghost" onClick={handleDownload}>
                <i className="bi bi-download"></i> Download .py
              </button>
              <button className="btn-solve" onClick={handleRun}>
                <i className="bi bi-play-fill"></i> Run
              </button>
            </div>
          </div>
        </section>

        <div className="studio-grid">
          <section className="panel" aria-label="Workspace" style={{ padding: '16px' }}>
            <h6 className="title" style={{ fontSize: '1rem', margin: '0 0 10px' }}>Workspace</h6>
            <div id="blocklyArea" ref={blocklyAreaRef}>
              <div id="blocklyDiv" ref={blocklyDivRef}></div>
            </div>
          </section>

          <section className="panel panel--right" aria-label="Outputs" style={{ padding: '16px' }}>
            <h6 className="title" style={{ fontSize: '1rem', margin: '0 0 10px' }}>Console Output</h6>
            <pre id="console" className="console" role="log" aria-live="polite">
              {consoleOutput}
            </pre>

            <h6 className="title" style={{ fontSize: '1rem', margin: '20px 0 10px' }}>Generated Python</h6>
            <pre id="pyCode" className="code">
              {pyCode || '(empty)'}
            </pre>
          </section>
        </div>
      </main>

      <button className="fab" onClick={handleRun} aria-label="Run">
        <i className="bi bi-play-fill"></i>
        <span className="fab-label">Run</span>
      </button>

      <Link to="/admin" className="d-inline-flex">
        <button className="fab fab-secondary fab--sm" aria-label="Open Admin">
          <i className="bi bi-shield-lock"></i>
          <span className="fab-label">Admin</span>
        </button>
      </Link>

      <TabBar />
    </>
  );
}

export default Studio;
