/**
 * 블록 SVG 추출 테스트 스크립트
 * 
 * 브라우저 콘솔에서 직접 실행하여 테스트할 수 있습니다.
 * 
 * 사용 방법:
 * 1. Studio 페이지를 열고 Blockly가 로드될 때까지 대기
 * 2. 브라우저 콘솔(F12)을 엽니다
 * 3. 이 파일을 import하거나 아래 코드를 직접 실행:
 * 
 * ```javascript
 * // 단일 블록 테스트
 * testSingleBlock('text_print');
 * 
 * // 모든 블록 테스트 (5개만)
 * testMultipleBlocks(['text_print', 'math_number', 'controls_if', 'logic_compare', 'text_join']);
 * ```
 */

/**
 * 단일 블록 SVG 추출 테스트
 * @param {string} blockType - 블록 타입
 * @param {Blockly.Workspace} workspace - 기존 워크스페이스 (선택사항, 없으면 임시 생성)
 */
export async function testSingleBlock(blockType = 'text_print', workspace = null) {
  if (!window.Blockly) {
    console.error('❌ Blockly가 로드되지 않았습니다.');
    return;
  }

  let tempWorkspace = null;
  let shouldDispose = false;
  let tempDiv = null;

  try {
    console.log(`🔄 블록 "${blockType}" SVG 추출 테스트 시작...`);
    
    // 기존 워크스페이스가 없으면 임시로 DOM에 주입된 워크스페이스 생성
    if (!workspace) {
      // 숨겨진 div 생성
      tempDiv = document.createElement('div');
      tempDiv.id = 'temp-blockly-div';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '400px';
      tempDiv.style.height = '400px';
      document.body.appendChild(tempDiv);
      
      // 임시 워크스페이스 주입 (렌더러 포함)
      tempWorkspace = window.Blockly.inject('temp-blockly-div', {
        toolbox: '<xml></xml>',
        trashcan: false,
        renderer: 'zelos',
        zoom: { controls: false, wheel: false }
      });
      shouldDispose = true;
    } else {
      tempWorkspace = workspace;
    }
    
    // 블록 생성
    let block;
    
    // variables_set 블록의 경우 변수를 먼저 생성해야 함
    if (blockType === 'variables_set') {
      // 변수 생성 (없으면 생성)
      const varName = 'tempVar'; // 임시 변수명
      let variable = null;
      
      try {
        // 기존 변수 확인
        const variables = tempWorkspace.getAllVariables();
        variable = variables.find(v => v.name === varName);
        
        // 변수가 없으면 생성
        if (!variable) {
          if (tempWorkspace.createVariable) {
            variable = tempWorkspace.createVariable(varName);
          } else if (window.Blockly.Variables && window.Blockly.Variables.createVariable) {
            variable = window.Blockly.Variables.createVariable(tempWorkspace, varName);
          }
        }
      } catch (e) {
        console.warn('변수 생성 실패, 기본 변수명 사용:', e);
      }
      
      // variables_set 블록 생성
      block = tempWorkspace.newBlock(blockType);
      
      // 변수 이름 설정
      if (variable && block.setFieldValue) {
        block.setFieldValue(varName, 'VAR');
      } else if (block.getVars && block.getVars().length > 0) {
        // 변수 필드가 있으면 첫 번째 변수 사용
        const vars = block.getVars();
        if (vars.length > 0 && block.setFieldValue) {
          block.setFieldValue(vars[0], 'VAR');
        }
      }
    } else {
      // 일반 블록 생성
      block = tempWorkspace.newBlock(blockType);
    }
    
    // 블록 위치 설정 (충분한 여유 공간 확보)
    block.moveBy(200, 200);
    
    // 블록 렌더링
    if (typeof block.initSvg === 'function') {
      block.initSvg();
    }
    if (typeof block.render === 'function') {
      block.render();
    }
    
    // 워크스페이스 렌더링 (SVG 생성을 위해 필요)
    if (typeof tempWorkspace.render === 'function') {
      tempWorkspace.render();
    }
    
    // 렌더링 완료 대기 (더 긴 시간으로 변경)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 추가 렌더링 (블록이 완전히 렌더링되도록)
    if (typeof tempWorkspace.render === 'function') {
      tempWorkspace.render();
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // variables_set 블록의 경우 변수 필드가 제대로 설정되었는지 확인
    if (blockType === 'variables_set') {
      // 변수 필드가 비어있으면 다시 설정 시도
      const varField = block.getField('VAR');
      if (!varField || !varField.getText()) {
        const variables = tempWorkspace.getAllVariables();
        if (variables.length > 0 && block.setFieldValue) {
          block.setFieldValue(variables[0].name, 'VAR');
          block.render();
          tempWorkspace.render();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // 블록이 완전히 렌더링될 때까지 대기 (최대 1초)
    let renderAttempts = 0;
    const maxRenderAttempts = 10;
    while (renderAttempts < maxRenderAttempts) {
      const svgRoot = block.getSvgRoot();
      if (svgRoot) {
        const hasContent = svgRoot.children && svgRoot.children.length > 0;
        const hasPath = svgRoot.querySelector('path');
        const hasText = svgRoot.querySelector('text');
        
        if (hasContent || hasPath || hasText) {
          console.log(`✅ 블록 "${blockType}" 렌더링 완료 (시도 ${renderAttempts + 1}/${maxRenderAttempts})`);
          break;
        }
      }
      
      // 추가 렌더링 시도
      if (block.render) block.render();
      if (tempWorkspace.render) tempWorkspace.render();
      await new Promise(resolve => setTimeout(resolve, 100));
      renderAttempts++;
    }
    
    if (renderAttempts >= maxRenderAttempts) {
      console.warn(`⚠️ 블록 "${blockType}" 렌더링이 완료되지 않았을 수 있습니다.`);
    }
    
    // 블록이 제대로 생성되었는지 확인
    if (!block) {
      console.error(`❌ 블록 "${blockType}" 생성 실패`);
      if (shouldDispose && tempWorkspace) {
        tempWorkspace.dispose();
        if (tempDiv) {
          document.body.removeChild(tempDiv);
        } else {
          const foundDiv = document.getElementById('temp-blockly-div');
          if (foundDiv) document.body.removeChild(foundDiv);
        }
      }
      return;
    }
    
    console.log(`✅ 블록 "${blockType}" 생성 완료, 타입: ${block.type}`);
    
    // SVG 추출 (공식 API 사용)
    const svgRoot = block.getSvgRoot();
    if (!svgRoot) {
      console.error(`❌ 블록 "${blockType}"의 SVG 루트를 찾을 수 없습니다.`);
      console.error('블록 정보:', {
        type: block.type,
        id: block.id,
        hasSvgRoot: !!block.getSvgRoot,
        svgGroup_: !!block.svgGroup_
      });
      if (shouldDispose && tempWorkspace) {
        tempWorkspace.dispose();
        if (tempDiv) {
          document.body.removeChild(tempDiv);
        } else {
          const foundDiv = document.getElementById('temp-blockly-div');
          if (foundDiv) document.body.removeChild(foundDiv);
        }
      }
      return;
    }
    
    console.log(`✅ SVG 루트 찾음:`, svgRoot);
    
    // getSvgRoot()를 우선 사용하고, svgGroup_은 하위 호환성을 위해 사용
    let svgGroup = svgRoot;
    if (block.svgGroup_ && block.svgGroup_ !== svgRoot) {
      svgGroup = block.svgGroup_;
    }
    if (!svgGroup) {
      console.error('❌ SVG 그룹을 찾을 수 없습니다.');
      if (shouldDispose && tempWorkspace) {
        tempWorkspace.dispose();
        if (tempDiv) {
          document.body.removeChild(tempDiv);
        } else {
          const foundDiv = document.getElementById('temp-blockly-div');
          if (foundDiv) document.body.removeChild(foundDiv);
        }
      }
      return;
    }
    
    // 블록 ID로 워크스페이스 SVG에서 모든 관련 요소 찾기
    const blockId = block.id;
    console.log(`🔍 블록 ID: ${blockId}`);
    
    // svgGroup이 비어있는지 확인
    const hasChildren = svgGroup.children && svgGroup.children.length > 0;
    const innerHTML = svgGroup.innerHTML || '';
    console.log(`📊 svgGroup 상태:`, {
      childrenCount: svgGroup.children ? svgGroup.children.length : 0,
      innerHTMLLength: innerHTML.length,
      hasChildren: hasChildren
    });
    
    // svgGroup이 비어있으면 워크스페이스 SVG에서 블록 요소 찾기
    if (!hasChildren || innerHTML.trim().length === 0) {
      console.warn(`⚠️ svgGroup이 비어있습니다. 워크스페이스 SVG에서 블록 요소를 찾는 중...`);
      
      // 워크스페이스 SVG 찾기
      let workspaceSvgElement = null;
      if (tempDiv) {
        workspaceSvgElement = tempDiv.querySelector('svg');
      }
      
      if (workspaceSvgElement) {
        // 블록 ID로 모든 관련 요소 찾기
        const blockElements = workspaceSvgElement.querySelectorAll(`[data-id="${blockId}"], g[data-id*="${blockId}"]`);
        console.log(`🔍 워크스페이스에서 찾은 블록 요소: ${blockElements.length}개`);
        
        if (blockElements.length > 0) {
          // 첫 번째 요소를 svgGroup으로 사용 (가장 큰 그룹)
          let largestElement = blockElements[0];
          let largestSize = 0;
          
          blockElements.forEach(el => {
            try {
              const bbox = el.getBBox();
              const size = bbox.width * bbox.height;
              if (size > largestSize) {
                largestSize = size;
                largestElement = el;
              }
            } catch (e) {
              // getBBox 실패 시 무시
            }
          });
          
          svgGroup = largestElement;
          console.log(`✅ 워크스페이스에서 블록 요소 찾음:`, svgGroup);
        }
      }
    }
    
    // 워크스페이스의 SVG에서 defs와 스타일 정보 가져오기
    let workspaceSvg = null;
    try {
      // 여러 방법으로 워크스페이스 SVG 찾기
      if (tempWorkspace.getParentSvg) {
        workspaceSvg = tempWorkspace.getParentSvg();
      } else if (tempDiv) {
        // DOM에서 직접 찾기
        workspaceSvg = tempDiv.querySelector('svg');
      } else if (tempWorkspace.svgGroup_) {
        // svgGroup_에서 상위 SVG 찾기
        let parent = tempWorkspace.svgGroup_.parentElement;
        while (parent && parent.tagName !== 'SVG') {
          parent = parent.parentElement;
        }
        workspaceSvg = parent;
      }
    } catch (e) {
      console.warn('워크스페이스 SVG 찾기 실패:', e);
    }
    
    let defsContent = '';
    let styleContent = '';
    
    if (workspaceSvg) {
      // defs 요소 수집
      const defsElements = workspaceSvg.querySelectorAll('defs');
      defsElements.forEach(defs => {
        defsContent += defs.innerHTML;
      });
      
      // style 요소 수집
      const styleElements = workspaceSvg.querySelectorAll('style');
      styleElements.forEach(style => {
        styleContent += style.outerHTML;
      });
    }
    
    // 경로(path) 확인 및 생성
    const path = svgGroup.querySelector('path.blocklyPath');
    if (!path || !path.getAttribute('d') || path.getAttribute('d').length === 0) {
      console.warn(`⚠️ 블록 "${blockType}"의 경로가 없습니다. 경로 생성 시도...`);
      
      // 경로가 없으면 생성 시도
      if (block.render) {
        block.render();
        tempWorkspace.render();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 블록의 전체 경계 계산 (패딩 포함)
    let bbox;
    try {
      bbox = svgGroup.getBBox();
      console.log(`📏 블록 "${blockType}" 경계:`, bbox);
      
      // 경계가 0이면 블록 크기 사용
      if (bbox.width === 0 || bbox.height === 0) {
        const hw = block.getHeightWidth ? block.getHeightWidth() : { width: 200, height: 100 };
        bbox = { x: 0, y: 0, width: hw.width, height: hw.height };
        console.warn(`⚠️ 경계가 0이므로 블록 크기 사용:`, bbox);
      }
    } catch (e) {
      console.error(`❌ 경계 계산 실패:`, e);
      // 블록 크기 사용
      const hw = block.getHeightWidth ? block.getHeightWidth() : { width: 200, height: 100 };
      bbox = { x: 0, y: 0, width: hw.width, height: hw.height };
    }
    
    // svgGroup의 실제 내용 확인
    const actualChildren = svgGroup.children ? Array.from(svgGroup.children) : [];
    const actualInnerHTML = svgGroup.innerHTML || '';
    
    console.log(`📦 svgGroup 최종 상태:`, {
      tagName: svgGroup.tagName,
      childrenCount: actualChildren.length,
      innerHTMLLength: actualInnerHTML.length,
      hasPath: !!svgGroup.querySelector('path'),
      hasText: !!svgGroup.querySelector('text'),
      hasRect: !!svgGroup.querySelector('rect'),
      hasG: !!svgGroup.querySelector('g'),
      allChildren: actualChildren.map(c => `${c.tagName}(${c.className?.baseVal || c.className || ''})`).join(', ')
    });
    
    // svgGroup이 비어있으면 워크스페이스 SVG에서 블록의 모든 하위 요소 찾기
    if (actualChildren.length === 0 && actualInnerHTML.trim().length === 0) {
      console.warn(`⚠️ svgGroup이 비어있습니다. 워크스페이스 SVG에서 블록 요소를 재구성하는 중...`);
      
      if (workspaceSvg) {
        // 블록 ID로 모든 관련 요소 찾기
        const blockId = block.id;
        const allBlockElements = workspaceSvg.querySelectorAll(`[data-id="${blockId}"], g[data-id*="${blockId}"]`);
        
        if (allBlockElements.length > 0) {
          // 가장 큰 그룹 찾기 (메인 블록 그룹)
          let mainGroup = null;
          let maxSize = 0;
          
          allBlockElements.forEach(el => {
            try {
              const bbox = el.getBBox();
              const size = bbox.width * bbox.height;
              if (size > maxSize && el.children.length > 0) {
                maxSize = size;
                mainGroup = el;
              }
            } catch (e) {
              // getBBox 실패 시 무시
            }
          });
          
          if (mainGroup && mainGroup.children.length > 0) {
            svgGroup = mainGroup;
            console.log(`✅ 워크스페이스에서 블록 그룹 찾음: ${mainGroup.children.length}개 자식 요소`);
          } else {
            // 모든 요소를 하나의 그룹으로 합치기
            const newGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            allBlockElements.forEach(el => {
              if (el.parentNode) {
                const cloned = el.cloneNode(true);
                newGroup.appendChild(cloned);
              }
            });
            
            if (newGroup.children.length > 0) {
              svgGroup = newGroup;
              console.log(`✅ 블록 요소 재구성 완료: ${newGroup.children.length}개 요소`);
            }
          }
        }
      }
      
      // 여전히 비어있으면 에러
      const finalChildren = svgGroup.children ? Array.from(svgGroup.children) : [];
      if (finalChildren.length === 0) {
        console.error(`❌ 블록 "${blockType}"의 SVG 내용을 찾을 수 없습니다!`);
        console.error('디버깅 정보:', {
          blockId: block.id,
          blockType: block.type,
          svgRoot: svgRoot,
          workspaceSvg: !!workspaceSvg,
          allBlockElements: workspaceSvg ? workspaceSvg.querySelectorAll(`[data-id="${block.id}"]`).length : 0
        });
        
        if (shouldDispose && tempWorkspace) {
          tempWorkspace.dispose();
          if (tempDiv) {
            document.body.removeChild(tempDiv);
          } else {
            const foundDiv = document.getElementById('temp-blockly-div');
            if (foundDiv) document.body.removeChild(foundDiv);
          }
        }
        return;
      }
    }
    
    const serializer = new XMLSerializer();
    
    // 블록의 SVG 클론 생성 (깊은 복사로 모든 하위 요소 포함)
    const svgClone = svgGroup.cloneNode(true);

    // 원본과 복제된 요소의 스타일을 일치시키기 위한 속성 목록
    const styleProps = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'stroke-dasharray',
      'stroke-dashoffset',
      'stroke-opacity',
      'fill-opacity',
      'opacity',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'text-anchor',
      'dominant-baseline',
      'alignment-baseline',
      'color'
    ];

    // 원본/복제 요소 쌍에 대해 스타일 복사
    const originalElements = [svgGroup, ...svgGroup.querySelectorAll('*')];
    const clonedElements = [svgClone, ...svgClone.querySelectorAll('*')];

    originalElements.forEach((original, index) => {
      const cloned = clonedElements[index];
      if (!cloned) return;
      const computed = window.getComputedStyle(original);
      styleProps.forEach((prop) => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value.trim() !== '') {
          cloned.style.setProperty(prop, value);
        }
      });
    });

    // transform 속성은 유지 (viewBox가 이미 변환을 고려한 경계를 사용하므로 별도 조정 불필요)
    const transform = svgGroup.getAttribute('transform');
    if (transform) {
      console.log(`ℹ️ transform 유지: ${transform}`);
    }
    
    const padding = 10; // 여유 공간 추가
    const width = Math.max(bbox.width + (padding * 2), 50); // 최소 너비 보장
    const height = Math.max(bbox.height + (padding * 2), 50); // 최소 높이 보장
    const viewBoxX = bbox.x - padding;
    const viewBoxY = bbox.y - padding;
    
    // SVG 문자열 생성
    let svgString = serializer.serializeToString(svgClone);
    
    // SVG 내용 확인
    if (!svgString || svgString.trim().length === 0 || svgString === '<g></g>') {
      console.error(`❌ SVG 내용이 비어있습니다!`);
      console.error('svgGroup 내용:', svgGroup.innerHTML);
      console.error('svgGroup 자식 요소 수:', svgGroup.children.length);
      
      // 자식 요소가 있으면 다시 시도
      if (svgGroup.children.length > 0) {
        svgString = '';
        for (let i = 0; i < svgGroup.children.length; i++) {
          svgString += serializer.serializeToString(svgGroup.children[i]);
        }
        console.log(`✅ 자식 요소에서 SVG 재구성: ${svgString.length} 문자`);
      }
    }
    
    // 완전한 SVG 문서 생성 (defs와 스타일 포함)
    const defsSection = defsContent ? `<defs>${defsContent}</defs>` : '';
    const styleSection = styleContent || '';
    
    // SVG 내용이 여전히 비어있으면 경고 및 디버깅 정보 출력
    if (!svgString || svgString.trim().length === 0 || svgString === '<g></g>') {
      console.error(`❌ 블록 "${blockType}"의 SVG 내용이 비어있습니다!`);
      console.error('디버깅 정보:', {
        svgGroupChildren: svgGroup.children.length,
        svgGroupInnerHTML: svgGroup.innerHTML.substring(0, 500),
        hasPath: !!svgGroup.querySelector('path'),
        hasText: !!svgGroup.querySelector('text'),
        hasRect: !!svgGroup.querySelector('rect'),
        allChildren: Array.from(svgGroup.children).map(c => c.tagName).join(', ')
      });
    }
    
    svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${viewBoxX} ${viewBoxY} ${width} ${height}">${defsSection}${styleSection}${svgString}</svg>`;
    
    // 최종 SVG 내용 확인
    console.log('✅ SVG 추출 성공!');
    console.log('SVG 크기:', bbox.width, 'x', bbox.height);
    console.log('SVG 전체 길이:', svgString.length, '문자');
    console.log('SVG 미리보기 (처음 500자):', svgString.substring(0, 500));
    
    // SVG에 실제 내용이 있는지 확인
    const hasContent = svgString.includes('<path') || svgString.includes('<text') || svgString.includes('<rect') || svgString.includes('<g');
    if (!hasContent) {
      console.error(`❌ 경고: SVG에 실제 내용이 없을 수 있습니다!`);
    }
    
    // 파일로 다운로드
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blockType}.svg`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ "${blockType}.svg" 파일 다운로드 완료!`);
    
    // 정리
    if (shouldDispose && tempWorkspace) {
      tempWorkspace.dispose();
      if (tempDiv) {
        document.body.removeChild(tempDiv);
      } else {
        const foundDiv = document.getElementById('temp-blockly-div');
        if (foundDiv) document.body.removeChild(foundDiv);
      }
    }
    
    return svgString;
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    
    // 에러 발생 시에도 정리
    if (shouldDispose && tempWorkspace) {
      try {
        tempWorkspace.dispose();
        if (tempDiv) {
          document.body.removeChild(tempDiv);
        } else {
          const foundDiv = document.getElementById('temp-blockly-div');
          if (foundDiv) document.body.removeChild(foundDiv);
        }
      } catch (e) {
        // 정리 중 에러 무시
      }
    }
    
    throw error;
  }
}

/**
 * 여러 블록 SVG 추출 테스트
 * @param {Array<string>} blockTypes - 블록 타입 배열
 * @param {Blockly.Workspace} workspace - 기존 워크스페이스 (선택사항)
 */
export async function testMultipleBlocks(blockTypes = ['text_print', 'math_number', 'controls_if'], workspace = null) {
  if (!window.Blockly) {
    console.error('❌ Blockly가 로드되지 않았습니다.');
    return;
  }

  console.log(`🔄 ${blockTypes.length}개 블록 SVG 추출 테스트 시작...`);
  
  const results = [];
  
  for (let i = 0; i < blockTypes.length; i++) {
    const blockType = blockTypes[i];
    console.log(`\n[${i + 1}/${blockTypes.length}] "${blockType}" 처리 중...`);
    
    try {
      const svg = await testSingleBlock(blockType, workspace);
      results.push({ type: blockType, success: true, svg });
      
      // 다운로드 간 지연 (브라우저가 처리할 시간 제공)
      if (i < blockTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ "${blockType}" 처리 실패:`, error);
      results.push({ type: blockType, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ 테스트 완료: ${successCount}/${blockTypes.length}개 성공`);
  
  return results;
}

/**
 * 누락된 3개 블록만 SVG로 다운로드
 * - procedures_defreturn (function with return)
 * - procedures_ifreturn (if return)
 * - variables_set (set variable)
 */
export async function downloadMissingBlocks() {
  const missingBlocks = [
    'procedures_defreturn',  // function with return
    'procedures_ifreturn',   // if return
    'variables_set'          // set variable
  ];
  
  // Studio 페이지의 workspace를 사용하려고 시도
  let workspace = null;
  
  // React 컴포넌트의 workspace ref를 찾기
  if (window.workspaceRef && window.workspaceRef.current) {
    workspace = window.workspaceRef.current;
  }
  
  return await testMultipleBlocks(missingBlocks, workspace);
}

/**
 * 전역 함수로 등록 (콘솔에서 바로 사용 가능)
 */
if (typeof window !== 'undefined') {
  window.testBlockSvg = testSingleBlock;
  window.testMultipleBlockSvgs = testMultipleBlocks;
  window.downloadMissingBlocks = downloadMissingBlocks;
}


