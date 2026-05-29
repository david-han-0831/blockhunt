/**
 * 블록 카탈로그 초기 데이터를 Firestore에 마이그레이션
 * 
 * 사용법:
 * 1. Admin으로 로그인
 * 2. 브라우저 콘솔에서 이 파일을 import
 * 3. migrateBlocksToFirestore() 실행
 */

import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * GLTF 3D 파일 없음 — QR 수집·어드민 목록에서 제외, Studio는 Blockly 기본 카테고리 사용
 */
export const BLOCKS_WITHOUT_GLTF = [
  'variables_get',
  'variables_set',
  'procedures_defnoreturn',
  'procedures_defreturn',
  'procedures_ifreturn',
];

// 전체 블록 카탈로그 정의
export const INITIAL_BLOCKS = [
  // Logic (5개)
  { id: 'controls_if', name: 'if / else', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  { id: 'logic_compare', name: 'compare', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  { id: 'logic_operation', name: 'and / or', category: 'Logic', icon: 'bi-braces', isDefaultBlock: false },
  { id: 'logic_negate', name: 'not', category: 'Logic', icon: 'bi-braces', isDefaultBlock: false },
  { id: 'logic_boolean', name: 'true / false', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  
  // Loops (5개)
  { id: 'controls_repeat_ext', name: 'repeat', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: true },
  { id: 'controls_whileUntil', name: 'while / until', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_for', name: 'count with', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_forEach', name: 'for each', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_flow_statements', name: 'break / continue', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  
  // Math (6개)
  { id: 'math_number', name: 'number', category: 'Math', icon: 'bi-123', isDefaultBlock: true },
  { id: 'math_arithmetic', name: '+ - × ÷', category: 'Math', icon: 'bi-123', isDefaultBlock: true },
  { id: 'math_single', name: 'sqrt, abs, ...', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_trig', name: 'sin, cos, tan', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_constant', name: 'π, e, ...', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_modulo', name: 'remainder of', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  
  // Text (5개)
  { id: 'text', name: 'text', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: true },
  { id: 'text_print', name: 'print', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: true },
  { id: 'text_join', name: 'join', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  { id: 'text_append', name: 'append text', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  { id: 'text_length', name: 'length', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  
  // Lists (7개)
  { id: 'lists_create_with', name: 'make list', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: true },
  { id: 'lists_create_empty', name: 'empty list', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_repeat', name: 'repeat item', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_length', name: 'length', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_isEmpty', name: 'is empty', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_indexOf', name: 'find', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_getIndex', name: 'get item', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  
  // Variables (2개)
  { id: 'variables_get', name: 'get variable', category: 'Variables', icon: 'bi-box', isDefaultBlock: true }, // GLTF 없음, 어드민에서 숨김
  { id: 'variables_set', name: 'set variable', category: 'Variables', icon: 'bi-box', isDefaultBlock: true }, // GLTF 없음, 어드민에서 숨김
  
  // Functions (3개)
  { id: 'procedures_defnoreturn', name: 'define function', category: 'Functions', icon: 'bi-gear', isDefaultBlock: true }, // GLTF 없음, 어드민에서 숨김
  { id: 'procedures_defreturn', name: 'function with return', category: 'Functions', icon: 'bi-gear', isDefaultBlock: true }, // GLTF 없음, 어드민에서 숨김
  { id: 'procedures_ifreturn', name: 'if return', category: 'Functions', icon: 'bi-gear', isDefaultBlock: true } // GLTF 없음, 어드민에서 숨김
];

/**
 * 블록 데이터를 Firestore에 마이그레이션
 */
export const migrateBlocksToFirestore = async () => {
  console.log('🚀 Starting block migration...');
  console.log(`Total blocks to migrate: ${INITIAL_BLOCKS.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const block of INITIAL_BLOCKS) {
    try {
      const blockRef = doc(db, 'blocks', block.id);
      await setDoc(blockRef, {
        ...block,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      successCount++;
      console.log(`✅ Migrated: ${block.name} (${block.id})`);
    } catch (error) {
      errorCount++;
      errors.push({ block: block.id, error: error.message });
      console.error(`❌ Failed: ${block.id}`, error);
    }
  }

  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    errors
  };
};

/**
 * 블록 데이터를 Firestore에 마이그레이션 (진행 상황 콜백 포함)
 */
export const migrateBlocksToFirestoreWithProgress = async (progressCallback) => {
  console.log('🚀 Starting block migration with progress...');
  console.log(`Total blocks to migrate: ${INITIAL_BLOCKS.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < INITIAL_BLOCKS.length; i++) {
    const block = INITIAL_BLOCKS[i];
    
    try {
      const blockRef = doc(db, 'blocks', block.id);
      await setDoc(blockRef, {
        ...block,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      successCount++;
      console.log(`✅ Migrated: ${block.name} (${block.id})`);
    } catch (error) {
      errorCount++;
      errors.push({ block: block.id, error: error.message });
      console.error(`❌ Failed: ${block.id}`, error);
    }
    
    // 진행 상황 업데이트
    const progress = Math.round(((i + 1) / INITIAL_BLOCKS.length) * 100);
    progressCallback(progress);
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => {
      console.log(`  - ${err.block}: ${err.error}`);
    });
  }

  // 통계 출력
  const defaultBlocks = INITIAL_BLOCKS.filter(b => b.isDefaultBlock);
  const qrBlocks = INITIAL_BLOCKS.filter(b => !b.isDefaultBlock);
  
  console.log('\n📈 Block Statistics:');
  console.log(`  Total Blocks: ${INITIAL_BLOCKS.length}`);
  console.log(`  Default Blocks: ${defaultBlocks.length}`);
  console.log(`  QR Required Blocks: ${qrBlocks.length}`);
  
  // 카테고리별 통계
  const categories = {};
  INITIAL_BLOCKS.forEach(block => {
    if (!categories[block.category]) {
      categories[block.category] = { total: 0, default: 0, qr: 0 };
    }
    categories[block.category].total++;
    if (block.isDefaultBlock) {
      categories[block.category].default++;
    } else {
      categories[block.category].qr++;
    }
  });
  
  console.log('\n📊 By Category:');
  Object.entries(categories).forEach(([cat, stats]) => {
    console.log(`  ${cat}: ${stats.total} (Default: ${stats.default}, QR: ${stats.qr})`);
  });

  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    errors
  };
};

/**
 * Firestore의 블록 목록 조회 (검증용)
 */
export const verifyBlocksInFirestore = async () => {
  console.log('🔍 Verifying blocks in Firestore...');
  
  try {
    const querySnapshot = await getDocs(collection(db, 'blocks'));
    const blocks = [];
    querySnapshot.forEach((doc) => {
      blocks.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Found ${blocks.length} blocks in Firestore`);
    
    // 카테고리별 출력
    const byCategory = {};
    blocks.forEach(block => {
      if (!byCategory[block.category]) {
        byCategory[block.category] = [];
      }
      byCategory[block.category].push(block);
    });
    
    console.log('\n📦 Blocks by Category:');
    Object.entries(byCategory).forEach(([cat, catBlocks]) => {
      console.log(`\n${cat} (${catBlocks.length}):`);
      catBlocks.forEach(block => {
        const type = block.isDefaultBlock ? '🔓 Default' : '🔒 QR Required';
        console.log(`  ${type} - ${block.name} (${block.id})`);
      });
    });
    
    return { success: true, blocks };
  } catch (error) {
    console.error('❌ Failed to verify blocks:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 특정 블록의 설정 업데이트 (테스트용)
 */
export const updateBlockSetting = async (blockId, isDefaultBlock) => {
  try {
    const blockRef = doc(db, 'blocks', blockId);
    await setDoc(blockRef, {
      isDefaultBlock,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`✅ Updated ${blockId}: isDefaultBlock = ${isDefaultBlock}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to update ${blockId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * GLTF 없는 블록을 Firestore에서 default로 동기화 (어드민 숨김·QR 제외)
 */
export const updateHiddenBlocksToDefault = async () => {
  const hiddenBlockIds = BLOCKS_WITHOUT_GLTF;
  
  console.log(`🔄 Updating ${hiddenBlockIds.length} blocks without GLTF to default...`);
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const blockId of hiddenBlockIds) {
    try {
      const blockRef = doc(db, 'blocks', blockId);
      await setDoc(blockRef, {
        isDefaultBlock: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      successCount++;
      console.log(`✅ Updated ${blockId} to default`);
    } catch (error) {
      errorCount++;
      errors.push({ blockId, error: error.message });
      console.error(`❌ Failed to update ${blockId}:`, error);
    }
  }
  
  console.log(`\n📊 Update Summary: ${successCount} success, ${errorCount} failed`);
  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    errors
  };
};

// 기본 내보내기
const migrateBlocksModule = {
  BLOCKS_WITHOUT_GLTF,
  INITIAL_BLOCKS,
  migrateBlocksToFirestore,
  migrateBlocksToFirestoreWithProgress,
  verifyBlocksInFirestore,
  updateBlockSetting,
  updateHiddenBlocksToDefault
};

export default migrateBlocksModule;

