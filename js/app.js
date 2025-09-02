// 학생 작품 갤러리 JavaScript - 안정적인 버전
console.log('🚀 학생 갤러리 JavaScript 로딩 시작');

// === 설정 ===
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',
    uploadPreset: 'student_gallery'
};

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAG6FT61aTv0eSPsRJblSnleNH8xVc7AZc",
    authDomain: "daebul-exhibition.firebaseapp.com",
    projectId: "daebul-exhibition",
    storageBucket: "daebul-exhibition.firebasestorage.app",
    messagingSenderId: "473765003173",
    appId: "G-YCZ85EYTFY"
};

const ADMIN_PASSWORD = "admin1234";

// === 전역 변수 ===
let app, db, storage;
let isConnected = false;
let isAdmin = false;
let allArtworks = [];
let uploadedImages = [];
let isUploading = false;
let isEditMode = false;
let editingArtworkId = null;
let currentUser = null; // 현재 사용자 정보
let sortableInstances = []; // Sortable 인스턴스들을 저장

// 관리자 모드 상태 확인 함수
function checkAdminStatus() {
    const adminMode = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    if (adminMode !== isAdmin) {
        isAdmin = adminMode;
        if (isAdmin) {
            document.body.classList.add('admin-mode');
            console.log('✅ 관리자 모드 상태 확인됨');
        } else {
            document.body.classList.remove('admin-mode');
            console.log('✅ 일반 사용자 모드 상태 확인됨');
        }
        
        // 관리자 모드 상태 변경 시 UI 업데이트
        updateAdminUI();
    }
    return isAdmin;
}

// 관리자 UI 업데이트 함수
function updateAdminUI() {
    console.log('🔄 관리자 UI 업데이트 시작, isAdmin:', isAdmin);
    
    // 모든 작품 카드의 관리자 컨트롤 표시/숨김 업데이트
    const artworkCards = document.querySelectorAll('.artwork-card');
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
    
    console.log('🔄 관리자 UI 업데이트 완료');
}

// 기본 작품 등록 설정
let siteSettings = {
    requireUploadPassword: true,
    uploadPassword: '1234'
};

// === Firebase 초기화 ===
function initializeFirebase() {
    try {
        console.log('🔥 Firebase 초기화 시도...');
        
        if (typeof firebase === 'undefined') {
            console.log('⚠️ Firebase SDK가 로드되지 않음');
            return false;
        }
        
        // 이미 초기화된 경우
        if (firebase.apps && firebase.apps.length > 0) {
            app = firebase.app();
            db = firebase.firestore();
            storage = firebase.storage();
            console.log('✅ Firebase 이미 초기화됨 (Firestore + Storage)');
            updateStorageStatus('connected', 'Firebase Storage 연결됨');
            return true;
        }
        
        // 새로 초기화
        app = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        storage = firebase.storage();
        console.log('✅ Firebase 초기화 성공 (Firebase + Storage)');
        updateStorageStatus('connected', 'Firebase Storage 연결됨');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        updateStorageStatus('disconnected', 'Firebase Storage 연결 실패');
        return false;
    }
}

// === 기본 함수들 ===
function resetForm() {
    console.log('📝 폼 초기화');
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    updateImagePreview();
    validateForm();
    
    if (isEditMode) {
        resetEditMode();
    }
}

function resetEditMode() {
    console.log('📝 수정 모드 해제');
    isEditMode = false;
    editingArtworkId = null;
    
    const panelTitle = document.getElementById('uploadPanelTitle');
    if (panelTitle) panelTitle.textContent = '📸 새로운 작품 등록';
    
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    if (submitBtn) submitBtn.textContent = '작품 등록하기';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    resetForm();
}

function updateUploadPasswordVisibility() {
    const passwordGroup = document.getElementById('uploadPasswordGroup');
    if (passwordGroup) {
        if (isEditMode || isAdmin || !siteSettings.requireUploadPassword) {
            passwordGroup.style.display = 'none';
        } else {
            passwordGroup.style.display = 'block';
        }
    }
}

// === 패널 토글 함수들 ===
function toggleUploadPanel() {
    console.log('🖱️ 업로드 패널 토글');
    
    const panel = document.getElementById('uploadPanel');
    const button = document.querySelector('.header-btn');
    
    // 모든 패널 닫기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.style.display === 'block' || panel.classList.contains('active')) {
        // 패널 닫기
        panel.classList.remove('active');
        panel.style.display = 'none';
        button.classList.remove('active');
        
        if (isEditMode) {
            resetEditMode();
        }
    } else {
        // 패널 열기
        panel.classList.add('active');
        panel.style.display = 'block';
        button.classList.add('active');
        
        if (!isEditMode) {
            resetForm();
            updateUploadPasswordVisibility();
        }
    }
}

function toggleAdminPanel() {
    console.log('🖱️ 관리자 패널 토글');
    
    // 관리자 상태 확인
    checkAdminStatus();
    
    if (!isAdmin) {
        const password = prompt('관리자 비밀번호를 입력하세요:');
        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            document.body.classList.add('admin-mode');
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            
            const adminButton = document.querySelectorAll('.header-btn')[1];
            if (adminButton) adminButton.textContent = '🚪 관리자 나가기';
            
            alert('✅ 관리자 모드가 활성화되었습니다.');
            
            // 관리자 모드 활성화 후 Sortable 초기화 및 UI 업데이트
            setTimeout(() => {
                initializeSortable();
                updateAdminUI();
                // 갤러리 재렌더링으로 관리자 컨트롤 표시
                renderAllArtworks();
            }, 500);
            
        } else if (password) {
            alert('❌ 비밀번호가 틀렸습니다.');
            return;
        } else {
            return;
        }
    } else {
        if (confirm('관리자 모드를 종료하시겠습니까?')) {
            isAdmin = false;
            document.body.classList.remove('admin-mode');
            sessionStorage.removeItem('isAdminLoggedIn');
            
            const adminButton = document.querySelectorAll('.header-btn')[1];
            if (adminButton) adminButton.textContent = '⚙️ 관리자 모드';
            
            // 관리자 모드 비활성화 시 Sortable 제거
            sortableInstances.forEach(instance => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            });
            sortableInstances = [];
            
            alert('관리자 모드가 종료되었습니다.');
            return;
        } else {
            return;
        }
    }
    
    const panel = document.getElementById('adminPanel');
    const buttons = document.querySelectorAll('.header-btn');
    const adminButton = buttons[1];
    
    // 모든 패널 닫기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.style.display === 'block' || panel.classList.contains('active')) {
        panel.classList.remove('active');
        panel.style.display = 'none';
        adminButton.classList.remove('active');
    } else {
        panel.classList.add('active');
        panel.style.display = 'block';
        adminButton.classList.add('active');
    }
}

// === 이미지 처리 함수들 ===
function handleFileSelect(fileInput) {
    if (!fileInput || !fileInput.files) {
        console.log('파일 입력 없음');
        return;
    }
    
    const files = fileInput.files;
    console.log('📁 파일 선택됨:', files.length, '개');
    
    uploadedImages = [];
    
    Array.from(files).forEach((file, index) => {
        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            alert(`이미지 ${file.name}이 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.`);
            return;
        }
        
        // 파일 타입 체크
        if (!file.type.startsWith('image/')) {
            alert(`파일 ${file.name}은 이미지가 아닙니다. 이미지 파일을 선택해주세요.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages.push({
                url: e.target.result,
                name: file.name,
                file: file
            });
            updateImagePreview();
            validateForm();
            console.log(`✅ 이미지 ${index + 1} 로드 완료: ${file.name}`);
        };
        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const uploadText = document.getElementById('uploadText');
    
    if (!container) return;
    
    if (uploadedImages.length === 0) {
        container.innerHTML = '';
        if (uploadText) uploadText.style.display = 'block';
        return;
    }
    
    container.innerHTML = uploadedImages.map((imageData, index) => {
        return `<div style="position: relative; display: inline-block; margin: 5px;">
            <img src="${imageData.url}" alt="${imageData.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
            <button type="button" onclick="removeImage(${index})" style="position: absolute; top: -8px; right: -8px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; font-weight: bold;">&times;</button>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 2px; text-align: center; border-radius: 0 0 8px 8px;">${imageData.name}</div>
        </div>`;
    }).join('');
    
    if (uploadText) uploadText.style.display = 'none';
    
    console.log('🖼️ 이미지 미리보기 업데이트:', uploadedImages.length, '개');
}

function removeImage(index) {
    console.log('🖱️ 이미지 제거:', index);
    if (uploadedImages[index]) {
        uploadedImages.splice(index, 1);
        updateImagePreview();
        validateForm();
    }
}

// === 폼 검증 및 제출 ===
function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim();
    const grade = document.getElementById('studentGrade')?.value;
    const category = document.getElementById('artworkCategory')?.value;
    const description = document.getElementById('artworkDescription')?.value.trim();
    
    let passwordValid = true;
    if (siteSettings.requireUploadPassword && !isAdmin && !isEditMode) {
        const inputPassword = document.getElementById('uploadPasswordInput')?.value;
        passwordValid = inputPassword === siteSettings.uploadPassword;
    }
    
    const isValid = title && grade && category && description && 
                   uploadedImages.length > 0 && !isUploading && passwordValid;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.5';
    }
    
    return isValid;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('📝 폼 제출 시도');
    
    // 비밀번호 확인 (수정 모드가 아닐 때만)
    if (!isEditMode && siteSettings.requireUploadPassword && !isAdmin) {
        const inputPassword = document.getElementById('uploadPasswordInput')?.value;
        if (!inputPassword || inputPassword !== siteSettings.uploadPassword) {
            alert('❌ 등록 비밀번호가 올바르지 않습니다.');
            return;
        }
        console.log('✅ 비밀번호 확인 완료');
    }
    
    if (!validateForm()) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = isEditMode ? '수정 중...' : '등록 중...';

    try {
        if (isEditMode) {
            // 수정 모드
            await handleEditSubmit();
        } else {
            // 새 등록 모드
            await handleNewSubmit();
        }
        
        // 성공 처리
        resetForm();
        toggleUploadPanel();
        updateCounts();
        
    } catch (error) {
        console.error('❌ 작품 처리 오류:', error);
        alert('작품 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleEditSubmit() {
    try {
        const existingArtwork = allArtworks.find(a => a.id === editingArtworkId);
        if (!existingArtwork) {
            throw new Error('수정할 작품을 찾을 수 없습니다.');
        }
        
        console.log('📤 수정 모드 이미지 처리 시작...');
        
        // 새로운 이미지가 있는지 확인하고 Firebase Storage에 업로드
        const imageUrls = [];
        for (let i = 0; i < uploadedImages.length; i++) {
            const imageData = uploadedImages[i];
            if (imageData.file) {
                // 새로운 이미지 파일인 경우 Storage에 업로드
                try {
                    const downloadURL = await uploadImageToStorage(imageData.file, editingArtworkId);
                    imageUrls.push(downloadURL);
                    console.log(`✅ 새 이미지 ${i + 1} 업로드 완료: ${downloadURL}`);
                } catch (error) {
                    console.error(`❌ 새 이미지 ${i + 1} 업로드 실패:`, error);
                    throw new Error(`새 이미지 업로드에 실패했습니다: ${error.message}`);
                }
            } else {
                // 기존 이미지 URL인 경우
                imageUrls.push(imageData.url);
                console.log(`📸 기존 이미지 ${i + 1} 유지: ${imageData.url}`);
            }
        }
        
        if (imageUrls.length === 0) {
            throw new Error('업로드할 이미지가 없습니다.');
        }
        
        const updatedArtwork = {
            ...existingArtwork,
            title: document.getElementById('artworkTitle').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink')?.value.trim() || '',
            imageUrls: imageUrls,
            lastModified: new Date().toISOString()
        };
        
        console.log('💾 수정할 작품 데이터:', updatedArtwork);
        
        // 로컬 데이터에서 업데이트
        const index = allArtworks.findIndex(a => a.id === editingArtworkId);
        if (index !== -1) {
            allArtworks[index] = updatedArtwork;
        }
        
        // UI에서 업데이트
        updateArtworkInGallery(updatedArtwork);
        
        // Firebase에 저장
        if (db) {
            try {
                await updateArtworkInFirebase(editingArtworkId, updatedArtwork);
                console.log('✅ Firebase Firestore에 작품 수정 완료');
            } catch (error) {
                console.error('Firebase 업데이트 실패:', error);
                throw new Error('데이터베이스 수정에 실패했습니다.');
            }
        }
        
        alert(`✅ "${updatedArtwork.title}" 작품이 성공적으로 수정되었습니다!\n\n새로운 이미지가 Firebase Storage에 업로드되고, 작품 정보가 데이터베이스에 업데이트되었습니다.`);
        console.log('✅ 작품 수정 완료');
        
    } catch (error) {
        console.error('❌ 작품 수정 실패:', error);
        alert(`작품 수정에 실패했습니다:\n\n${error.message}`);
        throw error;
    }
}

async function handleNewSubmit() {
    try {
        // 작품 ID 생성
        const artworkId = `artwork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('📤 이미지 업로드 시작...');
        
        // 이미지를 Firebase Storage에 업로드
        const imageUrls = [];
        for (let i = 0; i < uploadedImages.length; i++) {
            const imageData = uploadedImages[i];
            if (imageData.file) {
                try {
                    const downloadURL = await uploadImageToStorage(imageData.file, artworkId);
                    imageUrls.push(downloadURL);
                    console.log(`✅ 이미지 ${i + 1} 업로드 완료: ${downloadURL}`);
                } catch (error) {
                    console.error(`❌ 이미지 ${i + 1} 업로드 실패:`, error);
                    throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
                }
            } else {
                // 이미 URL인 경우 (수정 모드에서 기존 이미지)
                imageUrls.push(imageData.url);
            }
        }
        
        if (imageUrls.length === 0) {
            throw new Error('업로드할 이미지가 없습니다.');
        }
        
        const formData = {
            id: artworkId,
            title: document.getElementById('artworkTitle').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink')?.value.trim() || '',
            imageUrls: imageUrls,
            uploadDate: new Date().toISOString(),

        };
        
        console.log('💾 저장할 작품 데이터:', formData);
        
        // 로컬 데이터에 추가
        allArtworks.unshift(formData);
        
        // UI에 즉시 추가
        addArtworkToGallery(formData);
        
        // Firebase Firestore에 저장
        if (db) {
            try {
                await saveArtworkToFirebase(formData);
                console.log('✅ Firebase Firestore에 작품 저장 완료');
            } catch (error) {
                console.error('Firebase Firestore 저장 실패:', error);
                throw new Error('데이터베이스 저장에 실패했습니다.');
            }
        }
        
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!\n\n이미지가 Firebase Storage에 업로드되고, 작품 정보가 데이터베이스에 저장되었습니다.`);
        console.log('✅ 작품 등록 완료');
        
    } catch (error) {
        console.error('❌ 새 작품 등록 실패:', error);
        alert(`작품 등록에 실패했습니다:\n\n${error.message}`);
        throw error;
    }
}



// === Firebase 함수들 ===
// 이미지를 Firebase Storage에 업로드
async function uploadImageToStorage(imageFile, artworkId) {
    try {
        if (!storage) {
            throw new Error('Firebase Storage가 초기화되지 않았습니다.');
        }
        
        const fileName = `artworks/${artworkId}/${Date.now()}_${imageFile.name}`;
        const storageRef = storage.ref().child(fileName);
        
        console.log('📤 이미지 업로드 시작:', fileName);
        
        const snapshot = await storageRef.put(imageFile);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log('✅ 이미지 업로드 성공:', downloadURL);
        return downloadURL;
        
    } catch (error) {
        console.error('❌ 이미지 업로드 실패:', error);
        
        // Firebase Storage 규칙 오류인 경우 안내
        if (error.code === 'storage/unauthorized') {
            throw new Error('Firebase Storage 접근 권한이 없습니다. Firebase 콘솔에서 Storage 규칙을 수정해야 합니다.');
        } else if (error.code === 'storage/quota-exceeded') {
            throw new Error('Firebase Storage 용량이 초과되었습니다.');
        } else {
            throw new Error(`이미지 업로드 실패: ${error.message}`);
        }
    }
}

// Firebase에 작품 저장
async function saveArtworkToFirebase(artwork) {
    try {
        if (!db) {
            throw new Error('Firebase가 초기화되지 않았습니다.');
        }
        
        console.log('💾 Firebase Firestore에 작품 저장 중...');
        
        // 작품 ID를 문서 ID로 사용하여 저장
        const docRef = await db.collection('artworks').doc(artwork.id).set({
            ...artwork,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firebase에 작품 저장 성공 (문서 ID:', artwork.id, ')');
        return artwork.id;
        
    } catch (error) {
        console.error('❌ Firebase 저장 오류:', error);
        
        // 권한 오류인 경우 상세 안내
        if (error.code === 'permission-denied') {
            const errorMsg = 'Firebase 권한 오류가 발생했습니다.\n\nFirebase 콘솔에서 Firestore 보안 규칙을 수정해야 합니다.\n\n자세한 내용은 개발자 도구 콘솔을 확인하세요.';
            console.error('🔒 Firebase 권한 오류:', errorMsg);
            throw new Error(errorMsg);
        }
        
        throw error;
    }
}

async function loadArtworksFromFirebase() {
    try {
        if (!db) {
            throw new Error('Firebase가 초기화되지 않았습니다.');
        }
        
        console.log('📡 Firebase에서 작품 데이터 요청 중...');
        
        const snapshot = await db.collection('artworks')
            .orderBy('createdAt', 'desc')
            .get();
        
        const artworks = [];
        snapshot.forEach(doc => {
            artworks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 순서 정보가 있는 경우 순서대로 정렬, 없는 경우 생성일 기준으로 정렬
        artworks.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            } else if (a.order !== undefined) {
                return -1; // 순서가 있는 작품을 앞으로
            } else if (b.order !== undefined) {
                return 1; // 순서가 있는 작품을 앞으로
            } else {
                // 둘 다 순서가 없는 경우 생성일 기준으로 정렬
                const dateA = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) : new Date(0);
                return dateB - dateA;
            }
        });
        
        console.log('✅ Firebase에서 작품 로드 성공:', artworks.length, '개');
        return artworks;
        
    } catch (error) {
        console.error('❌ Firebase 로드 오류:', error);
        
        // 권한 오류인 경우 상세 안내
        if (error.code === 'permission-denied') {
            console.error('🔒 Firebase 권한 오류 - Firestore 규칙을 확인하세요:');
            console.error('1. Firebase 콘솔 → Firestore Database → 규칙');
            console.error('2. 다음 규칙으로 설정:');
            console.error(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
            `);
            console.error('3. 게시 버튼 클릭');
            
            // 사용자에게도 안내
            alert('Firebase 권한 오류가 발생했습니다.\n\nFirebase 콘솔에서 Firestore 보안 규칙을 수정해야 합니다.\n\n자세한 내용은 개발자 도구 콘솔을 확인하세요.');
        }
        
        return [];
    }
}

async function updateArtworkInFirebase(artworkId, updatedData) {
    try {
        if (!db) {
            throw new Error('Firebase가 초기화되지 않았습니다.');
        }
        
        console.log('📝 Firebase에서 작품 수정 중:', artworkId);
        
        // 작품 ID를 문서 ID로 사용하여 업데이트
        await db.collection('artworks').doc(artworkId).update({
            ...updatedData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firebase에서 작품 수정 성공:', artworkId);
        return true;
    } catch (error) {
        console.error('❌ Firebase 수정 오류:', error);
        throw error;
    }
}

async function deleteArtworkFromFirebase(artworkId) {
    try {
        if (!db) {
            throw new Error('Firebase가 초기화되지 않았습니다.');
        }
        
        console.log('🗑️ Firebase에서 작품 삭제 시도 (문서 ID:', artworkId, ')');
        
        // 작품 ID를 문서 ID로 사용하여 직접 삭제
        await db.collection('artworks').doc(artworkId).delete();
        console.log('✅ Firebase에서 작품 삭제 성공:', artworkId);
        return true;
        
    } catch (error) {
        console.error('❌ Firebase 삭제 오류:', error);
        
        // 문서가 존재하지 않는 경우에도 성공으로 처리
        if (error.code === 'not-found') {
            console.log('⚠️ Firebase에서 해당 문서를 찾을 수 없음 (이미 삭제됨):', artworkId);
            return true;
        }
        
        throw error;
    }
}

// === 데이터 로드 ===
async function loadArtworks() {
    try {
        updateConnectionStatus('connecting', 'Firebase 연결 중...');
        
        // Firebase 초기화 확인
        if (!initializeFirebase()) {
            setTimeout(() => {
                            if (initializeFirebase()) {
                loadArtworks();
            } else {
                updateConnectionStatus('disconnected', 'Firebase 초기화 실패');
            }
            }, 1000);
            return;
        }
        
        // Firebase에서 데이터 로드
        allArtworks = await loadArtworksFromFirebase();
        
        if (allArtworks.length > 0) {
            console.log('📊 Firebase에서 작품 로드 완료:', allArtworks.length, '개');
            console.log('📊 로드된 작품 ID들:', allArtworks.map(a => a.id));
        } else {
            console.log('📊 새로운 갤러리 시작');
        }
        
        renderAllArtworks();
        updateCounts();
        updateConnectionStatus('connected', `Firebase 연결됨 - ${allArtworks.length}개 작품`);
        
    } catch (error) {
        console.error('Firebase 데이터 로드 오류:', error);
        updateConnectionStatus('disconnected', 'Firebase 연결 실패');
    }
}

// === UI 업데이트 함수들 ===
function updateConnectionStatus(status, message) {
    const statusEl = document.getElementById('firebaseStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    isConnected = status === 'connected';
    validateForm();
}

function updateStorageStatus(status, message) {
    const storageEl = document.getElementById('storageStatus');
    if (storageEl) {
        storageEl.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
}

function updateCounts() {
    const counts = {
        all: allArtworks.length,
        activity: allArtworks.filter(a => a.category === 'activity').length,
        worksheet: allArtworks.filter(a => a.category === 'worksheet').length,
        result: allArtworks.filter(a => a.category === 'result').length
    };
    
    // 카운트 업데이트
    Object.keys(counts).forEach(type => {
        const countEl = document.getElementById(`${type}Count`);
        if (countEl) countEl.textContent = `${counts[type]}개 작품`;
    });
    
    // 총 작품 수 업데이트
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) totalCountEl.textContent = allArtworks.length;
}

function renderAllArtworks() {
    const galleries = {
        galleryGrid: document.getElementById('galleryGrid'),
        activityGallery: document.getElementById('activityGallery'),
        worksheetGallery: document.getElementById('worksheetGallery'),
        resultGallery: document.getElementById('resultGallery')
    };
    
    // 모든 갤러리 초기화
    Object.values(galleries).forEach(gallery => {
        if (gallery) gallery.innerHTML = '';
    });
    
    // 작품들을 갤러리에 추가
    allArtworks.forEach((artwork, index) => {
        setTimeout(() => {
            const element = createArtworkElement(artwork);
            if (!element) return;
            
            // 전체 갤러리에 추가
            if (galleries.galleryGrid) {
                const clone1 = element.cloneNode(true);
                galleries.galleryGrid.appendChild(clone1);
                setTimeout(() => clone1.classList.add('show'), 100);
                
                // 관리자 모드일 때 컨트롤 표시 강제 적용
                if (checkAdminStatus()) {
                    setTimeout(() => {
                        const adminControlsElement = clone1.querySelector('.admin-controls');
                        if (adminControlsElement) {
                            adminControlsElement.style.display = 'flex';
                            adminControlsElement.style.visibility = 'visible';
                            adminControlsElement.style.opacity = '1';
                        }
                    }, 200);
                }
            }
            
            // 카테고리별 갤러리에 추가
            const categoryGallery = galleries[`${artwork.category}Gallery`];
            if (categoryGallery) {
                const clone2 = element.cloneNode(true);
                categoryGallery.appendChild(clone2);
                setTimeout(() => clone2.classList.add('show'), 100);
                
                // 관리자 모드일 때 컨트롤 표시 강제 적용
                if (checkAdminStatus()) {
                    setTimeout(() => {
                        const adminControlsElement = clone2.querySelector('.admin-controls');
                        if (adminControlsElement) {
                            adminControlsElement.style.display = 'flex';
                            adminControlsElement.style.visibility = 'visible';
                            adminControlsElement.style.opacity = '1';
                        }
                    }, 200);
                }
            }
        }, index * 30);
    });
    
    // 드래그 앤 드롭 기능 초기화 (관리자 모드일 때만)
    if (isAdmin) {
        initializeSortable();
    }
    
    // 관리자 UI 업데이트
    setTimeout(() => {
        updateAdminUI();
    }, 100);
}

// Sortable.js 초기화 함수
function initializeSortable() {
    console.log('🔄 Sortable 초기화 시작');
    
    // 기존 Sortable 인스턴스들 제거
    sortableInstances.forEach(instance => {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    });
    sortableInstances = [];
    
    // 전체 갤러리에 Sortable 적용
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid) {
        const sortable = new Sortable(galleryGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onStart: function(evt) {
                console.log('🖱️ 드래그 시작:', evt.item.dataset.artworkId);
                evt.item.style.opacity = '0.8';
            },
            onEnd: function(evt) {
                console.log('🖱️ 드래그 종료:', evt.item.dataset.artworkId);
                evt.item.style.opacity = '1';
                
                // 순서 변경 알림
                if (evt.oldIndex !== evt.newIndex) {
                    console.log(`📊 작품 순서 변경: ${evt.oldIndex} → ${evt.newIndex}`);
                    showOrderChangeNotification();
                }
            }
        });
        sortableInstances.push(sortable);
        console.log('✅ 전체 갤러리 Sortable 초기화 완료');
    }
    
    // 카테고리별 갤러리에도 Sortable 적용
    const categoryGalleries = ['activityGallery', 'worksheetGallery', 'resultGallery'];
    categoryGalleries.forEach(galleryId => {
        const gallery = document.getElementById(galleryId);
        if (gallery) {
            const sortable = new Sortable(gallery, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onStart: function(evt) {
                    evt.item.style.opacity = '0.8';
                },
                onEnd: function(evt) {
                    evt.item.style.opacity = '1';
                    if (evt.oldIndex !== evt.newIndex) {
                        showOrderChangeNotification();
                    }
                }
            });
            sortableInstances.push(sortable);
            console.log(`✅ ${galleryId} Sortable 초기화 완료`);
        }
    });
    
    console.log('✅ 모든 Sortable 인스턴스 초기화 완료');
}

// 순서 변경 알림 표시
function showOrderChangeNotification() {
    // 기존 알림이 있다면 제거
    const existingNotification = document.querySelector('.order-change-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'order-change-notification';
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px;">
            <span>🔄 작품 순서가 변경되었습니다. "순서 저장" 버튼을 클릭하여 저장하세요.</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-size: 16px;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function createArtworkElement(artwork) {
    if (!artwork.imageUrls || artwork.imageUrls.length === 0) return null;

    console.log('🎨 작품 카드 생성 중:', artwork.id, artwork.title);
    
    const element = document.createElement('div');
    element.className = 'artwork-card';
    element.dataset.artworkId = artwork.id;
    element.dataset.category = artwork.category;
    
    console.log('🎨 작품 카드 dataset 설정:', {
        artworkId: element.dataset.artworkId,
        category: element.dataset.category
    });
    
    const uploadDate = new Date(artwork.uploadDate).toLocaleDateString('ko-KR');
    const imageCount = artwork.imageUrls.length > 1 ? 
        `<span class="artwork-type">${artwork.imageUrls.length}장</span>` : '';
    
    // 관리자 상태 확인
    const isAdminMode = checkAdminStatus();
    console.log('🔍 작품 카드 생성 - 관리자 모드:', isAdminMode);
    
    // 관리자 모드일 때 드래그 핸들과 컨트롤 추가
    const dragHandle = isAdminMode ? '<div class="drag-handle" style="position: absolute; top: 10px; left: 10px; background: rgba(255, 255, 255, 0.9); color: #666; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: grab; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10;">🔄</div>' : '';
    const adminControls = isAdminMode ? `
        <div class="admin-controls" style="position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 5px; background: rgba(255, 255, 255, 0.98); padding: 8px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255, 255, 255, 0.8);">
            <button class="btn btn-warning btn-small admin-edit-btn" data-artwork-id="${artwork.id}" onclick="editArtwork('${artwork.id}')" style="margin-bottom: 5px; background: #ffc107; color: #212529; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; min-width: 50px; font-size: 0.75rem;">수정</button>
            <button class="btn btn-danger btn-small admin-delete-btn" data-artwork-id="${artwork.id}" onclick="deleteArtwork('${artwork.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; min-width: 50px; font-size: 0.75rem;">삭제</button>
        </div>
    ` : '';
    
    console.log('🔧 관리자 컨트롤 HTML 생성:', {
        isAdminMode: isAdminMode,
        artworkId: artwork.id,
        hasControls: !!adminControls
    });
    
    console.log('🔧 관리자 컨트롤 HTML:', adminControls ? '생성됨' : '생성되지 않음');

    element.innerHTML = `
        <div class="artwork-image" onclick="showArtworkDetail('${artwork.id}')">
            <img src="${artwork.imageUrls[0]}" alt="${artwork.title}" loading="lazy" 
                 style="width: 100%; height: 100%; object-fit: cover;">
            ${imageCount}
            ${adminControls}
        </div>
        <div class="artwork-info">
            <div class="artwork-header" onclick="showArtworkDetail('${artwork.id}')">
                ${dragHandle}
                <h3 class="artwork-title">${artwork.title}</h3>
                <p class="artwork-author">${artwork.grade}</p>
                <p class="artwork-description">${artwork.description}</p>
                <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
            </div>
        </div>
    `;
    
    // 관리자 모드일 때 컨트롤 표시 강제 적용
    if (isAdminMode) {
        setTimeout(() => {
            const adminControlsElement = element.querySelector('.admin-controls');
            if (adminControlsElement) {
                adminControlsElement.style.display = 'flex';
                adminControlsElement.style.visibility = 'visible';
                adminControlsElement.style.opacity = '1';
                console.log('✅ 관리자 컨트롤 강제 표시 완료');
            }
        }, 100);
    }
    
    return element;
}

function addArtworkToGallery(artwork) {
    const galleries = ['galleryGrid', 'activityGallery', 'worksheetGallery', 'resultGallery'];
    
    galleries.forEach(galleryId => {
        const gallery = document.getElementById(galleryId);
        if (!gallery) return;
        
        if (galleryId === 'galleryGrid' || galleryId === `${artwork.category}Gallery`) {
            const element = createArtworkElement(artwork);
            if (element) {
                gallery.appendChild(element);
                setTimeout(() => element.classList.add('show'), 100);
                
                // 관리자 모드일 때 컨트롤 표시 강제 적용
                if (checkAdminStatus()) {
                    setTimeout(() => {
                        const adminControlsElement = element.querySelector('.admin-controls');
                        if (adminControlsElement) {
                            adminControlsElement.style.display = 'flex';
                            adminControlsElement.style.visibility = 'visible';
                            adminControlsElement.style.opacity = '1';
                            console.log('✅ 갤러리 추가 시 관리자 컨트롤 강제 표시 완료');
                        }
                    }, 200);
                }
            }
        }
    });
}

function updateArtworkInGallery(updatedArtwork) {
    const artworkElements = document.querySelectorAll(`[data-artwork-id="${updatedArtwork.id}"]`);
    
    artworkElements.forEach(element => {
        const newElement = createArtworkElement(updatedArtwork);
        if (newElement) {
            element.parentNode.replaceChild(newElement, element);
            setTimeout(() => newElement.classList.add('show'), 100);
            
            // 관리자 모드일 때 컨트롤 표시 강제 적용
            if (checkAdminStatus()) {
                setTimeout(() => {
                    const adminControlsElement = newElement.querySelector('.admin-controls');
                    if (adminControlsElement) {
                        adminControlsElement.style.display = 'flex';
                        adminControlsElement.style.visibility = 'visible';
                        adminControlsElement.style.opacity = '1';
                        console.log('✅ 갤러리 업데이트 시 관리자 컨트롤 강제 표시 완료');
                    }
                }, 200);
            }
        }
    });
    
    console.log('🔄 갤러리에서 작품 업데이트 완료:', updatedArtwork.title);
}

// === 검색 및 필터 함수들 ===
// 검색 기능
function performSearch(searchTerm) {
    console.log('🔍 검색 실행:', searchTerm);
    
    if (!searchTerm.trim()) {
        // 검색어가 없으면 모든 작품 표시
        showAllArtworks();
        return;
    }
    
    const searchResults = allArtworks.filter(artwork => {
        const searchLower = searchTerm.toLowerCase();
        return (
            artwork.title.toLowerCase().includes(searchLower) ||
            artwork.grade.toLowerCase().includes(searchLower) ||
            artwork.description.toLowerCase().includes(searchLower) ||
            artwork.category.toLowerCase().includes(searchLower)
        );
    });
    
    console.log(`🔍 검색 결과: ${searchResults.length}개 작품`);
    displaySearchResults(searchResults, searchTerm);
}

// 검색 결과 표시
function displaySearchResults(results, searchTerm) {
    const galleries = {
        galleryGrid: document.getElementById('galleryGrid'),
        activityGallery: document.getElementById('activityGallery'),
        worksheetGallery: document.getElementById('worksheetGallery'),
        resultGallery: document.getElementById('resultGallery')
    };
    
    // 모든 갤러리 초기화
    Object.values(galleries).forEach(gallery => {
        if (gallery) gallery.innerHTML = '';
    });
    
    if (results.length === 0) {
        // 검색 결과가 없을 때
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>🔍 검색 결과가 없습니다</h3>
                <p>"${searchTerm}"에 대한 검색 결과를 찾을 수 없습니다.</p>
                <p>다른 검색어를 시도해보세요.</p>
            </div>
        `;
        galleries.galleryGrid.appendChild(noResultsMsg);
        return;
    }
    
    // 검색 결과를 갤러리에 추가
    results.forEach((artwork, index) => {
        setTimeout(() => {
            const element = createArtworkElement(artwork);
            if (!element) return;
            
            // 전체 갤러리에 추가
            if (galleries.galleryGrid) {
                const clone1 = element.cloneNode(true);
                galleries.galleryGrid.appendChild(clone1);
                setTimeout(() => clone1.classList.add('show'), 100);
                
                // 관리자 모드일 때 컨트롤 표시 강제 적용
                if (checkAdminStatus()) {
                    setTimeout(() => {
                        const adminControlsElement = clone1.querySelector('.admin-controls');
                        if (adminControlsElement) {
                            adminControlsElement.style.display = 'flex';
                            adminControlsElement.style.visibility = 'visible';
                            adminControlsElement.style.opacity = '1';
                        }
                    }, 200);
                }
            }
            
            // 카테고리별 갤러리에 추가
            const categoryGallery = galleries[`${artwork.category}Gallery`];
            if (categoryGallery) {
                const clone2 = element.cloneNode(true);
                categoryGallery.appendChild(clone2);
                setTimeout(() => clone2.classList.add('show'), 100);
                
                // 관리자 모드일 때 컨트롤 표시 강제 적용
                if (checkAdminStatus()) {
                    setTimeout(() => {
                        const adminControlsElement = clone2.querySelector('.admin-controls');
                        if (adminControlsElement) {
                            adminControlsElement.style.display = 'flex';
                            adminControlsElement.style.visibility = 'visible';
                            adminControlsElement.style.opacity = '1';
                        }
                    }, 200);
                }
            }
        }, index * 30);
    });
    
    // 검색 결과 수 표시
    updateSearchResultCount(results.length, searchTerm);
}

// 검색 결과 수 업데이트
function updateSearchResultCount(count, searchTerm) {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        let resultCountEl = searchContainer.querySelector('.search-result-count');
        if (!resultCountEl) {
            resultCountEl = document.createElement('div');
            resultCountEl.className = 'search-result-count';
            resultCountEl.style.cssText = 'margin-top: 10px; font-size: 14px; color: #666; text-align: center;';
            searchContainer.appendChild(resultCountEl);
        }
        resultCountEl.textContent = `"${searchTerm}"에 대한 검색 결과: ${count}개 작품`;
    }
}

// 모든 작품 표시 (검색 초기화)
function showAllArtworks() {
    console.log('🔄 모든 작품 표시');
    renderAllArtworks();
    
    // 검색 결과 수 제거
    const resultCountEl = document.querySelector('.search-result-count');
    if (resultCountEl) {
        resultCountEl.remove();
    }
}

// 학년별 정보 표시 (단순화)
function updateGradeInfo() {
    // 학년별 정보 섹션을 표시하고 기본적으로 전체 학년 설명 표시
    const gradeInfoSection = document.getElementById('gradeInfoSection');
    if (gradeInfoSection) {
        gradeInfoSection.style.display = 'block';
        
        // 모든 학년별 정보를 숨기고 전체 학년만 표시
        const allGradeInfos = document.querySelectorAll('.grade-info-content');
        allGradeInfos.forEach(info => {
            info.style.display = 'none';
        });
        
        const allGradeInfo = document.getElementById('gradeInfoAll');
        if (allGradeInfo) {
            allGradeInfo.style.display = 'block';
        }
        
        console.log('✅ 학년별 정보 섹션 표시 (전체 학년 기본 표시)');
    }
}

// 필터에 따른 학년별 정보 업데이트 (단순화)
function updateGradeInfoForFilter(grade) {
    try {
        console.log('🎯 학년별 정보 업데이트 시작:', grade);
        
        // 모든 학년별 정보 섹션을 숨김
        const allGradeInfos = document.querySelectorAll('.grade-info-content');
        allGradeInfos.forEach(info => {
            info.style.display = 'none';
        });
        
        // 선택된 학년의 정보 섹션만 표시
        let targetId = 'gradeInfoAll'; // 기본값
        
        if (grade === 'all') {
            targetId = 'gradeInfoAll';
        } else if (grade === '1학년') {
            targetId = 'gradeInfo1';
        } else if (grade === '2학년') {
            targetId = 'gradeInfo2';
        } else if (grade === '3학년') {
            targetId = 'gradeInfo3';
        } else if (grade === '4학년') {
            targetId = 'gradeInfo4';
        } else if (grade === '5학년') {
            targetId = 'gradeInfo5';
        } else if (grade === '6학년') {
            targetId = 'gradeInfo6';
        }
        
        const targetInfo = document.getElementById(targetId);
        if (targetInfo) {
            targetInfo.style.display = 'block';
            console.log('✅ 학년별 정보 섹션 활성화:', grade, targetId);
        }
        
    } catch (error) {
        console.error('필터별 학년 정보 업데이트 실패:', error);
    }
}

// === 기타 함수들 ===
function applyGradeFilter(grade) {
    console.log('🎯 학년 필터 적용:', grade);
    
    const allCards = document.querySelectorAll('.artwork-card');
    let visibleCount = 0;
    
    // 모든 카드 숨기기
    allCards.forEach(card => {
        card.style.display = 'none';
    });
    
    // 필터에 맞는 카드만 표시
    allCards.forEach(card => {
        const artwork = allArtworks.find(a => a.id === card.dataset.artworkId);
        if (!artwork) return;
        
        let shouldShow = false;
        
        if (grade === 'all') {
            shouldShow = true;
        } else {
            shouldShow = artwork.grade === grade;
        }
        
        if (shouldShow) {
            card.style.display = 'block';
            visibleCount++;
        }
    });
    
    // 학년별 정보 섹션 업데이트
    updateGradeInfoForFilter(grade);
    
    console.log(`✅ 필터 결과: ${visibleCount}개 작품 표시`);
}



// 작품 분류 탭 전환
function switchTypeTab(type) {
    console.log('🔄 작품 분류 탭 전환:', type);
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.type-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 모든 탭 비활성화
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 선택된 섹션과 탭 활성화
    const targetSection = document.getElementById(`${type}Section`);
    const targetTab = document.querySelector(`[data-type="${type}"]`);
    
    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
    
    console.log(`✅ ${type} 탭으로 전환 완료`);
}

// 관리자 탭 전환
function switchAdminTab(tabName) {
    console.log('🔄 관리자 탭 전환:', tabName);
    
    // 모든 탭 비활성화
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 모든 콘텐츠 숨기기
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭과 콘텐츠 활성화
    const targetTab = document.querySelector(`[onclick="switchAdminTab('${tabName}')"]`);
    const targetContent = document.getElementById(`${tabName}Content`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
    
    console.log(`✅ ${tabName} 탭으로 전환 완료`);
}

// 작품 수정 모드
function editArtwork(artworkId) {
    console.log('✏️ 작품 수정 모드 시작:', artworkId);
    console.log('📊 allArtworks 배열:', allArtworks);
    console.log('📊 allArtworks 길이:', allArtworks.length);
    
    // 관리자 상태 확인
    if (!checkAdminStatus()) {
        alert('❌ 관리자 권한이 필요합니다. 관리자 모드로 로그인해주세요.');
        return;
    }
    
    // 작품 ID 유효성 검사
    if (!artworkId || artworkId === 'undefined' || artworkId === 'null') {
        console.error('❌ 작품 ID가 없습니다:', artworkId);
        alert('작품 ID가 유효하지 않습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    // 작품 ID 정리 (공백 제거)
    artworkId = artworkId.toString().trim();
    
    // allArtworks 배열 상태 확인
    if (!allArtworks || allArtworks.length === 0) {
        console.error('❌ allArtworks 배열이 비어있습니다');
        alert('작품 데이터가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    console.log('🔍 작품 검색 중... ID:', artworkId, '타입:', typeof artworkId);
    
    // allArtworks 배열의 각 작품 ID 확인
    allArtworks.forEach((artwork, index) => {
        console.log(`작품 ${index}: ID="${artwork.id}" (타입: ${typeof artwork.id})`);
    });
    
    // 작품 찾기 (타입 변환 포함)
    let artwork = allArtworks.find(a => a.id === artworkId);
    
    // 타입이 다른 경우를 대비해 문자열로도 검색
    if (!artwork) {
        artwork = allArtworks.find(a => String(a.id) === String(artworkId));
    }
    
    if (!artwork) {
        console.error('❌ 작품을 찾을 수 없음. 검색한 ID:', artworkId);
        console.error('❌ 사용 가능한 ID들:', allArtworks.map(a => a.id));
        alert(`수정할 작품을 찾을 수 없습니다.\n\n검색한 ID: ${artworkId}\n사용 가능한 ID: ${allArtworks.map(a => a.id).join(', ')}`);
        return;
    }
    
    console.log('📝 수정할 작품 정보:', artwork);
    
    // 수정 모드 활성화
    isEditMode = true;
    editingArtworkId = artworkId;
    
    // 폼에 기존 데이터 채우기
    const titleInput = document.getElementById('artworkTitle');
    const gradeInput = document.getElementById('studentGrade');
    const categoryInput = document.getElementById('artworkCategory');
    const descriptionInput = document.getElementById('artworkDescription');
    const linkInput = document.getElementById('artworkLink');
    
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
    uploadedImages = artwork.imageUrls.map(url => ({
        url: url,
        name: '기존 이미지',
        file: null
    }));
    updateImagePreview();
    console.log('✅ 이미지 미리보기 설정 완료:', uploadedImages.length, '개');
    
    // UI 업데이트
    const panelTitle = document.getElementById('uploadPanelTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
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
}

// 작품 수정 취소
function cancelEdit() {
    console.log('❌ 작품 수정 취소');
    resetEditMode();
}

// 작품 삭제
async function deleteArtwork(artworkId) {
    console.log('🗑️ 작품 삭제 시도:', artworkId);
    console.log('📊 allArtworks 배열:', allArtworks);
    console.log('📊 allArtworks 길이:', allArtworks.length);
    
    // 관리자 상태 확인
    if (!checkAdminStatus()) {
        alert('❌ 관리자 권한이 필요합니다. 관리자 모드로 로그인해주세요.');
        return;
    }
    
    // 작품 ID 유효성 검사
    if (!artworkId || artworkId === 'undefined' || artworkId === 'null') {
        console.error('❌ 작품 ID가 없습니다:', artworkId);
        alert('작품 ID가 유효하지 않습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    // 작품 ID 정리 (공백 제거)
    artworkId = artworkId.toString().trim();
    
    // allArtworks 배열 상태 확인
    if (!allArtworks || allArtworks.length === 0) {
        console.error('❌ allArtworks 배열이 비어있습니다');
        alert('작품 데이터가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    console.log('🔍 작품 검색 중... ID:', artworkId, '타입:', typeof artworkId);
    
    // allArtworks 배열의 각 작품 ID 확인
    allArtworks.forEach((artwork, index) => {
        console.log(`작품 ${index}: ID="${artwork.id}" (타입: ${typeof artwork.id})`);
    });
    
    // 삭제할 작품 찾기 (타입 변환 포함)
    let artwork = allArtworks.find(a => a.id === artworkId);
    
    // 타입이 다른 경우를 대비해 문자열로도 검색
    if (!artwork) {
        artwork = allArtworks.find(a => String(a.id) === String(artworkId));
    }
    
    if (!artwork) {
        console.error('❌ 작품을 찾을 수 없음. 검색한 ID:', artworkId);
        console.error('❌ 사용 가능한 ID들:', allArtworks.map(a => a.id));
        alert(`삭제할 작품을 찾을 수 없습니다.\n\n검색한 ID: ${artworkId}\n사용 가능한 ID: ${allArtworks.map(a => a.id).join(', ')}`);
        return;
    }
    
    console.log('🗑️ 삭제할 작품 정보:', artwork.title);
    
    if (!confirm(`정말로 "${artwork.title}" 작품을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    try {
        // Firebase에서 삭제
        if (db) {
            console.log('🔥 Firebase에서 작품 삭제 중...');
            await deleteArtworkFromFirebase(artworkId);
            console.log('✅ Firebase에서 작품 삭제 완료');
        } else {
            console.log('⚠️ Firebase가 초기화되지 않아 로컬에서만 삭제');
        }
        
        // 로컬 데이터에서 제거
        const initialCount = allArtworks.length;
        allArtworks = allArtworks.filter(a => a.id !== artworkId);
        const removedCount = initialCount - allArtworks.length;
        console.log(`📊 로컬 데이터에서 ${removedCount}개 작품 제거됨`);
        
        // UI에서 제거
        const artworkElements = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        console.log(`🖼️ UI에서 ${artworkElements.length}개 요소 제거 중...`);
        
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
        
        // 갤러리 다시 렌더링
        setTimeout(() => {
            renderAllArtworks();
            console.log('🔄 갤러리 재렌더링 완료');
        }, 500);
        
        alert(`✅ "${artwork.title}" 작품이 성공적으로 삭제되었습니다!`);
        console.log('✅ 작품 삭제 완료');
        
    } catch (error) {
        console.error('❌ 작품 삭제 실패:', error);
        alert(`작품 삭제에 실패했습니다:\n\n${error.message}`);
    }
}

// 작품 등록 설정 저장
function saveSettings() {
    console.log('💾 설정 저장 시도');
    
    try {
        // 작품 등록 설정만 저장
        const newSettings = {
            requireUploadPassword: document.getElementById('requireUploadPassword')?.checked || false,
            uploadPassword: document.getElementById('uploadPassword')?.value || ''
        };
        
        // 로컬 스토리지에 저장
        localStorage.setItem('siteSettings', JSON.stringify(newSettings));
        
        // 설정 저장 후 비밀번호 필드 표시/숨김 업데이트
        updateUploadPasswordVisibility();
        
        alert('✅ 작품 등록 설정이 성공적으로 저장되었습니다!');
        console.log('✅ 설정 저장 완료');
        
    } catch (error) {
        console.error('❌ 설정 저장 실패:', error);
        alert(`설정 저장에 실패했습니다:\n\n${error.message}`);
    }
}







// 모든 데이터 초기화
async function resetAllData() {
    console.log('🗑️ 모든 데이터 초기화 시도');
    
    if (!confirm('정말로 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) {
        return;
    }
    
    try {
        // Firebase에서 모든 작품 삭제
        if (db) {
            const snapshot = await db.collection('artworks').get();
            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);
            console.log('✅ Firebase에서 모든 작품 삭제 완료');
        }
        
        // 로컬 데이터 초기화
        allArtworks = [];
        
        // UI 초기화
        renderAllArtworks();
        updateCounts();
        
        alert('✅ 모든 데이터가 성공적으로 초기화되었습니다!');
        console.log('✅ 데이터 초기화 완료');
        
    } catch (error) {
        console.error('❌ 데이터 초기화 실패:', error);
        alert('데이터 초기화에 실패했습니다.');
    }
}

// 데이터 내보내기
async function exportData() {
    console.log('📤 데이터 내보내기 시도');
    
    try {
        // Firebase에서 최신 데이터 가져오기
        let exportData = [];
        if (db) {
            exportData = await loadArtworksFromFirebase();
        } else {
            exportData = [...allArtworks];
        }
        
        // JSON 파일로 다운로드
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `artworks_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('✅ 데이터 내보내기 완료:', exportData.length, '개 작품');
        
    } catch (error) {
        console.error('❌ 데이터 내보내기 실패:', error);
        alert('데이터 내보내기에 실패했습니다.');
    }
}

// 작품 순서 저장
async function saveArtworkOrder() {
    console.log('💾 작품 순서 저장 시도');
    
    // 관리자 상태 확인
    if (!checkAdminStatus()) {
        alert('❌ 관리자 권한이 필요합니다. 관리자 모드로 로그인해주세요.');
        return;
    }
    
    try {
        // 현재 UI 순서대로 작품 순서 업데이트
        const galleryGrid = document.getElementById('galleryGrid');
        if (galleryGrid) {
            const artworkElements = galleryGrid.querySelectorAll('.artwork-card');
            const newOrder = [];
            
            artworkElements.forEach((element, index) => {
                const artworkId = element.dataset.artworkId;
                const artwork = allArtworks.find(a => a.id === artworkId);
                if (artwork) {
                    artwork.order = index;
                    newOrder.push(artwork);
                }
            });
            
            // Firebase에 순서 업데이트
            if (db) {
                console.log('🔥 Firebase에 순서 정보 업데이트 중...');
                const updatePromises = newOrder.map(artwork => 
                    db.collection('artworks').doc(artwork.id).update({ 
                        order: artwork.order,
                        lastModified: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
                await Promise.all(updatePromises);
                console.log('✅ Firebase에 순서 정보 업데이트 완료');
            }
            
            // 로컬 데이터 업데이트
            allArtworks = newOrder;
            
            // 카테고리별 갤러리도 동일한 순서로 업데이트
            updateCategoryGalleriesOrder(newOrder);
            
            alert('✅ 작품 순서가 성공적으로 저장되었습니다!');
            console.log('✅ 작품 순서 저장 완료');
            
            // 순서 변경 알림 제거
            const notification = document.querySelector('.order-change-notification');
            if (notification) {
                notification.remove();
            }
        }
        
    } catch (error) {
        console.error('❌ 작품 순서 저장 실패:', error);
        alert('작품 순서 저장에 실패했습니다.');
    }
}

// 카테고리별 갤러리 순서 업데이트
function updateCategoryGalleriesOrder(orderedArtworks) {
    const categoryGalleries = {
        'activity': document.getElementById('activityGallery'),
        'worksheet': document.getElementById('worksheetGallery'),
        'result': document.getElementById('resultGallery')
    };
    
    // 각 카테고리별로 작품들을 순서대로 정렬
    Object.keys(categoryGalleries).forEach(category => {
        const gallery = categoryGalleries[category];
        if (gallery) {
            // 해당 카테고리의 작품들만 필터링하여 순서대로 정렬
            const categoryArtworks = orderedArtworks.filter(artwork => artwork.category === category);
            
            // 기존 요소들 제거
            gallery.innerHTML = '';
            
            // 새로운 순서로 요소들 추가
            categoryArtworks.forEach(artwork => {
                const element = createArtworkElement(artwork);
                if (element) {
                    gallery.appendChild(element);
                    setTimeout(() => element.classList.add('show'), 100);
                }
            });
        }
    });
    
    console.log('✅ 카테고리별 갤러리 순서 업데이트 완료');
}

// 대량 작품 삭제
function bulkDeleteArtworks() {
    console.log('🗑️ 대량 작품 삭제 시도');
    
    // 관리자 상태 확인
    if (!checkAdminStatus()) {
        alert('❌ 관리자 권한이 필요합니다. 관리자 모드로 로그인해주세요.');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#artworksTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('삭제할 작품을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택된 ${checkboxes.length}개 작품을 정말로 삭제하시겠습니까?`)) {
        return;
    }
    
    // 선택된 작품들 삭제
    checkboxes.forEach(checkbox => {
        const artworkId = checkbox.closest('tr').dataset.artworkId;
        if (artworkId) {
            deleteArtwork(artworkId);
        }
    });
}



// 헤더 이미지 미리보기
function previewHeaderImage() {
    const fileInput = document.getElementById('headerImageFile');
    const preview = document.getElementById('headerImagePreview');
    const uploadText = document.getElementById('headerUploadText');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            uploadText.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
    }
}

// 헤더 이미지 제거
function removeHeaderImage() {
    const preview = document.getElementById('headerImagePreview');
    const uploadText = document.getElementById('headerUploadText');
    const fileInput = document.getElementById('headerImageFile');
    
    preview.style.display = 'none';
    uploadText.style.display = 'block';
    fileInput.value = '';
}

// 로컬에서 작품 등록 설정 불러오기
function loadSiteSettingsFromLocal() {
    try {
        console.log('📝 로컬에서 작품 등록 설정 로드 중...');
        
        // 로컬 스토리지에서 설정 불러오기
        const savedSettings = localStorage.getItem('siteSettings');
        
        if (savedSettings) {
            const localSettings = JSON.parse(savedSettings);
            console.log('✅ 로컬에서 작품 등록 설정 로드:', localSettings);
            
            // 설정 폼에 적용
            applySettingsToForm(localSettings);
            
            console.log('✅ 로컬에서 작품 등록 설정 로드 완료');
            return true;
        } else {
            console.log('📝 로컬에 저장된 설정이 없어 기본값을 사용합니다.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ 로컬 설정 로드 오류:', error);
        return false;
    }
}

// 학년별 설정을 폼에 적용
function applyGradeSettingsToForm(gradeSettings) {
    try {
        Object.keys(gradeSettings).forEach(gradeKey => {
            if (gradeKey === 'updatedAt') return; // Firebase 타임스탬프 제외
            
            const gradeInfo = gradeSettings[gradeKey];
            if (gradeInfo && gradeInfo.title) {
                const titleInput = document.getElementById(`${gradeKey}Title`);
                if (titleInput) titleInput.value = gradeInfo.title;
            }
            if (gradeInfo && gradeInfo.description) {
                const descInput = document.getElementById(`${gradeKey}Desc`);
                if (descInput) descInput.value = gradeInfo.description;
            }
        });
        
        console.log('✅ 학년별 설정을 폼에 적용 완료');
        
    } catch (error) {
        console.error('❌ 학년별 설정 폼 적용 실패:', error);
    }
}

// 작품 등록 설정을 폼에 적용
function applySettingsToForm(settings) {
    try {
        if (settings.requireUploadPassword !== undefined) {
            const requirePasswordInput = document.getElementById('requireUploadPassword');
            if (requirePasswordInput) requirePasswordInput.checked = settings.requireUploadPassword;
        }
        
        if (settings.uploadPassword) {
            const uploadPasswordInput = document.getElementById('uploadPassword');
            if (uploadPasswordInput) uploadPasswordInput.value = settings.uploadPassword;
        }
        
        // 설정 적용 후 비밀번호 필드 표시/숨김 업데이트
        updateUploadPasswordVisibility();
        
        console.log('✅ 작품 등록 설정을 폼에 적용 완료');
        
    } catch (error) {
        console.error('❌ 작품 등록 설정 폼 적용 실패:', error);
    }
}





// 현재 모달에서 보고 있는 작품 ID 저장
let currentModalArtworkId = null;

function showArtworkDetail(artworkId) {
    console.log('🖱️ 작품 상세보기:', artworkId);
    
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) return;
    
    // 현재 모달에서 보고 있는 작품 ID 저장
    currentModalArtworkId = artworkId;
    
    const categoryMap = { 
        'activity': '활동 모습', 'worksheet': '활동지', 'result': '결과물' 
    };
    
    // 모달 내용 업데이트
    document.getElementById('detailArtworkTitle').textContent = artwork.title;
    document.getElementById('detailGrade').textContent = artwork.grade;
    document.getElementById('detailCategory').textContent = categoryMap[artwork.category] || artwork.category;
    document.getElementById('detailDescriptionText').textContent = artwork.description;
    
    // 이미지 갤러리 업데이트
    const mainImg = document.getElementById('currentMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    if (mainImg && artwork.imageUrls.length > 0) {
        mainImg.src = artwork.imageUrls[0];
        mainImg.onclick = () => showFullscreenImage(mainImg.src);
        mainImg.style.cursor = 'zoom-in';
        
        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = '';
            if (artwork.imageUrls.length > 1) {
                artwork.imageUrls.forEach((url, index) => {
                    const thumb = document.createElement('img');
                    thumb.src = url;
                    thumb.className = 'modal-thumbnail-img';
                    thumb.style.cssText = 'width: 60px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer; margin: 0 5px; border: 2px solid transparent;';
                    
                    if (index === 0) thumb.style.borderColor = '#667eea';
                    
                    thumb.onclick = () => {
                        mainImg.src = url;
                        mainImg.onclick = () => showFullscreenImage(url);
                        thumbnailsContainer.querySelectorAll('img').forEach(t => t.style.borderColor = 'transparent');
                        thumb.style.borderColor = '#667eea';
                    };
                    
                    thumbnailsContainer.appendChild(thumb);
                });
            }
        }
    }
    
    // 링크 섹션
    const linkSection = document.getElementById('detailLinkSection');
    if (linkSection) {
        if (artwork.link) {
            linkSection.style.display = 'block';
            const linkElement = document.getElementById('detailLink');
            if (linkElement) linkElement.href = artwork.link;
        } else {
            linkSection.style.display = 'none';
        }
    }
    
    // 모달 표시
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 관리자 모드일 때 관리자 버튼들 표시
        if (checkAdminStatus()) {
            const editBtn = document.getElementById('detailEditBtn');
            const deleteBtn = document.getElementById('detailDeleteBtn');
            
            if (editBtn) {
                editBtn.style.display = 'inline-block';
                editBtn.style.visibility = 'visible';
                editBtn.style.opacity = '1';
            }
            
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
                deleteBtn.style.visibility = 'visible';
                deleteBtn.style.opacity = '1';
            }
            
            console.log('✅ 모달에서 관리자 버튼들 표시됨');
        } else {
            const editBtn = document.getElementById('detailEditBtn');
            const deleteBtn = document.getElementById('detailDeleteBtn');
            
            if (editBtn) {
                editBtn.style.display = 'none';
                editBtn.style.visibility = 'hidden';
                editBtn.style.opacity = '0';
            }
            
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
                deleteBtn.style.visibility = 'hidden';
                deleteBtn.style.opacity = '0';
            }
            
            console.log('❌ 모달에서 관리자 버튼들 숨김');
        }
    }
}

function closeModal() {
    console.log('🖱️ 모달 닫기');
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    // 모달 닫을 때 현재 작품 ID 초기화
    currentModalArtworkId = null;
}

// 모달에서 작품 수정
function editArtworkFromModal() {
    console.log('✏️ 모달에서 작품 수정 시도:', currentModalArtworkId);
    
    if (!currentModalArtworkId) {
        alert('수정할 작품을 찾을 수 없습니다.');
        return;
    }
    
    // 모달 닫기
    closeModal();
    
    // 작품 수정 모드 시작
    editArtwork(currentModalArtworkId);
}

// 모달에서 작품 삭제
function deleteArtworkFromModal() {
    console.log('🗑️ 모달에서 작품 삭제 시도:', currentModalArtworkId);
    
    if (!currentModalArtworkId) {
        alert('삭제할 작품을 찾을 수 없습니다.');
        return;
    }
    
    // 모달 닫기
    closeModal();
    
    // 작품 삭제 실행
    deleteArtwork(currentModalArtworkId);
}

function showFullscreenImage(imageSrc) {
    console.log('🖼️ 전체화면 이미지 표시:', imageSrc);
    const overlay = document.getElementById('fullscreenOverlay');
    const fullscreenImg = document.getElementById('fullscreenImage');
    
    if (overlay && fullscreenImg) {
        fullscreenImg.src = imageSrc;
        overlay.classList.add('show');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeFullscreenImage() {
    console.log('🖱️ 전체화면 이미지 닫기');
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// === 이벤트 리스너 설정 ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 DOM 로드 완료 - 갤러리 초기화 시작');
    
    // 세션에서 관리자 상태 확인
    checkAdminStatus();
    
    // 관리자 버튼 텍스트 업데이트
    const adminButton = document.querySelectorAll('.header-btn')[1];
    if (adminButton) {
        adminButton.textContent = isAdmin ? '🚪 관리자 나가기' : '⚙️ 관리자 모드';
    }
    
    // 폼 이벤트 리스너
    const form = document.getElementById('artworkForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('📝 폼 이벤트 리스너 등록됨');
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('change', validateForm);
        });
    }
    
    // 이미지 파일 입력
    const imageInput = document.getElementById('imageFile');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            console.log('📁 파일 선택 이벤트 발생');
            handleFileSelect(this);
        });
    }
    
    // 이미지 업로드 영역 클릭
    const uploadArea = document.querySelector('.image-upload');
    if (uploadArea) {
        uploadArea.addEventListener('click', function(e) {
            if (!e.target.onclick && !e.target.closest('button')) {
                document.getElementById('imageFile').click();
            }
        });
    }
    
    // 검색 입력 이벤트 리스너
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            
            // 디바운싱: 타이핑이 끝난 후 300ms 뒤에 검색 실행
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(searchTerm);
            }, 300);
        });
        
        // Enter 키로 검색 실행
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim();
                performSearch(searchTerm);
            }
        });
        
        // 검색 입력 필드 클리어 시 모든 작품 표시
        searchInput.addEventListener('search', function() {
            if (this.value === '') {
                showAllArtworks();
            }
        });
        
        console.log('✅ 검색 이벤트 리스너 등록됨');
    }
    
    // 필터 버튼들
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🔍 필터 버튼 클릭:', this.dataset.category);
            
            // 검색 입력 필드 클리어
            if (searchInput) {
                searchInput.value = '';
            }
            
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            applyGradeFilter(category);
        });
    });
    
    // 모달 닫기 버튼들
    const closeBtns = document.querySelectorAll('.close-btn');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // 모달 배경 클릭으로 닫기
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // 전체화면 오버레이
    const fullscreenOverlay = document.getElementById('fullscreenOverlay');
    if (fullscreenOverlay) {
        fullscreenOverlay.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('fullscreen-close-btn')) {
                closeFullscreenImage();
            }
        });
    }
    
    // 관리자 컨트롤 버튼 이벤트 리스너 (이벤트 위임 사용)
    document.addEventListener('click', function(e) {
        // 수정 버튼 클릭
        if (e.target.classList.contains('admin-edit-btn')) {
            e.stopPropagation();
            
            // 여러 방법으로 작품 ID 찾기
            let artworkId = e.target.getAttribute('data-artwork-id');
            
            // data-artwork-id가 없으면 부모 요소에서 찾기
            if (!artworkId) {
                const parentCard = e.target.closest('.artwork-card');
                if (parentCard) {
                    artworkId = parentCard.getAttribute('data-artwork-id');
                }
            }
            
            // dataset으로도 시도
            if (!artworkId) {
                artworkId = e.target.dataset.artworkId;
            }
            
            console.log('🖱️ 관리자 수정 버튼 클릭 - 요소:', e.target);
            console.log('🖱️ 관리자 수정 버튼 클릭 - data-artwork-id:', artworkId);
            console.log('🖱️ 관리자 수정 버튼 클릭 - 모든 속성:', e.target.attributes);
            console.log('🖱️ 관리자 수정 버튼 클릭 - 부모 카드:', e.target.closest('.artwork-card'));
            
            if (artworkId && artworkId.trim() !== '') {
                console.log('✅ 작품 ID 확인됨, 수정 함수 호출:', artworkId);
                editArtwork(artworkId);
            } else {
                console.error('❌ 작품 ID가 없음');
                alert('작품 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            }
        }
        
        // 삭제 버튼 클릭
        if (e.target.classList.contains('admin-delete-btn')) {
            e.stopPropagation();
            
            // 여러 방법으로 작품 ID 찾기
            let artworkId = e.target.getAttribute('data-artwork-id');
            
            // data-artwork-id가 없으면 부모 요소에서 찾기
            if (!artworkId) {
                const parentCard = e.target.closest('.artwork-card');
                if (parentCard) {
                    artworkId = parentCard.getAttribute('data-artwork-id');
                }
            }
            
            // dataset으로도 시도
            if (!artworkId) {
                artworkId = e.target.dataset.artworkId;
            }
            
            console.log('🖱️ 관리자 삭제 버튼 클릭 - 요소:', e.target);
            console.log('🖱️ 관리자 삭제 버튼 클릭 - data-artwork-id:', artworkId);
            console.log('🖱️ 관리자 삭제 버튼 클릭 - 모든 속성:', e.target.attributes);
            console.log('🖱️ 관리자 삭제 버튼 클릭 - 부모 카드:', e.target.closest('.artwork-card'));
            
            if (artworkId && artworkId.trim() !== '') {
                console.log('✅ 작품 ID 확인됨, 삭제 함수 호출:', artworkId);
                deleteArtwork(artworkId);
            } else {
                console.error('❌ 작품 ID가 없음');
                alert('작품 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            }
        }
    });
    
    console.log('🎉 모든 이벤트 리스너 등록 완료');
    
    // Firebase 초기화 상태 확인
    console.log('🔥 Firebase 초기화 상태:', {
        firebaseLoaded: typeof firebase !== 'undefined',
        firebaseApps: firebase?.apps?.length || 0,
        firestoreLoaded: typeof firebase?.firestore !== 'undefined',
        storageLoaded: typeof firebase?.storage !== 'undefined',
        config: FIREBASE_CONFIG
    });
    
    // Firebase 권한 설정 안내
    console.log('📋 Firebase 권한 설정이 필요합니다:');
    console.log('1. Firebase 콘솔 (https://console.firebase.google.com) 접속');
    console.log('2. 프로젝트 선택: daebul-exhibition');
    console.log('3. Firestore Database → 규칙 탭에서 다음 규칙으로 설정:');
    console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
    `);
    console.log('4. Storage → 규칙 탭에서 다음 규칙으로 설정:');
    console.log(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
    `);
    console.log('5. 각각 게시 버튼 클릭');
    
    // 데이터 로드
    loadArtworks();
    
            // 로컬에서 설정 불러오기
    setTimeout(() => {
        loadSiteSettingsFromLocal();
        
        // 작품 등록 비밀번호 요구 체크박스 이벤트 리스너 추가
        const requirePasswordCheckbox = document.getElementById('requireUploadPassword');
        if (requirePasswordCheckbox) {
            requirePasswordCheckbox.addEventListener('change', function() {
                updateUploadPasswordVisibility();
            });
        }
        
        // 비밀번호 필드 표시/숨김 업데이트
        updateUploadPasswordVisibility();
        
        // 학년별 정보 섹션 초기화
        console.log('📝 학년별 정보 섹션 초기화 중...');
        updateGradeInfo();
        
        // 기본적으로 '전체 학년' 필터 활성화하여 학년별 정보 표시
        setTimeout(() => {
            const allFilterBtn = document.querySelector('.filter-btn[data-category="all"]');
            if (allFilterBtn) {
                allFilterBtn.classList.add('active');
                applyGradeFilter('all');
            }
        }, 500);
    }, 1000);
    
    console.log('✅ 갤러리 초기화 완료!');
});

// === 전역 함수 등록 ===
window.toggleUploadPanel = toggleUploadPanel;
window.toggleAdminPanel = toggleAdminPanel;
window.closeModal = closeModal;
window.showFullscreenImage = showFullscreenImage;
window.removeImage = removeImage;
window.showArtworkDetail = showArtworkDetail;
window.closeFullscreenImage = closeFullscreenImage;
window.updateStorageStatus = updateStorageStatus;
window.editArtworkFromModal = editArtworkFromModal;
window.deleteArtworkFromModal = deleteArtworkFromModal;

// 필터 및 탭 전환 함수들
window.switchTypeTab = switchTypeTab;
window.applyGradeFilter = applyGradeFilter;

// 관리자 모드 함수들
window.switchAdminTab = switchAdminTab;
window.editArtwork = editArtwork;
window.cancelEdit = cancelEdit;
window.deleteArtwork = deleteArtwork;
window.saveSettings = saveSettings;
window.resetAllData = resetAllData;
window.exportData = exportData;
window.saveArtworkOrder = saveArtworkOrder;
window.bulkDeleteArtworks = bulkDeleteArtworks;

// 작품 순서 관리 함수들
window.initializeSortable = initializeSortable;
window.showOrderChangeNotification = showOrderChangeNotification;
window.updateCategoryGalleriesOrder = updateCategoryGalleriesOrder;

// 헤더 이미지 관련 함수들
window.previewHeaderImage = previewHeaderImage;
window.removeHeaderImage = removeHeaderImage;

// 작품 등록 설정 관련 함수들
window.applySettingsToForm = applySettingsToForm;
window.applyGradeSettingsToForm = applyGradeSettingsToForm;
window.updateGradeInfo = updateGradeInfo;
window.loadSiteSettingsFromLocal = loadSiteSettingsFromLocal;

// 검색 기능
window.performSearch = performSearch;

// === 오류 처리 ===
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 거부:', e.reason);
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');

