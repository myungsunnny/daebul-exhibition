/* 기존 CSS 파일 끝부분에 추가할 코드 */

/* 관리자 전용 요소 스타일링 */
.admin-only {
    display: none !important;
}

body.admin-mode .admin-only {
    display: block !important;
}

/* 시스템 상태 패널 애니메이션 */
.status-section {
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(-10px);
}

.status-section.admin-only {
    opacity: 1;
    transform: translateY(0);
}

/* 설정 폼 개선 */
.form-group textarea {
    min-height: 100px;
    resize: vertical;
}

.form-group input[type="text"], 
.form-group textarea {
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input[type="text"]:focus, 
.form-group textarea:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 설정 저장 버튼 강조 */
.btn-primary:hover {
    background: linear-gradient(45deg, #5a67d8, #6b46c1);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* 관리자 모드 표시 */
body.admin-mode::before {
    content: "👨‍💼 관리자 모드";
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(255, 69, 0, 0.9);
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 0.8rem;
    z-index: 1000;
    backdrop-filter: blur(10px);
}
