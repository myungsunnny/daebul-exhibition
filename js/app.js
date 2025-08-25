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
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`✅ 필터 결과: ${visibleCount}개 작품 표시`);
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

// === 오류 처리 ===
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 거부:', e.reason);
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');
