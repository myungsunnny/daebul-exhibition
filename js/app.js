
// 관리자 UI 업데이트 함수
function updateAdminUI() {
    console.log('🔄 관리자 UI 업데이트 시작, isAdmin:', isAdmin);
    
// 모든 작품 카드의 관리자 컨트롤 표시/숨김 업데이트
const artworkCards = document.querySelectorAll('.artwork-card');
    artworkCards.forEach(card => {
    console.log('📊 작품 카드 수:', artworkCards.length);
    
    artworkCards.forEach((card, index) => {
const adminControls = card.querySelector('.admin-controls');
if (adminControls) {
if (isAdmin) {
adminControls.style.display = 'flex';
                adminControls.style.visibility = 'visible';
                adminControls.style.opacity = '1';
                console.log(`✅ 카드 ${index + 1}: 관리자 컨트롤 표시`);
} else {
adminControls.style.display = 'none';
                adminControls.style.visibility = 'hidden';
                adminControls.style.opacity = '0';
                console.log(`❌ 카드 ${index + 1}: 관리자 컨트롤 숨김`);
}
        } else {
            console.log(`⚠️ 카드 ${index + 1}: 관리자 컨트롤 요소 없음`);
}
});

// 드래그 핸들 표시/숨김 업데이트
const dragHandles = document.querySelectorAll('.drag-handle');
    dragHandles.forEach(handle => {
    dragHandles.forEach((handle, index) => {
if (isAdmin) {
handle.style.display = 'flex';
            handle.style.visibility = 'visible';
            console.log(`✅ 드래그 핸들 ${index + 1}: 표시`);
} else {
handle.style.display = 'none';
            handle.style.visibility = 'hidden';
            console.log(`❌ 드래그 핸들 ${index + 1}: 숨김`);
}
});

@@ -217,6 +233,8 @@ function toggleAdminPanel() {
setTimeout(() => {
initializeSortable();
updateAdminUI();
                // 갤러리 재렌더링으로 관리자 컨트롤 표시
                renderAllArtworks();
}, 500);

} else if (password) {
@@ -862,7 +880,9 @@ function renderAllArtworks() {
}

// 관리자 UI 업데이트
    updateAdminUI();
    setTimeout(() => {
        updateAdminUI();
    }, 100);
}

// Sortable.js 초기화 함수
@@ -976,11 +996,11 @@ function createArtworkElement(artwork) {
const isAdminMode = checkAdminStatus();

// 관리자 모드일 때 드래그 핸들과 컨트롤 추가
    const dragHandle = isAdminMode ? '<div class="drag-handle">🔄</div>' : '';
    const dragHandle = isAdminMode ? '<div class="drag-handle" style="position: absolute; top: 10px; left: 10px; background: rgba(255, 255, 255, 0.9); color: #666; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: grab; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10;">🔄</div>' : '';
const adminControls = isAdminMode ? `
        <div class="admin-controls" style="position: absolute; top: 10px; right: 10px; z-index: 10;">
            <button class="btn btn-warning btn-small" onclick="event.stopPropagation(); editArtwork('${artwork.id}')" style="margin-bottom: 5px;">수정</button>
            <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteArtwork('${artwork.id}')">삭제</button>
        <div class="admin-controls" style="position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 5px; background: rgba(255, 255, 255, 0.98); padding: 8px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255, 255, 255, 0.8);">
            <button class="btn btn-warning btn-small" onclick="event.stopPropagation(); editArtwork('${artwork.id}')" style="margin-bottom: 5px; background: #ffc107; color: #212529; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; min-width: 50px; font-size: 0.75rem;">수정</button>
            <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteArtwork('${artwork.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; min-width: 50px; font-size: 0.75rem;">삭제</button>
       </div>
   ` : '';

@@ -1310,6 +1330,8 @@ function editArtwork(artworkId) {
return;
}

    console.log('📝 수정할 작품 정보:', artwork);
    
// 수정 모드 활성화
isEditMode = true;
editingArtworkId = artworkId;
@@ -1321,12 +1343,30 @@ function editArtwork(artworkId) {
const descriptionInput = document.getElementById('artworkDescription');
const linkInput = document.getElementById('artworkLink');

    if (titleInput) titleInput.value = artwork.title;
    if (gradeInput) gradeInput.value = artwork.grade.replace('학년', '');
    if (categoryInput) categoryInput.value = artwork.category;
    if (descriptionInput) descriptionInput.value = artwork.description;
    if (titleInput) {
        titleInput.value = artwork.title;
        console.log('✅ 제목 설정:', artwork.title);
    }
    
    if (gradeInput) {
        const gradeNumber = artwork.grade.replace('학년', '');
        gradeInput.value = gradeNumber;
        console.log('✅ 학년 설정:', gradeNumber);
    }
    
    if (categoryInput) {
        categoryInput.value = artwork.category;
        console.log('✅ 분류 설정:', artwork.category);
    }
    
    if (descriptionInput) {
        descriptionInput.value = artwork.description;
        console.log('✅ 설명 설정:', artwork.description);
    }
    
if (linkInput && artwork.link) {
linkInput.value = artwork.link;
        console.log('✅ 링크 설정:', artwork.link);
}

// 이미지 미리보기 설정
@@ -1336,17 +1376,30 @@ function editArtwork(artworkId) {
file: null
}));
updateImagePreview();
    console.log('✅ 이미지 미리보기 설정 완료:', uploadedImages.length, '개');

// UI 업데이트
const panelTitle = document.getElementById('uploadPanelTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelEditBtn');

    if (panelTitle) panelTitle.textContent = '✏️ 작품 수정';
    if (submitBtn) submitBtn.textContent = '수정 완료';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (panelTitle) {
        panelTitle.textContent = '✏️ 작품 수정';
        console.log('✅ 패널 제목 업데이트');
    }
    
    if (submitBtn) {
        submitBtn.textContent = '수정 완료';
        console.log('✅ 제출 버튼 텍스트 업데이트');
    }
    
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
        console.log('✅ 취소 버튼 표시');
    }

// 업로드 패널 열기
    console.log('🖱️ 업로드 패널 열기 시도');
toggleUploadPanel();

console.log('✅ 수정 모드 활성화 완료');
@@ -1368,7 +1421,16 @@ async function deleteArtwork(artworkId) {
return;
}

    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
    // 삭제할 작품 찾기
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) {
        alert('삭제할 작품을 찾을 수 없습니다.');
        return;
    }
    
    console.log('🗑️ 삭제할 작품 정보:', artwork.title);
    
    if (!confirm(`정말로 "${artwork.title}" 작품을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
return;
}

@@ -1391,22 +1453,33 @@ async function deleteArtwork(artworkId) {
// UI에서 제거
const artworkElements = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
console.log(`🖼️ UI에서 ${artworkElements.length}개 요소 제거 중...`);
        artworkElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.8)';
            setTimeout(() => element.remove(), 300);
        });
        
        if (artworkElements.length > 0) {
            artworkElements.forEach(element => {
                element.style.opacity = '0';
                element.style.transform = 'scale(0.8)';
                element.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        console.log('✅ 요소 제거 완료');
                    }
                }, 300);
            });
        } else {
            console.log('⚠️ UI에서 삭제할 요소를 찾을 수 없음');
        }

// 카운트 업데이트
updateCounts();

        // 갤러리 다시 렌더링 (혹시 UI 동기화 문제가 있는 경우)
        // 갤러리 다시 렌더링
setTimeout(() => {
renderAllArtworks();
console.log('🔄 갤러리 재렌더링 완료');
}, 500);

        alert('작품이 성공적으로 삭제되었습니다.');
        alert(`✅ "${artwork.title}" 작품이 성공적으로 삭제되었습니다!`);
console.log('✅ 작품 삭제 완료');

} catch (error) {
