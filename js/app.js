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

// 기본 사이트 설정
let siteSettings = {
    title: '우리학교 학생 작품 전시관',
    description: '창의적이고 아름다운 학생들의 작품을 함께 감상해보세요',
    requireUploadPassword: false,
    uploadPassword: ''
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
            return true;
        }
        
        // 새로 초기화
        app = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        storage = firebase.storage();
        console.log('✅ Firebase 초기화 성공 (Firestore + Storage)');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
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
    
    if (!isAdmin) {
        const password = prompt('관리자 비밀번호를 입력하세요:');
        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            document.body.classList.add('admin-mode');
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            
            const adminButton = document.querySelectorAll('.header-btn')[1];
            if (adminButton) adminButton.textContent = '🚪 관리자 나가기';
            
            alert('✅ 관리자 모드가 활성화되었습니다.');
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
    
    if (!validateForm()) {
        if (siteSettings.requireUploadPassword && !isAdmin && !isEditMode) {
            const inputPassword = document.getElementById('uploadPasswordInput')?.value;
            if (inputPassword !== siteSettings.uploadPassword) {
                alert('등록 비밀번호가 올바르지 않습니다.');
                return;
            }
        }
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
            uploadDate: new Date().toISOString()
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
        
        const docRef = await db.collection('artworks').add({
            ...artwork,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firebase에 작품 저장 성공:', docRef.id);
        return docRef.id;
        
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
        
        await db.collection('artworks').doc(artworkId).delete();
        console.log('✅ Firebase에서 작품 삭제 성공:', artworkId);
        return true;
    } catch (error) {
        console.error('❌ Firebase 삭제 오류:', error);
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
    const statusEl = document.getElementById('upstashStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    isConnected = status === 'connected';
    validateForm();
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
            }
            
            // 카테고리별 갤러리에 추가
            const categoryGallery = galleries[`${artwork.category}Gallery`];
            if (categoryGallery) {
                const clone2 = element.cloneNode(true);
                categoryGallery.appendChild(clone2);
                setTimeout(() => clone2.classList.add('show'), 100);
            }
        }, index * 30);
    });
}

function createArtworkElement(artwork) {
    if (!artwork.imageUrls || artwork.imageUrls.length === 0) return null;

    const element = document.createElement('div');
    element.className = 'artwork-card';
    element.dataset.artworkId = artwork.id;
    element.dataset.category = artwork.category;
    
    const uploadDate = new Date(artwork.uploadDate).toLocaleDateString('ko-KR');
    const imageCount = artwork.imageUrls.length > 1 ? 
        `<span class="artwork-type">${artwork.imageUrls.length}장</span>` : '';

    element.innerHTML = `
        <div class="artwork-image" onclick="showArtworkDetail('${artwork.id}')">
            <img src="${artwork.imageUrls[0]}" alt="${artwork.title}" loading="lazy" 
                 style="width: 100%; height: 100%; object-fit: cover;">
            ${imageCount}
            <div class="admin-controls">
                <button class="btn btn-warning btn-small" onclick="event.stopPropagation(); editArtwork('${artwork.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteArtwork('${artwork.id}')">삭제</button>
            </div>
        </div>
        <div class="artwork-info" onclick="showArtworkDetail('${artwork.id}')">
            <h3 class="artwork-title">${artwork.title}</h3>
            <p class="artwork-author">${artwork.grade}</p>
            <p class="artwork-description">${artwork.description}</p>
            <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
        </div>
    `;
    
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
        }
    });
    
    console.log('🔄 갤러리에서 작품 업데이트 완료:', updatedArtwork.title);
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

// 필터에 따른 학년별 정보 업데이트
function updateGradeInfoForFilter(grade) {
    try {
        const gradeSettings = JSON.parse(localStorage.getItem('gradeSettings') || '{}');
        const gradeInfoTitle = document.getElementById('gradeInfoTitle');
        const gradeInfoDescription = document.getElementById('gradeInfoDescription');
        
        if (gradeInfoTitle && gradeInfoDescription) {
            let title, description;
            
            if (grade === 'all') {
                const allGradeInfo = gradeSettings.gradeAll || {};
                title = allGradeInfo.title || '전체 학년 작품 소개';
                description = allGradeInfo.description || '우리 학교 1학년부터 6학년까지 모든 학생들의 창의적이고 아름다운 작품들을 한눈에 볼 수 있습니다.';
            } else {
                const gradeKey = `grade${grade}`;
                const gradeInfo = gradeSettings[gradeKey] || {};
                title = gradeInfo.title || `${grade}학년 작품`;
                description = gradeInfo.description || `${grade}학년 학생들의 창의적이고 아름다운 작품들입니다.`;
            }
            
            gradeInfoTitle.textContent = title;
            gradeInfoDescription.textContent = description;
        }
        
    } catch (error) {
        console.error('필터별 학년 정보 업데이트 실패:', error);
    }
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
    
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) {
        alert('수정할 작품을 찾을 수 없습니다.');
        return;
    }
    
    // 수정 모드 활성화
    isEditMode = true;
    editingArtworkId = artworkId;
    
    // 폼에 기존 데이터 채우기
    document.getElementById('artworkTitle').value = artwork.title;
    document.getElementById('studentGrade').value = artwork.grade.replace('학년', '');
    document.getElementById('artworkCategory').value = artwork.category;
    document.getElementById('artworkDescription').value = artwork.description;
    if (artwork.link) {
        document.getElementById('artworkLink').value = artwork.link;
    }
    
    // 이미지 미리보기 설정
    uploadedImages = artwork.imageUrls.map(url => ({
        url: url,
        name: '기존 이미지',
        file: null
    }));
    updateImagePreview();
    
    // UI 업데이트
    const panelTitle = document.getElementById('uploadPanelTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    if (panelTitle) panelTitle.textContent = '✏️ 작품 수정';
    if (submitBtn) submitBtn.textContent = '수정 완료';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    
    // 업로드 패널 열기
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
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // Firebase에서 삭제
        if (db) {
            await deleteArtworkFromFirebase(artworkId);
        }
        
        // 로컬 데이터에서 제거
        allArtworks = allArtworks.filter(a => a.id !== artworkId);
        
        // UI에서 제거
        const artworkElements = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        artworkElements.forEach(element => element.remove());
        
        // 카운트 업데이트
        updateCounts();
        
        alert('작품이 성공적으로 삭제되었습니다.');
        console.log('✅ 작품 삭제 완료');
        
    } catch (error) {
        console.error('❌ 작품 삭제 실패:', error);
        alert('작품 삭제에 실패했습니다.');
    }
}

// 사이트 설정 저장
async function saveSettings() {
    console.log('💾 사이트 설정 저장 시도');
    
    try {
        // 기본 설정
        const newSettings = {
            title: document.getElementById('siteTitle').value,
            description: document.getElementById('siteDescription').value,
            allowComments: document.getElementById('allowComments').checked,
            moderateComments: document.getElementById('moderateComments').checked,
            requireUploadPassword: document.getElementById('requireUploadPassword').checked,
            uploadPassword: document.getElementById('uploadPassword').value
        };
        
        // 학년별 설명
        const gradeSettings = {};
        for (let i = 1; i <= 6; i++) {
            gradeSettings[`grade${i}`] = {
                title: document.getElementById(`gradeTitle${i}`).value,
                description: document.getElementById(`gradeDesc${i}`).value
            };
        }
        gradeSettings.gradeAll = {
            title: document.getElementById('gradeTitleAll').value,
            description: document.getElementById('gradeDescAll').value
        };
        
        // Firebase에 설정 저장
        if (db) {
            try {
                // 사이트 설정 저장
                await db.collection('siteSettings').doc('main').set({
                    ...newSettings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 학년별 설정 저장
                await db.collection('siteSettings').doc('grades').set({
                    ...gradeSettings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ Firebase에 사이트 설정 저장 완료');
            } catch (error) {
                console.error('Firebase 설정 저장 실패:', error);
                throw new Error('데이터베이스 저장에 실패했습니다.');
            }
        }
        
        // 로컬 스토리지에도 백업 저장
        localStorage.setItem('siteSettings', JSON.stringify(newSettings));
        localStorage.setItem('gradeSettings', JSON.stringify(gradeSettings));
        
        // 사이트 제목과 설명 즉시 업데이트
        updateSiteDisplay(newSettings);
        
        // 학년별 정보 섹션 업데이트
        updateGradeInfo();
        
        alert('✅ 사이트 설정이 성공적으로 저장되었습니다!\n\n이제 다른 컴퓨터에서도 변경된 설정을 볼 수 있습니다.');
        console.log('✅ 사이트 설정 저장 완료');
        
    } catch (error) {
        console.error('❌ 사이트 설정 저장 실패:', error);
        alert(`사이트 설정 저장에 실패했습니다:\n\n${error.message}`);
    }
}

// 사이트 표시 업데이트
function updateSiteDisplay(settings) {
    try {
        // 헤더 제목 업데이트
        const headerTitle = document.getElementById('headerTitleText');
        if (headerTitle && settings.title) {
            headerTitle.textContent = settings.title;
        }
        
        // 사이트 부제목 업데이트
        const siteSubtitle = document.getElementById('siteSubtitle');
        if (siteSubtitle && settings.description) {
            siteSubtitle.textContent = settings.description;
        }
        
        // 페이지 제목 업데이트
        if (settings.title) {
            document.title = settings.title;
        }
        
        console.log('✅ 사이트 표시 업데이트 완료:', settings.title);
        
    } catch (error) {
        console.error('사이트 표시 업데이트 실패:', error);
    }
}

// 학년별 정보 업데이트
function updateGradeInfo() {
    try {
        const gradeSettings = JSON.parse(localStorage.getItem('gradeSettings') || '{}');
        const gradeInfoTitle = document.getElementById('gradeInfoTitle');
        const gradeInfoDescription = document.getElementById('gradeInfoDescription');
        
        if (gradeInfoTitle && gradeInfoDescription) {
            const allGradeInfo = gradeSettings.gradeAll || {};
            gradeInfoTitle.textContent = allGradeInfo.title || '전체 학년 작품 소개';
            gradeInfoDescription.textContent = allGradeInfo.description || '우리 학교 1학년부터 6학년까지 모든 학생들의 창의적이고 아름다운 작품들을 한눈에 볼 수 있습니다.';
        }
        
    } catch (error) {
        console.error('학년별 정보 업데이트 실패:', error);
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
                const updatePromises = newOrder.map(artwork => 
                    db.collection('artworks').doc(artwork.id).update({ order: artwork.order })
                );
                await Promise.all(updatePromises);
            }
            
            // 로컬 데이터 업데이트
            allArtworks = newOrder;
            
            alert('✅ 작품 순서가 성공적으로 저장되었습니다!');
            console.log('✅ 작품 순서 저장 완료');
        }
        
    } catch (error) {
        console.error('❌ 작품 순서 저장 실패:', error);
        alert('작품 순서 저장에 실패했습니다.');
    }
}

// 대량 작품 삭제
function bulkDeleteArtworks() {
    console.log('🗑️ 대량 작품 삭제 시도');
    
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

// 대량 댓글 삭제
function bulkDeleteComments() {
    console.log('🗑️ 대량 댓글 삭제 시도');
    alert('댓글 기능은 아직 구현되지 않았습니다.');
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

// Firebase에서 사이트 설정 불러오기
async function loadSiteSettingsFromFirebase() {
    try {
        if (!db) {
            console.log('⚠️ Firebase가 초기화되지 않아 로컬 설정을 사용합니다.');
            return false;
        }
        
        console.log('📡 Firebase에서 사이트 설정 요청 중...');
        
        // 기본 설정 불러오기
        const mainSettingsDoc = await db.collection('siteSettings').doc('main').get();
        const gradeSettingsDoc = await db.collection('siteSettings').doc('grades').get();
        
        let hasNewSettings = false;
        
        if (mainSettingsDoc.exists) {
            const firebaseSettings = mainSettingsDoc.data();
            console.log('✅ Firebase에서 기본 설정 로드:', firebaseSettings);
            
            // 설정 폼에 적용
            applySettingsToForm(firebaseSettings);
            
            // 사이트 표시 업데이트
            updateSiteDisplay(firebaseSettings);
            
            // 로컬 스토리지에 백업
            localStorage.setItem('siteSettings', JSON.stringify(firebaseSettings));
            
            hasNewSettings = true;
        }
        
        if (gradeSettingsDoc.exists) {
            const firebaseGradeSettings = gradeSettingsDoc.data();
            console.log('✅ Firebase에서 학년별 설정 로드:', firebaseGradeSettings);
            
            // 학년별 설정 폼에 적용
            applyGradeSettingsToForm(firebaseGradeSettings);
            
            // 학년별 정보 섹션 업데이트
            updateGradeInfo();
            
            // 로컬 스토리지에 백업
            localStorage.setItem('gradeSettings', JSON.stringify(firebaseGradeSettings));
            
            hasNewSettings = true;
        }
        
        if (hasNewSettings) {
            console.log('✅ Firebase에서 사이트 설정 로드 완료');
            return true;
        } else {
            console.log('📝 Firebase에 저장된 설정이 없어 기본값을 사용합니다.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Firebase 설정 로드 오류:', error);
        return false;
    }
}

// 설정을 폼에 적용
function applySettingsToForm(settings) {
    try {
        if (settings.title) {
            const siteTitleInput = document.getElementById('siteTitle');
            if (siteTitleInput) siteTitleInput.value = settings.title;
        }
        
        if (settings.description) {
            const siteDescInput = document.getElementById('siteDescription');
            if (siteDescInput) siteDescInput.value = settings.description;
        }
        
        if (settings.allowComments !== undefined) {
            const allowCommentsInput = document.getElementById('allowComments');
            if (allowCommentsInput) allowCommentsInput.checked = settings.allowComments;
        }
        
        if (settings.moderateComments !== undefined) {
            const moderateCommentsInput = document.getElementById('moderateComments');
            if (moderateCommentsInput) moderateCommentsInput.checked = settings.moderateComments;
        }
        
        if (settings.requireUploadPassword !== undefined) {
            const requirePasswordInput = document.getElementById('requireUploadPassword');
            if (requirePasswordInput) requirePasswordInput.checked = settings.requireUploadPassword;
        }
        
        if (settings.uploadPassword) {
            const uploadPasswordInput = document.getElementById('uploadPassword');
            if (uploadPasswordInput) uploadPasswordInput.value = settings.uploadPassword;
        }
        
        console.log('✅ 설정을 폼에 적용 완료');
        
    } catch (error) {
        console.error('❌ 설정 폼 적용 실패:', error);
    }
}

// 학년별 설정을 폼에 적용
function applyGradeSettingsToForm(gradeSettings) {
    try {
        Object.keys(gradeSettings).forEach(gradeKey => {
            if (gradeKey === 'updatedAt') return; // Firebase 타임스탬프 제외
            
            const gradeInfo = gradeSettings[gradeKey];
            if (gradeInfo.title) {
                const titleInput = document.getElementById(`${gradeKey}Title`);
                if (titleInput) titleInput.value = gradeInfo.title;
            }
            if (gradeInfo.description) {
                const descInput = document.getElementById(`${gradeKey}Desc`);
                if (descInput) descInput.value = gradeInfo.description;
            }
        });
        
        console.log('✅ 학년별 설정을 폼에 적용 완료');
        
    } catch (error) {
        console.error('❌ 학년별 설정 폼 적용 실패:', error);
    }
}

// 저장된 사이트 설정 불러오기 (로컬 백업용)
function loadSiteSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
        const savedGradeSettings = JSON.parse(localStorage.getItem('gradeSettings') || '{}');
        
        // 기본 설정 적용
        if (savedSettings.title) {
            const siteTitleInput = document.getElementById('siteTitle');
            if (siteTitleInput) siteTitleInput.value = savedSettings.title;
        }
        
        if (savedSettings.description) {
            const siteDescInput = document.getElementById('siteDescription');
            if (siteDescInput) siteDescInput.value = savedSettings.description;
        }
        
        if (savedSettings.allowComments !== undefined) {
            const allowCommentsInput = document.getElementById('allowComments');
            if (allowCommentsInput) allowCommentsInput.checked = savedSettings.allowComments;
        }
        
        if (savedSettings.moderateComments !== undefined) {
            const moderateCommentsInput = document.getElementById('moderateComments');
            if (moderateCommentsInput) moderateCommentsInput.checked = savedSettings.moderateComments;
        }
        
        if (savedSettings.requireUploadPassword !== undefined) {
            const requirePasswordInput = document.getElementById('requireUploadPassword');
            if (requirePasswordInput) requirePasswordInput.checked = savedSettings.requireUploadPassword;
        }
        
        if (savedSettings.uploadPassword) {
            const uploadPasswordInput = document.getElementById('uploadPassword');
            if (uploadPasswordInput) uploadPasswordInput.value = savedSettings.uploadPassword;
        }
        
        // 학년별 설정 적용
        Object.keys(savedGradeSettings).forEach(gradeKey => {
            const gradeSettings = savedGradeSettings[gradeKey];
            if (gradeSettings.title) {
                const titleInput = document.getElementById(`${gradeKey}Title`);
                if (titleInput) titleInput.value = gradeSettings.title;
            }
            if (gradeSettings.description) {
                const descInput = document.getElementById(`${gradeKey}Desc`);
                if (descInput) descInput.value = gradeSettings.description;
            }
        });
        
        console.log('✅ 로컬 사이트 설정 불러오기 완료');
        
    } catch (error) {
        console.error('❌ 로컬 사이트 설정 불러오기 실패:', error);
    }
}

function showArtworkDetail(artworkId) {
    console.log('🖱️ 작품 상세보기:', artworkId);
    
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) return;
    
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
    }
}

function closeModal() {
    console.log('🖱️ 모달 닫기');
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
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
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        isAdmin = true;
        document.body.classList.add('admin-mode');
        
        const adminButton = document.querySelectorAll('.header-btn')[1];
        if (adminButton) adminButton.textContent = '🚪 관리자 나가기';
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
    
    // 필터 버튼들
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🔍 필터 버튼 클릭:', this.dataset.category);
            
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
    
    // Firebase에서 사이트 설정 불러오기 (우선)
    setTimeout(async () => {
        const firebaseLoaded = await loadSiteSettingsFromFirebase();
        if (!firebaseLoaded) {
            // Firebase에 설정이 없으면 로컬 설정 사용
            loadSiteSettings();
            updateGradeInfo();
        }
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
window.bulkDeleteComments = bulkDeleteComments;

// 헤더 이미지 관련 함수들
window.previewHeaderImage = previewHeaderImage;
window.removeHeaderImage = removeHeaderImage;

// 사이트 설정 관련 함수들
window.updateSiteDisplay = updateSiteDisplay;
window.applySettingsToForm = applySettingsToForm;
window.applyGradeSettingsToForm = applyGradeSettingsToForm;

// === 오류 처리 ===
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 거부:', e.reason);
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');
