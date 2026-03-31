import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/styles.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as THREE from 'three';

// Three.js를 전역에 노출 (AR.js가 사용할 수 있도록)
window.THREE = THREE;

// 로그 출력 억제: 필요 시 REACT_APP_ENABLE_CONSOLE=true 로 활성화
if (process.env.REACT_APP_ENABLE_CONSOLE !== 'true') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
