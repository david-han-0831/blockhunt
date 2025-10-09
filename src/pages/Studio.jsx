import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';

const LS_KEY = 'BlockHunt_workspace_v2';

// Toolbox XML for Blockly
const buildToolbox = () => {
  return `
<xml id="toolbox" style="display:none">
  <category name="Logic" colour="#5CA65C">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
    <block type="logic_null"></block>
    <block type="logic_ternary"></block>
  </category>

  <category name="Loops" colour="#5CA65C">
    <block type="controls_repeat_ext">
      <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="controls_whileUntil"></block>
    <block type="controls_for">
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
      <value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="controls_forEach"></block>
    <block type="controls_flow_statements"></block>
  </category>

  <category name="Math" colour="#5C68A6">
    <block type="math_number"><field name="NUM">0</field></block>
    <block type="math_arithmetic"></block>
    <block type="math_single"></block>
    <block type="math_trig"></block>
    <block type="math_constant"></block>
    <block type="math_number_property"></block>
    <block type="math_change">
      <value name="DELTA"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_round"></block>
    <block type="math_modulo"></block>
    <block type="math_random_int">
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="math_random_float"></block>
  </category>

  <category name="Text" colour="#5CA699">
    <block type="text"></block>
    <block type="text_join"></block>
    <block type="text_length"></block>
    <block type="text_isEmpty"></block>
    <block type="text_indexOf"></block>
    <block type="text_charAt"></block>
    <block type="text_getSubstring"></block>
    <block type="text_changeCase"></block>
    <block type="text_trim"></block>
    <block type="text_print"></block>
  </category>

  <category name="Lists" colour="#745CA6">
    <block type="lists_create_with"></block>
    <block type="lists_create_with"><mutation items="0"></mutation></block>
    <block type="lists_repeat">
      <value name="NUM"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
    </block>
    <block type="lists_length"></block>
    <block type="lists_isEmpty"></block>
    <block type="lists_indexOf"></block>
    <block type="lists_getIndex"></block>
    <block type="lists_setIndex"></block>
    <block type="lists_getSublist"></block>
    <block type="lists_split"></block>
    <block type="lists_sort"></block>
  </category>

  <category name="Variables" custom="VARIABLE" colour="#A65C81"></category>
  <category name="Functions" custom="PROCEDURE" colour="#5CA65C"></category>
</xml>`;
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
  const blocklyAreaRef = useRef(null);
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const pyodideRef = useRef(null);
  
  const [pyCode, setPyCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('(no output)');
  const [questionText, setQuestionText] = useState(
    'Write a program that reads an integer <em>n</em> and prints the sum of all integers from 1 to <em>n</em>. If <em>n</em> is negative, print <code>0</code>. For example, input <code>5</code> should output <code>15</code>. You may assume input is a single line with a valid integer.'
  );

  // Initialize Blockly
  useEffect(() => {
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

    // Parse toolbox
    const parser = new DOMParser();
    const toolboxDom = parser.parseFromString(buildToolbox(), 'text/xml').documentElement;

    // Initialize workspace
    workspaceRef.current = window.Blockly.inject(div, {
      toolbox: toolboxDom,
      trashcan: true,
      renderer: 'zelos',
      zoom: { controls: true, wheel: true }
    });

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
  }, []);

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

  const handleSubmit = () => {
    const code = getPython();
    const state = window.Blockly.serialization.workspaces.save(workspaceRef.current);
    console.log('[Submit] code:', code);
    console.log('[Submit] state:', state);
    showToast('Submitted! (demo)');
  };

  return (
    <>
      <Navbar />
      <AppBar title="BlockHunt" />
      
      <main className="container py-4">
        <div className="actionbar">
          <div className="container py-2 d-flex flex-wrap gap-2 justify-content-end">
            <button className="btn btn-ghost" onClick={handleSave}>
              <i className="bi bi-save me-1"></i>Save
            </button>
            <button className="btn btn-ghost" onClick={handleSubmit}>
              <i className="bi bi-upload me-1"></i>Submit
            </button>
            <button className="btn btn-ghost" onClick={handleDownload}>
              <i className="bi bi-download me-1"></i>Download .py
            </button>
            <button className="btn btn-brand" onClick={handleRun}>
              <i className="bi bi-play-fill me-1"></i>Run
            </button>
          </div>
        </div>

        <div className="panel p-3 mb-3">
          <div className="small text-uppercase text-muted fw-bold">Programming Question</div>
          <div dangerouslySetInnerHTML={{ __html: questionText }} className="fw-semibold" />
        </div>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="panel p-3">
              <h6 className="panel-title mb-2">Workspace</h6>
              <div id="blocklyArea" ref={blocklyAreaRef}>
                <div id="blocklyDiv" ref={blocklyDivRef}></div>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="panel p-3 mb-3">
              <h6 className="mb-2">Console Output</h6>
              <pre className="console-box mb-0">{consoleOutput}</pre>
            </div>

            <div className="panel p-3">
              <h6 className="mb-2">Generated Python</h6>
              <pre className="code-box mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {pyCode || '# Python code will appear here'}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <button className="fab d-inline-flex align-items-center" onClick={handleRun}>
        <i className="bi bi-play-fill"></i>
        <span className="fab-label">Run</span>
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

export default Studio;
