// 학생 작품 갤러리 JavaScript - 버튼 오류 수정 버전

// Cloudinary 설정
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',
    uploadPreset: 'student_gallery'
};

// Upstash Redis 설정  
const UPSTASH_CONFIG = {
    url: 'https://sharp-hookworm-54944.upstash.io',
    token: 'AdagAAIncDFhNjc5YWZmYzQ5NDA0ZTEyODQ5ZGNmNDU5YTEwOGM4MHAxNTQ5NDQ'
};

// Redis 키
const REDIS_KEY = 'student_gallery:artworks';

// 관리자 비밀번호
const ADMIN_PASSWORD = "admin1234";

// 전역 변수
let isConnected = false;
let isAdmin = false;
let currentArtworkIdForModal = null;
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;
let currentDetailImageUrl = '';
let isUploading = false;
let uploadedImages = [];
let allArtworks = [];
let currentFilter = 'all';
let currentType = 'all';

// 즉시 전역 함수 등록 (먼저 실행)
window.toggleUploadPanel = function() {
    console.log('업로드 패널 토글 클릭됨');
    const panel = document.getElementById('uploadPanel');
    const buttons = document.querySelectorAll('.header-btn');
    const uploadButton = buttons[0];
    
    // 모든 패널 숨기기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        console.log('업로드 패널 닫힘');
    } else {
        panel.classList.add('active');
        uploadButton.classList.add('active');
        resetForm();
        console.log('업로드 패널 열림');
    }
};

window.toggleAdminPanel = function() {
    console.log('관리자 패널 토글 클릭됨');
    const panel = document.getElementById('adminPanel');
    const buttons = document.querySelectorAll('.header-btn');
    const adminButton = buttons[1];
    
    if (!isAdmin) {
        promptForAdminLogin();
        return;
    }
    
    // 모든 패널 숨기기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        console.log('관리자 패널 닫힘');
    } else {
        panel.classList.add('active');
        adminButton.classList.add('active');
        loadAdminData();
        console.log('관리자 패널 열림');
    }
};

window.switchTypeTab = function(type) {
    console.log('타입 탭 전환:', type);
    currentType = type;
    
    // 모든 탭 비활성화
    const tabs = document.querySelectorAll('.type-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 클릭된 탭 활성화
    const activeTab = document.querySelector(`[data-type="${type}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 모든 섹션 숨기기
    const sections = document.querySelectorAll('.type-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // 해당 섹션 표시
    const targetSection = type === 'all' ? 'allSection' : `${type}Section`;
    const section = document.getElementById(targetSection);
    if (section) {
        section.classList.add('active');
    }
    
    // 필터 재적용
    applyFilters();
};

window.switchAdminTab = function(tab) {
    console.log('관리자 탭 전환:', tab);
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    // 클릭된 탭 활성화
    const activeTab = Array.from(tabs).find(t => t.textContent.includes(getTabText(tab)));
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    const content = document.getElementById(`${tab}Content`);
    if (content) {
        content.classList.add('active');
    }
    
    if (tab === 'artworks') {
        loadArtworksTable();
    }
};

function getTabText(tab) {
    const tabTexts = {
        'artworks': '작품 관리',
        'comments': '댓글 관리', 
        'users': '사용자 관리',
        'settings': '사이트 설정'
    };
    return tabTexts[tab] || tab;
}

window.closeModal = function() {
    console.log('모달 닫기');
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentArtworkIdForModal = null;
};

window.openImageInNewTab = function() {
    console.log('원본 이미지 새 탭에서 열기');
    if (currentDetailImageUrl) {
        window.open(currentDetailImageUrl, '_blank');
    }
};

window.deleteArtwork = function(artworkId) {
    console.log('작품 삭제 요청:', artworkId);
    if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
        return;
    }

    // 삭제 처리
    deleteArtworkProcess(artworkId);
};

window.editArtwork = function(id) {
    console.log('작품 수정 요청:', id);
    alert('수정 기능은 현재 준비 중입니다.');
};

window.saveSettings = function() {
    console.log('설정 저장 요청');
    alert('설정이 저장되었습니다.');
};

window.removeImage = function(index) {
    console.log('이미지 제거:', index);
    uploadedImages.splice(index, 1);
    updateImagePreview();
    validateForm();
};

window.previewImages = function() {
    console.log('이미지 미리보기 (구 함수)');
    const fileInput = document.getElementById('imageFile');
    if (fileInput && fileInput.files) {
        handleFileSelect({ target: fileInput });
    }
};

window.closeFullscreenImage = function() {
    console.log('전체화면 이미지 닫기');
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
};

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 DOM 로드 완료!');
    
    // 상태 섹션 먼저 표시
    showStatusSection();
    
    // 이벤트 리스너 초기화
    initEventListeners();
    
    // 서버 연결 및 데이터 로드
    checkConnectionAndLoadArtworks();
    
    console.log('✅ 모든 기능이 준비되었습니다!');
});

// 상태 섹션 표시
function showStatusSection() {
    const statusSection = document.getElementById('statusSection');
    if (statusSection) {
        statusSection.classList.add('active');
    }
}

// 이벤트 리스너 초기화
function initEventListeners() {
    console.log('이벤트 리스너 초기화 시작');
    
    // 헤더 버튼들
    const headerButtons = document.querySelectorAll('.header-btn');
    headerButtons.forEach((btn, index) => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(`헤더 버튼 ${index} 클릭됨`);
            if (index === 0) {
                window.toggleUploadPanel();
            } else if (index === 1) {
                window.toggleAdminPanel();
            }
        });
    });
    
    // 필터 버튼들
    initFilterButtons();
    
    // 타입 탭들
    initTypeButtons();
    
    // 검색 입력
    initSearchInput();
    
    // 관리자 기능
    initAdminFeatures();
    
    // 폼 이벤트
    initFormEvents();
    
    // 이미지 업로드
    initImageUpload();
    
    // 모달 닫기 버튼들
    const closeBtns = document.querySelectorAll('.close-btn');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            window.closeModal();
        });
    });
    
    console.log('이벤트 리스너 초기화 완료');
}

// 이미지 업로드 초기화
function initImageUpload() {
    const imageInput = document.getElementById('imageFile');
    if (imageInput) {
        imageInput.addEventListener('change', handleFileSelect);
        console.log('이미지 입력 이벤트 리스너 등록됨');
    }
    
    // 이미지 업로드 영역 클릭 이벤트
    const uploadArea = document.querySelector('.image-upload');
    if (uploadArea) {
        uploadArea.addEventListener('click', function(e) {
            // 삭제 버튼 클릭이 아닌 경우에만
            if (!e.target.classList.contains('preview-remove')) {
                document.getElementById('imageFile').click();
            }
        });
    }
}

// 파일 선택 처리
function handleFileSelect(event) {
    console.log('파일 선택됨');
    const files = event.target.files;
    if (files && files.length > 0) {
        uploadedImages = []; // 기존 이미지 초기화
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImages.push(e.target.result);
                updateImagePreview();
                validateForm();
                console.log(`이미지 ${index + 1} 로드 완료`);
            };
            reader.readAsDataURL(file);
        });
    }
}

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const uploadText = document.getElementById('uploadText');
    
    if (!container) return;
    
    container.innerHTML = uploadedImages.map((url, index) =>
        `<div class="preview-item" style="position: relative; display: inline-block; margin: 5px;">
            <img src="${url}" alt="미리보기 ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
            <button type="button" class="preview-remove" onclick="removeImage(${index})" style="position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">&times;</button>
        </div>`
    ).join('');
    
    if (uploadText) {
        uploadText.style.display = uploadedImages.length > 0 ? 'none' : 'block';
    }
    
    console.log('이미지 미리보기 업데이트됨, 총', uploadedImages.length, '개');
}

// 필터 버튼 초기화
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('필터 버튼 클릭됨:', this.dataset.category);
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.category;
            applyFilters();
        });
    });
}

// 타입 버튼 초기화
function initTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-tab');
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('타입 탭 클릭됨:', this.dataset.type);
            const type = this.dataset.type;
            window.switchTypeTab(type);
        });
    });
}

// 검색 입력 초기화
function initSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('검색어 입력:', this.value);
            applyFilters();
        });
    }
}

// 관리자 기능 초기화
function initAdminFeatures() {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        enableAdminUI();
    }
    
    // 관리자 탭 버튼들
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabText = this.textContent.trim();
            const tabMap = {
                '작품 관리': 'artworks',
                '댓글 관리': 'comments',
                '사용자 관리': 'users',
                '사이트 설정': 'settings'
            };
            const tabKey = tabMap[tabText];
            if (tabKey) {
                window.switchAdminTab(tabKey);
            }
        });
    });
}

function promptForAdminLogin() {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === ADMIN_PASSWORD) {
        alert('✅ 관리자 모드가 활성화되었습니다.');
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        enableAdminUI();
        window.toggleAdminPanel();
    } else if (password) {
        alert('❌ 비밀번호가 틀렸습니다.');
    }
}

function enableAdminUI() {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    console.log('🔧 관리자 UI가 활성화되었습니다.');
}

// 폼 이벤트 초기화
function initFormEvents() {
    const form = document.getElementById('artworkForm');
    if (!form) {
        console.error('작품 폼을 찾을 수 없습니다!');
        return;
    }
    
    form.addEventListener('submit', handleFormSubmit);
    console.log('폼 제출 이벤트 리스너 등록됨');
    
    // 입력 필드 유효성 검사
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });
    
    console.log('폼 입력 이벤트 리스너들 등록됨:', inputs.length, '개');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('폼 제출 시도');
    
    if (!validateForm()) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
        // 폼 데이터 수집
        const formData = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: document.getElementById('artworkTitle').value.trim(),
            studentName: document.getElementById('studentName').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink').value.trim(),
            imageUrls: [...uploadedImages],
            uploadDate: new Date().toISOString()
        };
        
        console.log('등록할 작품 데이터:', formData);
        
        if (formData.imageUrls.length === 0) {
            throw new Error('이미지가 선택되지 않았습니다.');
        }
        
        // 로컬 데이터에 추가
        allArtworks.unshift(formData);
        
        // 서버에 저장
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
        
        // UI 업데이트
        renderArtworks();
        applyFilters();
        
        // 폼 초기화 및 패널 닫기
        resetForm();
        window.toggleUploadPanel();
        
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
        
        console.log('작품 등록 완료');
        
    } catch (error) {
        console.error('❌ 작품 등록 중 오류:', error);
        alert(`작품 등록 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim();
    const studentName = document.getElementById('studentName')?.value.trim();
    const grade = document.getElementById('studentGrade')?.value;
    const category = document.getElementById('artworkCategory')?.value;
    const description = document.getElementById('artworkDescription')?.value.trim();
    
    const isValid = title && studentName && grade && category && description && 
                   uploadedImages.length > 0 && isConnected && !isUploading;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
    
    return isValid;
}

function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    updateImagePreview();
    validateForm();
    console.log('폼 초기화됨');
}

// API 및 데이터 처리
async function callUpstashAPI(command, key, value = null) {
    try {
        const url = `${UPSTASH_CONFIG.url}/${command.toLowerCase()}${key ? `/${encodeURIComponent(key)}` : ''}`;
        const options = {
            method: command === 'GET' || command === 'PING' ? 'GET' : 'POST',
            headers: { 'Authorization': `Bearer ${UPSTASH_CONFIG.token}` }
        };
        if (value !== null) options.body = value;
        
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()).result;
    } catch (error) {
        console.error('❌ Upstash API 호출 오류:', error);
        throw error;
    }
}

async function checkConnectionAndLoadArtworks() {
    updateConnectionStatus('connecting', '서버 연결 중...');
    try {
        await callUpstashAPI('PING');
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        await loadArtworksFromUpstash();
    } catch (error) {
        updateConnectionStatus('disconnected', '연결 실패');
        console.error('연결 오류:', error);
    }
}

async function loadArtworksFromUpstash() {
    try {
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (artworksData) {
            allArtworks = JSON.parse(artworksData);
            renderArtworks();
            updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품 동기화됨`);
            console.log(`${allArtworks.length}개 작품 로드 완료`);
        } else {
            allArtworks = [];
            updateConnectionStatus('connected', '온라인 - 새 갤러리');
            console.log('새로운 갤러리 시작');
        }
        updateGalleryState();
    } catch (error) {
        updateGalleryState();
        updateConnectionStatus('disconnected', '작품 로드 실패');
        console.error('작품 로드 오류:', error);
    }
}

function renderArtworks() {
    const galleries = {
        all: document.getElementById('galleryGrid'),
        drawing: document.getElementById('drawingGallery'),
        craft: document.getElementById('craftGallery'),
        sculpture: document.getElementById('sculptureGallery'),
        digital: document.getElementById('digitalGallery')
    };
    
    // 모든 갤러리 초기화
    Object.values(galleries).forEach(gallery => {
        if (gallery) gallery.innerHTML = '';
    });
    
    // 작품들을 각 갤러리에 추가
    allArtworks.forEach((artwork, index) => {
        setTimeout(() => {
            const element = createArtworkElement(artwork);
            if (!element) return;
            
            // 전체 갤러리에 추가
            if (galleries.all) {
                const clonedElement = element.cloneNode(true);
                galleries.all.appendChild(clonedElement);
                addEventListenersToArtwork(clonedElement);
            }
            
            // 해당 카테고리 갤러리에 추가
            if (galleries[artwork.category]) {
                const clonedElement = element.cloneNode(true);
                galleries[artwork.category].appendChild(clonedElement);
                addEventListenersToArtwork(clonedElement);
            }
            
            // 애니메이션 효과
            setTimeout(() => {
                const elements = document.querySelectorAll(`[data-artwork-id="${artwork.id}"]`);
                elements.forEach(el => el.classList.add('show'));
            }, 100);
        }, index * 50);
    });
}

function createArtworkElement(artworkData) {
    const imageUrls = artworkData.imageUrls || [];
    if (!imageUrls || imageUrls.length === 0) {
        console.warn('이미지가 없는 작품:', artworkData.title);
        return null;
    }

    const newItem = document.createElement('div');
    newItem.className = 'artwork-card';
    Object.assign(newItem.dataset, {
        category: artworkData.category || 'drawing',
        artworkId: artworkData.id,
        imageUrls: JSON.stringify(imageUrls)
    });

    const uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
    const imageCountBadge = imageUrls.length > 1 ? `<span class="artwork-type">${imageUrls.length}장</span>` : '';

    newItem.innerHTML = `
        <div class="artwork-image">
            <img src="${imageUrls[0]}" alt="${artworkData.title}" loading="lazy">
            ${imageCountBadge}
            <div class="admin-controls">
                <button class="btn btn-warning btn-small" onclick="editArtwork('${artworkData.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="deleteArtwork('${artworkData.id}')">삭제</button>
            </div>
        </div>
        <div class="artwork-info">
            <h3 class="artwork-title">${artworkData.title}</h3>
            <p class="artwork-author">${artworkData.studentName} (${artworkData.grade})</p>
            <p class="artwork-description">${artworkData.description || '작품 설명이 없습니다.'}</p>
            <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
        </div>
    `;
    
    return newItem;
}

function addEventListenersToArtwork(element) {
    if (!element) return;
    
    element.addEventListener('click', (e) => {
        // 관리자 버튼 클릭시에는 모달 열지 않음
        if (e.target.closest('.admin-controls')) return;
        showArtworkDetailModal(element);
    });
}

function showArtworkDetailModal(item) {
    if (!item) return;
    
    currentArtworkIdForModal = item.dataset.artworkId;
    
    const artwork = allArtworks.find(a => a.id === currentArtworkIdForModal);
    if (!artwork) return;
    
    currentDetailImageUrls = artwork.imageUrls || [];
    currentDetailImageIndex = 0;

    const categoryMap = { 
        'drawing': '그림', 
        'craft': '공예', 
        'sculpture': '조소', 
        'digital': '디지털아트' 
    };
    
    // 모달 내용 업데이트
    document.getElementById('detailArtworkTitle').textContent = artwork.title;
    document.getElementById('detailStudentName').textContent = artwork.studentName;
    document.getElementById('detailGrade').textContent = artwork.grade;
    document.getElementById('detailCategory').textContent = categoryMap[artwork.category] || artwork.category;
    document.getElementById('detailUploadDate').textContent = new Date(artwork.uploadDate).toLocaleDateString('ko-KR');
    document.getElementById('detailDescriptionText').textContent = artwork.description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery();

    const linkSection = document.getElementById('detailLinkSection');
    if (linkSection && artwork.link) {
        linkSection.style.display = 'block';
        const linkElement = document.getElementById('detailLink');
        if (linkElement) linkElement.href = artwork.link;
    } else if (linkSection) {
        linkSection.style.display = 'none';
    }
    
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function updateDetailImageGallery() {
    const mainImg = document.getElementById('currentMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    if (!mainImg || !thumbnailsContainer) return;
    
    if (currentDetailImageUrls.length > 0) {
        mainImg.src = currentDetailImageUrls[currentDetailImageIndex];
        currentDetailImageUrl = mainImg.src;
        
        // 썸네일 생성
        thumbnailsContainer.innerHTML = '';
        if (currentDetailImageUrls.length > 1) {
            currentDetailImageUrls.forEach((url, index) => {
                const thumb = document.createElement('img');
                thumb.src = url;
                thumb.className = 'modal-thumbnail-img';
                if (index === currentDetailImageIndex) {
                    thumb.classList.add('active');
                }
                thumb.onclick = () => {
                    currentDetailImageIndex = index;
                    updateDetailImageGallery();
                };
                thumbnailsContainer.appendChild(thumb);
            });
        }
    }
}

async function deleteArtworkProcess(artworkId) {
    try {
        // 로컬 데이터에서 제거
        allArtworks = allArtworks.filter(art => art.id !== artworkId);
        
        // 서버에 업데이트
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));

        // UI에서 제거
        const elementsToRemove = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        elementsToRemove.forEach(element => {
            element.style.transition = 'all 0.5s ease';
            element.style.transform = 'scale(0)';
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
            }, 500);
        });
        
        alert('작품이 성공적으로 삭제되었습니다.');
        window.closeModal();
        updateGalleryState();

    } catch (error) {
        console.error('❌ 작품 삭제 중 오류 발생:', error);
        alert('작품 삭제에 실패했습니다. 다시 시도해주세요.');
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // 모든 갤러리 아이템 숨기기
    const allItems = document.querySelectorAll('.artwork-card');
    allItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // 필터링된 작품들 표시
    let visibleCount = 0;
    allArtworks.forEach(artwork => {
        const matchesFilter = currentFilter === 'all' || 
                            artwork.grade === currentFilter || 
                            artwork.category === currentFilter;
        
        const matchesSearch = searchTerm === '' || 
                            artwork.title.toLowerCase().includes(searchTerm) ||
                            artwork.studentName?.toLowerCase().includes(searchTerm) ||
                            artwork.description?.toLowerCase().includes(searchTerm);
        
        const matchesType = currentType === 'all' || artwork.category === currentType;
        
        if (matchesFilter && matchesSearch && matchesType) {
            const element = document.querySelector(`[data-artwork-id="${artwork.id}"]`);
            if (element) {
                element.style.display = 'block';
                visibleCount++;
            }
        }
    });
    
    // 갤러리 상태 업데이트
    updateGalleryState();
    console.log(`필터 적용 완료: ${visibleCount}개 작품 표시`);
}

function updateGalleryState() {
    updateTypeCounts();
}

function updateTypeCounts() {
    const counts = {
        all: allArtworks.length,
        drawing: allArtworks.filter(a => a.category === 'drawing').length,
        craft: allArtworks.filter(a => a.category === 'craft').length,
        sculpture: allArtworks.filter(a => a.category === 'sculpture').length,
        digital: allArtworks.filter(a => a.category === 'digital').length
    };
    
    // UI 업데이트
    Object.keys(counts).forEach(type => {
        const countElement = document.getElementById(`${type}Count`);
        if (countElement) {
            countElement.textContent = `${counts[type]}개 작품`;
        }
    });
}

function updateConnectionStatus(status, message) {
    const statusText = document.getElementById('upstashStatus');
    if (statusText) {
        statusText.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) {
        totalCountEl.textContent = allArtworks.length;
    }
    
    isConnected = status === 'connected';
    validateForm(); // 연결 상태 변경시 폼 유효성 재검사
}

function loadAdminData() {
    document.getElementById('statArtworks').textContent = allArtworks.length;
    document.getElementById('statComments').textContent = '0';
    document.getElementById('statLikes').textContent = '0';
    
    const today = new Date().toDateString();
    const todayArtworks = allArtworks.filter(art => 
        new Date(art.uploadDate).toDateString() === today
    );
    document.getElementById('statToday').textContent = todayArtworks.length;
    
    if (document.querySelector('.admin-tab.active')?.textContent.includes('작품 관리')) {
        loadArtworksTable();
    }
}

function loadArtworksTable() {
    const tbody = document.getElementById('artworksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = allArtworks.map(artwork => `
        <tr>
            <td><input type="checkbox" value="${artwork.id}"></td>
            <td>${artwork.title}</td>
            <td>${artwork.studentName}</td>
            <td>${artwork.grade}</td>
            <td>${artwork.category}</td>
            <td>${new Date(artwork.uploadDate).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-warning btn-small" onclick="editArtwork('${artwork.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="deleteArtwork('${artwork.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
}

// 추가 유틸리티 함수들
window.bulkDeleteArtworks = function() {
    console.log('일괄 삭제 요청');
    alert('일괄 삭제 기능은 현재 준비 중입니다.');
};

window.bulkDeleteComments = function() {
    console.log('댓글 일괄 삭제 요청');
    alert('댓글 일괄 삭제 기능은 현재 준비 중입니다.');
};

window.exportData = function() {
    console.log('데이터 내보내기 요청');
    const dataStr = JSON.stringify(allArtworks, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'artworks_backup.json';
    link.click();
    URL.revokeObjectURL(url);
};

window.resetAllData = function() {
    console.log('모든 데이터 초기화 요청');
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        if (confirm('한 번 더 확인합니다. 모든 작품과 데이터가 영구적으로 삭제됩니다.')) {
            allArtworks = [];
            callUpstashAPI('DEL', REDIS_KEY);
            renderArtworks();
            updateGalleryState();
            alert('모든 데이터가 삭제되었습니다.');
        }
    }
};

window.previewHeaderImage = function() {
    console.log('헤더 이미지 미리보기');
    const fileInput = document.getElementById('headerImageFile');
    const preview = document.getElementById('headerImagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

window.removeHeaderImage = function() {
    console.log('헤더 이미지 제거');
    const preview = document.getElementById('headerImagePreview');
    const fileInput = document.getElementById('headerImageFile');
    
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
};

// Cloudinary 업로드 함수
window.uploadToCloudinary = function() {
    console.log('Cloudinary 업로드 시도');
    if (typeof cloudinary !== 'undefined') {
        cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            multiple: true,
            maxFiles: 10,
            folder: 'student-gallery',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
            maxFileSize: 10000000, // 10MB
            sources: ['local', 'camera']
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                uploadedImages.push(result.info.secure_url);
                updateImagePreview();
                validateForm();
                console.log('Cloudinary 업로드 성공:', result.info.secure_url);
            }
            if (error) {
                console.error('Cloudinary 업로드 오류:', error);
                alert('이미지 업로드 중 오류가 발생했습니다.');
            }
        }).open();
    } else {
        alert('이미지 업로드 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
};

// 페이지 언로드시 정리
window.addEventListener('beforeunload', function() {
    if (isUploading) {
        return '작품 업로드가 진행 중입니다. 페이지를 떠나시겠습니까?';
    }
});

// 에러 핸들링
window.addEventListener('error', function(e) {
    console.error('전역 오류 발생:', e.error);
});

// 온라인/오프라인 상태 감지
window.addEventListener('online', function() {
    console.log('온라인 상태로 변경됨');
    checkConnectionAndLoadArtworks();
});

window.addEventListener('offline', function() {
    console.log('오프라인 상태로 변경됨');
    updateConnectionStatus('disconnected', '오프라인 상태');
});

// 디버깅용 함수들
window.debugGallery = function() {
    console.log('=== 갤러리 디버그 정보 ===');
    console.log('isConnected:', isConnected);
    console.log('isAdmin:', isAdmin);
    console.log('allArtworks:', allArtworks);
    console.log('uploadedImages:', uploadedImages);
    console.log('currentFilter:', currentFilter);
    console.log('currentType:', currentType);
    console.log('========================');
};

// 테스트용 데이터 추가
window.addTestArtwork = function() {
    const testArtwork = {
        id: 'test_' + Date.now(),
        title: '테스트 작품',
        studentName: '홍길동',
        grade: '3학년',
        category: 'drawing',
        description: '테스트용 작품입니다.',
        imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsnYw8L3RleHQ+PC9zdmc+'],
        uploadDate: new Date().toISOString(),
        link: ''
    };
    
    allArtworks.unshift(testArtwork);
    renderArtworks();
    updateGalleryState();
    console.log('테스트 작품 추가됨');
};

console.log('🎨 갤러리 JavaScript 완전히 로드 완료');
console.log('디버그 함수: window.debugGallery(), window.addTestArtwork()');

// 초기화 완료 표시
setTimeout(() => {
    console.log('🚀 갤러리 시스템 준비 완료!');
    console.log('- 버튼 클릭 테스트: 작품 올리기, 관리자 모드');
    console.log('- 이벤트 리스너들이 모두 등록되었습니다.');
}, 1000);// 학생 작품 갤러리 JavaScript - 작품 등록 오류 수정 버전

// Cloudinary 설정
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',
    uploadPreset: 'student_gallery'
};

// Upstash Redis 설정
const UPSTASH_CONFIG = {
    url: 'https://sharp-hookworm-54944.upstash.io',
    token: 'AdagAAIncDFhNjc5YWZmYzQ5NDA0ZTEyODQ5ZGNmNDU5YTEwOGM4MHAxNTQ5NDQ'
};

// Redis 키
const REDIS_KEY = 'student_gallery:artworks';

// 관리자 비밀번호
const ADMIN_PASSWORD = "admin1234"; 

// 전역 변수
let isConnected = false;
let isAdmin = false;
let currentArtworkIdForModal = null;
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;
let currentDetailImageUrl = '';
let isUploading = false;
let uploadedImages = [];
let allArtworks = [];
let currentFilter = 'all';
let currentType = 'all';

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    initEventListeners();
    checkConnectionAndLoadArtworks();
    showStatusSection(); // 상태 섹션 기본 표시
    console.log('✅ 모든 기능이 준비되었습니다!');
});

// 상태 섹션 표시
function showStatusSection() {
    const statusSection = document.getElementById('statusSection');
    if (statusSection) {
        statusSection.classList.add('active');
    }
}

// 이벤트 리스너 초기화
function initEventListeners() {
    initFilterButtons();
    initTypeButtons();
    initSearchInput();
    initAdminFeatures();
    initFormEvents();
    initImageUpload();
}

// 이미지 업로드 초기화
function initImageUpload() {
    const imageUploadArea = document.getElementById('imageFile');
    if (imageUploadArea) {
        imageUploadArea.addEventListener('change', handleFileSelect);
    }
}

// 파일 선택 처리
function handleFileSelect(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        uploadedImages = []; // 기존 이미지 초기화
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImages.push(e.target.result);
                updateImagePreview();
                validateForm();
                console.log(`이미지 ${index + 1} 로드 완료`);
            };
            reader.readAsDataURL(file);
        });
    }
}

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const uploadText = document.getElementById('uploadText');
    
    if (!container) return;
    
    container.innerHTML = uploadedImages.map((url, index) =>
        `<div class="preview-item" style="position: relative; display: inline-block; margin: 5px;">
            <img src="${url}" alt="미리보기 ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
            <button type="button" onclick="removeImage(${index})" style="position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">&times;</button>
        </div>`
    ).join('');
    
    if (uploadText) {
        uploadText.style.display = uploadedImages.length > 0 ? 'none' : 'block';
    }
}

// 이미지 제거
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    validateForm();
}

// 필터 버튼 초기화
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.category;
            applyFilters();
        });
    });
}

// 타입 버튼 초기화
function initTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-tab');
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            typeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentType = this.dataset.type;
            switchTypeTab(currentType);
        });
    });
}

// 검색 입력 초기화
function initSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }
}

// 필터 적용 함수
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // 모든 갤러리 아이템 숨기기
    const allItems = document.querySelectorAll('.artwork-card');
    allItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // 필터링된 작품들 표시
    let visibleCount = 0;
    allArtworks.forEach(artwork => {
        const matchesFilter = currentFilter === 'all' || 
                            artwork.grade === currentFilter || 
                            artwork.category === currentFilter;
        
        const matchesSearch = searchTerm === '' || 
                            artwork.title.toLowerCase().includes(searchTerm) ||
                            artwork.studentName?.toLowerCase().includes(searchTerm) ||
                            artwork.description?.toLowerCase().includes(searchTerm);
        
        const matchesType = currentType === 'all' || artwork.category === currentType;
        
        if (matchesFilter && matchesSearch && matchesType) {
            const element = document.querySelector(`[data-artwork-id="${artwork.id}"]`);
            if (element) {
                element.style.display = 'block';
                visibleCount++;
            }
        }
    });
    
    // 갤러리 상태 업데이트
    updateGalleryState();
    console.log(`필터 적용 완료: ${visibleCount}개 작품 표시`);
}

// 타입 탭 전환
function switchTypeTab(type) {
    currentType = type;
    
    // 모든 섹션 숨기기
    const sections = document.querySelectorAll('.type-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 해당 섹션 표시
    const targetSection = type === 'all' ? 'allSection' : `${type}Section`;
    const section = document.getElementById(targetSection);
    if (section) {
        section.classList.add('active');
    }
    
    // 필터 재적용
    applyFilters();
}

// 갤러리 상태 업데이트
function updateGalleryState() {
    const visibleItems = document.querySelectorAll('.artwork-card[style*="block"]');
    const isEmpty = visibleItems.length === 0;
    
    // 타입별 카운트 업데이트
    updateTypeCounts();
}

// 타입별 작품 수 업데이트
function updateTypeCounts() {
    const counts = {
        all: allArtworks.length,
        drawing: allArtworks.filter(a => a.category === 'drawing').length,
        craft: allArtworks.filter(a => a.category === 'craft').length,
        sculpture: allArtworks.filter(a => a.category === 'sculpture').length,
        digital: allArtworks.filter(a => a.category === 'digital').length
    };
    
    // UI 업데이트
    Object.keys(counts).forEach(type => {
        const countElement = document.getElementById(`${type}Count`);
        if (countElement) {
            countElement.textContent = `${counts[type]}개 작품`;
        }
    });
}

// 패널 토글 함수들
function toggleUploadPanel() {
    const panel = document.getElementById('uploadPanel');
    const buttons = document.querySelectorAll('.header-btn');
    const uploadButton = buttons[0];
    
    // 모든 패널 숨기기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        uploadButton.classList.add('active');
        resetForm();
    }
}

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const buttons = document.querySelectorAll('.header-btn');
    const adminButton = buttons[1];
    
    if (!isAdmin) {
        promptForAdminLogin();
        return;
    }
    
    // 모든 패널 숨기기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        adminButton.classList.add('active');
        loadAdminData();
    }
}

// 관리자 기능
function initAdminFeatures() {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        enableAdminUI();
    }
}

function promptForAdminLogin() {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === ADMIN_PASSWORD) {
        alert('✅ 관리자 모드가 활성화되었습니다.');
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        enableAdminUI();
        toggleAdminPanel();
    } else if (password) {
        alert('❌ 비밀번호가 틀렸습니다.');
    }
}

function enableAdminUI() {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    console.log('🔧 관리자 UI가 활성화되었습니다.');
}

// API 및 데이터 처리
async function callUpstashAPI(command, key, value = null) {
    try {
        const url = `${UPSTASH_CONFIG.url}/${command.toLowerCase()}${key ? `/${encodeURIComponent(key)}` : ''}`;
        const options = {
            method: command === 'GET' || command === 'PING' ? 'GET' : 'POST',
            headers: { 'Authorization': `Bearer ${UPSTASH_CONFIG.token}` }
        };
        if (value !== null) options.body = value;
        
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()).result;
    } catch (error) {
        console.error('❌ Upstash API 호출 오류:', error);
        throw error;
    }
}

async function checkConnectionAndLoadArtworks() {
    updateConnectionStatus('connecting', '서버 연결 중...');
    try {
        await callUpstashAPI('PING');
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        await loadArtworksFromUpstash();
    } catch (error) {
        updateConnectionStatus('disconnected', '연결 실패');
        console.error('연결 오류:', error);
    }
}

async function loadArtworksFromUpstash() {
    try {
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (artworksData) {
            allArtworks = JSON.parse(artworksData);
            renderArtworks();
            updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품 동기화됨`);
            console.log(`${allArtworks.length}개 작품 로드 완료`);
        } else {
            allArtworks = [];
            updateConnectionStatus('connected', '온라인 - 새 갤러리');
            console.log('새로운 갤러리 시작');
        }
        updateGalleryState();
    } catch (error) {
        updateGalleryState();
        updateConnectionStatus('disconnected', '작품 로드 실패');
        console.error('작품 로드 오류:', error);
    }
}

function renderArtworks() {
    const galleries = {
        all: document.getElementById('galleryGrid'),
        drawing: document.getElementById('drawingGallery'),
        craft: document.getElementById('craftGallery'),
        sculpture: document.getElementById('sculptureGallery'),
        digital: document.getElementById('digitalGallery')
    };
    
    // 모든 갤러리 초기화
    Object.values(galleries).forEach(gallery => {
        if (gallery) gallery.innerHTML = '';
    });
    
    // 작품들을 각 갤러리에 추가
    allArtworks.forEach((artwork, index) => {
        setTimeout(() => {
            const element = createArtworkElement(artwork);
            if (!element) return;
            
            // 전체 갤러리에 추가
            if (galleries.all) {
                const clonedElement = element.cloneNode(true);
                galleries.all.appendChild(clonedElement);
                addEventListenersToArtwork(clonedElement);
            }
            
            // 해당 카테고리 갤러리에 추가
            if (galleries[artwork.category]) {
                const clonedElement = element.cloneNode(true);
                galleries[artwork.category].appendChild(clonedElement);
                addEventListenersToArtwork(clonedElement);
            }
            
            // 애니메이션 효과
            setTimeout(() => {
                const elements = document.querySelectorAll(`[data-artwork-id="${artwork.id}"]`);
                elements.forEach(el => el.classList.add('show'));
            }, 100);
        }, index * 50);
    });
}

function createArtworkElement(artworkData) {
    const imageUrls = artworkData.imageUrls || [];
    if (!imageUrls || imageUrls.length === 0) {
        console.warn('이미지가 없는 작품:', artworkData.title);
        return null;
    }

    const newItem = document.createElement('div');
    newItem.className = 'artwork-card';
    Object.assign(newItem.dataset, {
        category: artworkData.category || 'drawing',
        artworkId: artworkData.id,
        imageUrls: JSON.stringify(imageUrls)
    });

    const uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
    const imageCountBadge = imageUrls.length > 1 ? `<span class="artwork-type">${imageUrls.length}장</span>` : '';

    newItem.innerHTML = `
        <div class="artwork-image">
            <img src="${imageUrls[0]}" alt="${artworkData.title}" loading="lazy">
            ${imageCountBadge}
            <div class="admin-controls">
                <button class="btn btn-warning btn-small" onclick="editArtwork('${artworkData.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="deleteArtwork('${artworkData.id}')">삭제</button>
            </div>
        </div>
        <div class="artwork-info">
            <h3 class="artwork-title">${artworkData.title}</h3>
            <p class="artwork-author">${artworkData.studentName} (${artworkData.grade})</p>
            <p class="artwork-description">${artworkData.description || '작품 설명이 없습니다.'}</p>
            <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
        </div>
    `;
    
    return newItem;
}

function addEventListenersToArtwork(element) {
    if (!element) return;
    
    element.addEventListener('click', (e) => {
        // 관리자 버튼 클릭시에는 모달 열지 않음
        if (e.target.closest('.admin-controls')) return;
        showArtworkDetailModal(element);
    });
}

// 모달 관련 함수
function showArtworkDetailModal(item) {
    if (!item) return;
    
    currentArtworkIdForModal = item.dataset.artworkId;
    
    const artwork = allArtworks.find(a => a.id === currentArtworkIdForModal);
    if (!artwork) return;
    
    currentDetailImageUrls = artwork.imageUrls || [];
    currentDetailImageIndex = 0;

    const categoryMap = { 
        'drawing': '그림', 
        'craft': '공예', 
        'sculpture': '조소', 
        'digital': '디지털아트' 
    };
    
    // 모달 내용 업데이트
    document.getElementById('detailArtworkTitle').textContent = artwork.title;
    document.getElementById('detailStudentName').textContent = artwork.studentName;
    document.getElementById('detailGrade').textContent = artwork.grade;
    document.getElementById('detailCategory').textContent = categoryMap[artwork.category] || artwork.category;
    document.getElementById('detailUploadDate').textContent = new Date(artwork.uploadDate).toLocaleDateString('ko-KR');
    document.getElementById('detailDescriptionText').textContent = artwork.description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery();

    const linkSection = document.getElementById('detailLinkSection');
    if (linkSection && artwork.link) {
        linkSection.style.display = 'block';
        const linkElement = document.getElementById('detailLink');
        if (linkElement) linkElement.href = artwork.link;
    } else if (linkSection) {
        linkSection.style.display = 'none';
    }
    
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function updateDetailImageGallery() {
    const mainImg = document.getElementById('currentMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    if (!mainImg || !thumbnailsContainer) return;
    
    if (currentDetailImageUrls.length > 0) {
        mainImg.src = currentDetailImageUrls[currentDetailImageIndex];
        currentDetailImageUrl = mainImg.src;
        
        // 썸네일 생성
        thumbnailsContainer.innerHTML = '';
        if (currentDetailImageUrls.length > 1) {
            currentDetailImageUrls.forEach((url, index) => {
                const thumb = document.createElement('img');
                thumb.src = url;
                thumb.className = 'modal-thumbnail-img';
                if (index === currentDetailImageIndex) {
                    thumb.classList.add('active');
                }
                thumb.onclick = () => {
                    currentDetailImageIndex = index;
                    updateDetailImageGallery();
                };
                thumbnailsContainer.appendChild(thumb);
            });
        }
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentArtworkIdForModal = null;
}

function openImageInNewTab() {
    if (currentDetailImageUrl) {
        window.open(currentDetailImageUrl, '_blank');
    }
}

// 작품 삭제 함수
async function deleteArtwork(artworkId) {
    if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
        return;
    }

    try {
        // 로컬 데이터에서 제거
        allArtworks = allArtworks.filter(art => art.id !== artworkId);
        
        // 서버에 업데이트
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));

        // UI에서 제거
        const elementsToRemove = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        elementsToRemove.forEach(element => {
            element.style.transition = 'all 0.5s ease';
            element.style.transform = 'scale(0)';
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
            }, 500);
        });
        
        alert('작품이 성공적으로 삭제되었습니다.');
        closeModal();
        updateGalleryState();

    } catch (error) {
        console.error('❌ 작품 삭제 중 오류 발생:', error);
        alert('작품 삭제에 실패했습니다. 다시 시도해주세요.');
    }
}

// 폼 이벤트 초기화
function initFormEvents() {
    const form = document.getElementById('artworkForm');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    // 입력 필드 유효성 검사
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('폼 제출 시도');
    
    if (!validateForm()) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
        // 폼 데이터 수집
        const formData = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: document.getElementById('artworkTitle').value.trim(),
            studentName: document.getElementById('studentName').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink').value.trim(),
            imageUrls: [...uploadedImages], // 이미지 URL 복사
            uploadDate: new Date().toISOString()
        };
        
        console.log('등록할 작품 데이터:', formData);
        
        if (formData.imageUrls.length === 0) {
            throw new Error('이미지가 선택되지 않았습니다.');
        }
        
        // 로컬 데이터에 추가
        allArtworks.unshift(formData);
        
        // 서버에 저장
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
        
        // UI 업데이트
        renderArtworks();
        applyFilters();
        
        // 폼 초기화 및 패널 닫기
        resetForm();
        toggleUploadPanel();
        
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
        
        console.log('작품 등록 완료');
        
    } catch (error) {
        console.error('❌ 작품 등록 중 오류:', error);
        alert(`작품 등록 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim();
    const studentName = document.getElementById('studentName')?.value.trim();
    const grade = document.getElementById('studentGrade')?.value;
    const category = document.getElementById('artworkCategory')?.value;
    const description = document.getElementById('artworkDescription')?.value.trim();
    
    const isValid = title && studentName && grade && category && description && 
                   uploadedImages.length > 0 && isConnected && !isUploading;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
    
    console.log('폼 유효성 검사:', {
        title: !!title,
        studentName: !!studentName,
        grade: !!grade,
        category: !!category,
        description: !!description,
        images: uploadedImages.length,
        connected: isConnected,
        uploading: !isUploading,
        valid: isValid
    });
    
    return isValid;
}

function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    updateImagePreview();
    validateForm();
}

// 상태 업데이트 함수
function updateConnectionStatus(status, message) {
    const statusText = document.getElementById('upstashStatus');
    if (statusText) {
        statusText.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) {
        totalCountEl.textContent = allArtworks.length;
    }
    
    isConnected = status === 'connected';
    validateForm(); // 연결 상태 변경시 폼 유효성 재검사
}

// 관리자 데이터 로드
function loadAdminData() {
    document.getElementById('statArtworks').textContent = allArtworks.length;
    document.getElementById('statComments').textContent = '0';
    document.getElementById('statLikes').textContent = '0';
    
    const today = new Date().toDateString();
    const todayArtworks = allArtworks.filter(art => 
        new Date(art.uploadDate).toDateString() === today
    );
    document.getElementById('statToday').textContent = todayArtworks.length;
    
    if (document.querySelector('.admin-tab.active')?.textContent === '작품 관리') {
        loadArtworksTable();
    }
}

function loadArtworksTable() {
    const tbody = document.getElementById('artworksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = allArtworks.map(artwork => `
        <tr>
            <td><input type="checkbox" value="${artwork.id}"></td>
            <td>${artwork.title}</td>
            <td>${artwork.studentName}</td>
            <td>${artwork.grade}</td>
            <td>${artwork.category}</td>
            <td>${new Date(artwork.uploadDate).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-warning btn-small" onclick="editArtwork('${artwork.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="deleteArtwork('${artwork.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
}

// 관리자 탭 전환
function switchAdminTab(tab) {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchAdminTab('${tab}')"]`).classList.add('active');
    const content = document.getElementById(`${tab}Content`);
    if (content) {
        content.classList.add('active');
    }
    
    if (tab === 'artworks') {
        loadArtworksTable();
    }
}

// 기타 함수들
function editArtwork(id) {
    alert('수정 기능은 현재 준비 중입니다.');
}

function saveSettings() {
    alert('설정이 저장되었습니다.');
}

function bulkDeleteArtworks() {
    alert('일괄 삭제 기능은 현재 준비 중입니다.');
}

function bulkDeleteComments() {
    alert('댓글 일괄 삭제 기능은 현재 준비 중입니다.');
}

function exportData() {
    const dataStr = JSON.stringify(allArtworks, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'artworks_backup.json';
    link.click();
    URL.revokeObjectURL(url);
}

function resetAllData() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        if (confirm('한 번 더 확인합니다. 모든 작품과 데이터가 영구적으로 삭제됩니다.')) {
            allArtworks = [];
            callUpstashAPI('DEL', REDIS_KEY);
            renderArtworks();
            updateGalleryState();
            alert('모든 데이터가 삭제되었습니다.');
        }
    }
}

function previewHeaderImage() {
    const fileInput = document.getElementById('headerImageFile');
    const preview = document.getElementById('headerImagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function removeHeaderImage() {
    const preview = document.getElementById('headerImagePreview');
    const fileInput = document.getElementById('headerImageFile');
    
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

function closeFullscreenImage() {
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Cloudinary 이미지 업로드 (선택사항 - 더 나은 이미지 관리를 위해)
function uploadToCloudinary() {
    if (typeof cloudinary !== 'undefined') {
        cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            multiple: true,
            maxFiles: 10,
            folder: 'student-gallery',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
            maxFileSize: 10000000, // 10MB
            sources: ['local', 'camera']
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                uploadedImages.push(result.info.secure_url);
                updateImagePreview();
                validateForm();
                console.log('Cloudinary 업로드 성공:', result.info.secure_url);
            }
            if (error) {
                console.error('Cloudinary 업로드 오류:', error);
                alert('이미지 업로드 중 오류가 발생했습니다.');
            }
        }).open();
    } else {
        alert('이미지 업로드 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
}

// 전역 함수로 노출 (HTML에서 호출용)
window.toggleUploadPanel = toggleUploadPanel;
window.toggleAdminPanel = toggleAdminPanel;
window.switchTypeTab = switchTypeTab;
window.switchAdminTab = switchAdminTab;
window.closeModal = closeModal;
window.openImageInNewTab = openImageInNewTab;
window.deleteArtwork = deleteArtwork;
window.editArtwork = editArtwork;
window.saveSettings = saveSettings;
window.removeImage = removeImage;
window.bulkDeleteArtworks = bulkDeleteArtworks;
window.bulkDeleteComments = bulkDeleteComments;
window.exportData = exportData;
window.resetAllData = resetAllData;
window.previewHeaderImage = previewHeaderImage;
window.removeHeaderImage = removeHeaderImage;
window.closeFullscreenImage = closeFullscreenImage;
window.uploadToCloudinary = uploadToCloudinary;

// 페이지 언로드시 정리
window.addEventListener('beforeunload', function() {
    // 업로드 중이면 경고
    if (isUploading) {
        return '작품 업로드가 진행 중입니다. 페이지를 떠나시겠습니까?';
    }
});

// 에러 핸들링
window.addEventListener('error', function(e) {
    console.error('전역 오류 발생:', e.error);
});

// 온라인/오프라인 상태 감지
window.addEventListener('online', function() {
    console.log('온라인 상태로 변경됨');
    checkConnectionAndLoadArtworks();
});

window.addEventListener('offline', function() {
    console.log('오프라인 상태로 변경됨');
    updateConnectionStatus('disconnected', '오프라인 상태');
});

console.log('🎨 갤러리 JavaScript 로드 완료');// 학생 작품 갤러리 JavaScript - 사용자 친화적 버전

// Cloudinary 설정
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',
    uploadPreset: 'student_gallery'
};

// Upstash Redis 설정
const UPSTASH_CONFIG = {
    url: 'https://sharp-hookworm-54944.upstash.io',
    token: 'AdagAAIncDFhNjc5YWZmYzQ5NDA0ZTEyODQ5ZGNmNDU5YTEwOGM4MHAxNTQ5NDQ'
};

// Redis 키
const REDIS_KEY = 'student_gallery:artworks';

// 관리자 비밀번호
const ADMIN_PASSWORD = "admin1234"; 

// 전역 변수
let isConnected = false;
let isAdmin = false;
let currentArtworkIdForModal = null;
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;
let currentDetailImageUrl = '';
let isUploading = false;
let uploadedImages = [];
let allArtworks = []; // 모든 작품 데이터 저장
let currentFilter = 'all'; // 현재 필터 상태
let currentType = 'all'; // 현재 타입 상태

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    initEventListeners();
    checkConnectionAndLoadArtworks();
    console.log('✅ 모든 기능이 준비되었습니다!');
});

// 이벤트 리스너 초기화
function initEventListeners() {
    initFilterButtons();
    initTypeButtons();
    initSearchInput();
    initAdminFeatures();
    initFormEvents();
}

// 필터 버튼 초기화
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 활성 상태 업데이트
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 필터 적용
            currentFilter = this.dataset.category;
            applyFilters();
        });
    });
}

// 타입 버튼 초기화
function initTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-tab');
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 활성 상태 업데이트
            typeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 타입 변경
            currentType = this.dataset.type;
            switchTypeTab(currentType);
        });
    });
}

// 검색 입력 초기화
function initSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }
}

// 필터 적용 함수
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // 모든 갤러리 아이템 숨기기
    const allItems = document.querySelectorAll('.gallery-item');
    allItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // 필터링된 작품들 표시
    allArtworks.forEach(artwork => {
        const matchesFilter = currentFilter === 'all' || 
                            artwork.grade === currentFilter || 
                            artwork.category === currentFilter;
        
        const matchesSearch = searchTerm === '' || 
                            artwork.title.toLowerCase().includes(searchTerm) ||
                            artwork.author?.toLowerCase().includes(searchTerm) ||
                            artwork.description?.toLowerCase().includes(searchTerm);
        
        const matchesType = currentType === 'all' || artwork.category === currentType;
        
        if (matchesFilter && matchesSearch && matchesType) {
            const element = document.querySelector(`[data-artwork-id="${artwork.id}"]`);
            if (element) {
                element.style.display = 'flex';
            }
        }
    });
    
    // 갤러리 상태 업데이트
    updateGalleryState();
}

// 타입 탭 전환
function switchTypeTab(type) {
    currentType = type;
    
    // 모든 섹션 숨기기
    const sections = document.querySelectorAll('.type-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 해당 섹션 표시
    const targetSection = type === 'all' ? 'allSection' : `${type}Section`;
    const section = document.getElementById(targetSection);
    if (section) {
        section.classList.add('active');
    }
    
    // 필터 재적용
    applyFilters();
}

// 갤러리 상태 업데이트
function updateGalleryState() {
    const visibleItems = document.querySelectorAll('.gallery-item[style*="flex"]');
    const isEmpty = visibleItems.length === 0;
    
    // 빈 갤러리 메시지 표시/숨김
    const emptyGallery = document.getElementById('emptyGallery');
    if (emptyGallery) {
        emptyGallery.style.display = isEmpty ? 'block' : 'none';
    }
    
    // 타입별 카운트 업데이트
    updateTypeCounts();
}

// 타입별 작품 수 업데이트
function updateTypeCounts() {
    const counts = {
        all: 0,
        drawing: 0,
        craft: 0,
        sculpture: 0,
        digital: 0
    };
    
    allArtworks.forEach(artwork => {
        counts.all++;
        if (counts[artwork.category] !== undefined) {
            counts[artwork.category]++;
        }
    });
    
    // UI 업데이트
    Object.keys(counts).forEach(type => {
        const countElement = document.getElementById(`${type}Count`);
        if (countElement) {
            countElement.textContent = `${counts[type]}개 작품`;
        }
    });
}

// 패널 토글 함수들
function toggleUploadPanel() {
    const panel = document.getElementById('uploadPanel');
    const button = document.querySelector('.header-btn');
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        button.classList.remove('active');
    } else {
        // 다른 패널들 닫기
        document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
        
        panel.style.display = 'block';
        button.classList.add('active');
    }
}

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const button = document.querySelectorAll('.header-btn')[1];
    
    if (!isAdmin) {
        promptForAdminLogin();
        return;
    }
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        button.classList.remove('active');
    } else {
        // 다른 패널들 닫기
        document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
        
        panel.style.display = 'block';
        button.classList.add('active');
        loadAdminData();
    }
}

// 관리자 기능
function initAdminFeatures() {
    // 세션 확인
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        enableAdminUI();
    }
}

function promptForAdminLogin() {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === ADMIN_PASSWORD) {
        alert('✅ 관리자 모드가 활성화되었습니다.');
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        enableAdminUI();
        toggleAdminPanel();
    } else if (password) {
        alert('❌ 비밀번호가 틀렸습니다.');
    }
}

function enableAdminUI() {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    console.log('🔧 관리자 UI가 활성화되었습니다.');
}

// API 및 데이터 처리
async function callUpstashAPI(command, key, value = null) {
    try {
        const url = `${UPSTASH_CONFIG.url}/${command.toLowerCase()}${key ? `/${encodeURIComponent(key)}` : ''}`;
        const options = {
            method: command === 'GET' || command === 'PING' ? 'GET' : 'POST',
            headers: { 'Authorization': `Bearer ${UPSTASH_CONFIG.token}` }
        };
        if (value !== null) options.body = value;
        
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()).result;
    } catch (error) {
        console.error('❌ Upstash API 호출 오류:', error);
        throw error;
    }
}

async function checkConnectionAndLoadArtworks() {
    updateConnectionStatus('connecting', '서버 연결 중...');
    try {
        await callUpstashAPI('PING');
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        await loadArtworksFromUpstash();
    } catch (error) {
        updateConnectionStatus('disconnected', '연결 실패');
    }
}

async function loadArtworksFromUpstash() {
    showLoading();
    try {
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (artworksData) {
            allArtworks = JSON.parse(artworksData);
            renderArtworks();
            updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품 동기화됨`);
        } else {
            allArtworks = [];
            updateConnectionStatus('connected', '온라인 - 새 갤러리');
        }
        hideLoading();
        updateGalleryState();
    } catch (error) {
        hideLoading();
        updateGalleryState();
        updateConnectionStatus('disconnected', '작품 로드 실패');
    }
}

function renderArtworks() {
    const galleries = {
        all: document.getElementById('galleryGrid'),
        drawing: document.getElementById('drawingGallery'),
        craft: document.getElementById('craftGallery'),
        sculpture: document.getElementById('sculptureGallery'),
        digital: document.getElementById('digitalGallery')
    };
    
    // 모든 갤러리 초기화
    Object.values(galleries).forEach(gallery => {
        if (gallery) gallery.innerHTML = '';
    });
    
    // 작품들을 각 갤러리에 추가
    allArtworks.forEach((artwork, index) => {
        setTimeout(() => {
            const element = createArtworkElement(artwork);
            
            // 전체 갤러리에 추가
            if (galleries.all) {
                galleries.all.appendChild(element.cloneNode(true));
                addEventListenersToArtwork(galleries.all.lastElementChild);
            }
            
            // 해당 카테고리 갤러리에 추가
            if (galleries[artwork.category]) {
                galleries[artwork.category].appendChild(element.cloneNode(true));
                addEventListenersToArtwork(galleries[artwork.category].lastElementChild);
            }
        }, index * 50);
    });
}

function createArtworkElement(artworkData) {
    const imageUrls = artworkData.imageUrls || [artworkData.imageUrl];
    if (!imageUrls || imageUrls.length === 0) return null;

    const newItem = document.createElement('div');
    newItem.className = 'gallery-item';
    Object.assign(newItem.dataset, {
        category: artworkData.category || 'drawing',
        artworkId: artworkData.id,
        imageUrls: JSON.stringify(imageUrls),
        link: artworkData.link || ''
    });

    const uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
    const imageCountBadge = imageUrls.length > 1 ? `<span class="image-count-badge">${imageUrls.length}</span>` : '';

    newItem.innerHTML = `
        <div class="image-container">
            <img src="${imageUrls[0]}" alt="${artworkData.title}" loading="lazy">
            ${imageCountBadge}
            <div class="image-overlay"><button class="view-btn">자세히 보기</button></div>
        </div>
        <div class="item-info">
            <h3 class="item-title">${artworkData.title}</h3>
            <span class="item-grade">${artworkData.grade || '정보 없음'}</span>
            <p class="item-description">${artworkData.description || '작가의 창의적인 작품입니다.'}</p>
            <small class="upload-date">📅 ${uploadDate}</small>
        </div>
        <div class="item-admin-actions admin-only">
            <button class="admin-btn edit" data-id="${artworkData.id}">수정</button>
            <button class="admin-btn delete" data-id="${artworkData.id}">삭제</button>
        </div>
    `;
    
    // 애니메이션 효과
    setTimeout(() => {
        newItem.classList.add('show');
    }, 100);
    
    return newItem;
}

function addEventListenersToArtwork(element) {
    if (!element) return;
    
    const imageContainer = element.querySelector('.image-container');
    const itemInfo = element.querySelector('.item-info');
    
    if (imageContainer) {
        imageContainer.addEventListener('click', () => showArtworkDetailModal(element));
    }
    if (itemInfo) {
        itemInfo.addEventListener('click', () => showArtworkDetailModal(element));
    }

    const deleteBtn = element.querySelector('.admin-btn.delete');
    const editBtn = element.querySelector('.admin-btn.edit');
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteArtwork(e.target.dataset.id);
        });
    }
    
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            alert('수정 기능은 현재 준비 중입니다.');
        });
    }
}

// 모달 관련 함수
function showArtworkDetailModal(item) {
    if (!item) return;
    
    currentArtworkIdForModal = item.dataset.artworkId;
    
    const title = item.querySelector('.item-title')?.textContent || '';
    const grade = item.querySelector('.item-grade')?.textContent || '';
    const description = item.querySelector('.item-description')?.textContent || '';
    const { category, imageUrls: imageUrlsString, link: artworkLink } = item.dataset;
    
    currentDetailImageUrls = JSON.parse(imageUrlsString || '[]');
    currentDetailImageIndex = 0;

    const categoryMap = { 
        'drawing': '그림', 
        'craft': '공예', 
        'sculpture': '조소', 
        'digital': '디지털아트' 
    };
    
    // 모달 내용 업데이트
    document.getElementById('detailArtworkTitle').textContent = title;
    document.getElementById('detailGrade').textContent = grade;
    document.getElementById('detailCategory').textContent = categoryMap[category] || category;
    document.getElementById('detailUploadDate').textContent = item.querySelector('.upload-date')?.textContent.replace('📅 ', '') || '정보 없음';
    document.getElementById('detailDescriptionText').textContent = description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery();

    const linkSection = document.getElementById('detailLinkSection');
    if (linkSection) {
        linkSection.style.display = artworkLink ? 'block' : 'none';
        if (artworkLink) {
            const linkElement = document.getElementById('detailLink');
            if (linkElement) linkElement.href = artworkLink;
        }
    }
    
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function updateDetailImageGallery() {
    const mainImg = document.getElementById('currentMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    if (!mainImg || !thumbnailsContainer) return;
    
    if (currentDetailImageUrls.length > 0) {
        mainImg.src = currentDetailImageUrls[currentDetailImageIndex];
        currentDetailImageUrl = mainImg.src;
        
        // 썸네일 생성
        thumbnailsContainer.innerHTML = '';
        if (currentDetailImageUrls.length > 1) {
            currentDetailImageUrls.forEach((url, index) => {
                const thumb = document.createElement('img');
                thumb.src = url;
                thumb.className = 'modal-thumbnail-img';
                if (index === currentDetailImageIndex) {
                    thumb.classList.add('active');
                }
                thumb.onclick = () => {
                    currentDetailImageIndex = index;
                    updateDetailImageGallery();
                };
                thumbnailsContainer.appendChild(thumb);
            });
        }
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentArtworkIdForModal = null;
}

function openImageInNewTab() {
    if (currentDetailImageUrl) {
        window.open(currentDetailImageUrl, '_blank');
    }
}

// 작품 삭제 함수
async function deleteArtwork(artworkId) {
    if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }

    console.log(`🗑️ 작품 삭제 시도: ${artworkId}`);
    try {
        // 로컬 데이터에서 제거
        allArtworks = allArtworks.filter(art => art.id !== artworkId);
        
        // 서버에 업데이트
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));

        // UI에서 제거
        const elementsToRemove = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        elementsToRemove.forEach(element => {
            element.style.transition = 'all 0.5s ease';
            element.style.transform = 'scale(0)';
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
                updateGalleryState();
            }, 500);
        });
        
        alert('작품이 성공적으로 삭제되었습니다.');
        closeModal();
        updateGalleryState();

    } catch (error) {
        console.error('❌ 작품 삭제 중 오류 발생:', error);
        alert('작품 삭제에 실패했습니다. 다시 시도해주세요.');
    }
}

// 폼 이벤트 초기화
function initFormEvents() {
    const form = document.getElementById('artworkForm');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    // 입력 필드 유효성 검사
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
        const formData = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: document.getElementById('artworkTitle').value.trim(),
            grade: `${document.getElementById('studentGrade').value}학년 ${document.getElementById('studentClass').value}반`,
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink').value.trim(),
            imageUrls: uploadedImages,
            uploadDate: new Date().toISOString(),
            author: '익명' // 필요시 추가 필드
        };
        
        // 로컬 데이터에 추가
        allArtworks.unshift(formData);
        
        // 서버에 저장
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
        
        // UI 업데이트
        renderArtworks();
        applyFilters();
        
        // 폼 초기화
        resetForm();
        toggleUploadPanel();
        
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
        
    } catch (error) {
        console.error('❌ 작품 등록 중 오류:', error);
        alert(`작품 등록 중 오류: ${error.message}`);
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim();
    const grade = document.getElementById('studentGrade')?.value;
    const studentClass = document.getElementById('studentClass')?.value;
    const category = document.getElementById('artworkCategory')?.value;
    
    const isValid = title && grade && studentClass && category && uploadedImages.length > 0 && isConnected && !isUploading;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
    
    return isValid;
}

function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    updateImagePreview();
}

// 이미지 업로드 관련 함수
function previewImages() {
    const fileInput = document.getElementById('imageFile');
    if (!fileInput || !fileInput.files) return;
    
    Array.from(fileInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages.push(e.target.result);
            updateImagePreview();
            validateForm();
        };
        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const uploadText = document.getElementById('uploadText');
    
    if (!container) return;
    
    container.innerHTML = uploadedImages.map((url, index) =>
        `<div class="preview-item">
            <img src="${url}" alt="미리보기 ${index + 1}">
            <button type="button" class="preview-remove" onclick="removeImage(${index})">&times;</button>
        </div>`
    ).join('');
    
    if (uploadText) {
        uploadText.style.display = uploadedImages.length > 0 ? 'none' : 'block';
    }
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    validateForm();
}

// 상태 업데이트 함수
function updateConnectionStatus(status, message) {
    const statusSection = document.getElementById('statusSection');
    if (statusSection) {
        statusSection.style.display = 'block';
    }
    
    const statusText = document.getElementById('upstashStatus');
    if (statusText) {
        statusText.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    isConnected = status === 'connected';
}

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// 관리자 데이터 로드
function loadAdminData() {
    // 통계 업데이트
    document.getElementById('statArtworks').textContent = allArtworks.length;
    document.getElementById('statComments').textContent = '0'; // 댓글 기능 구현시 업데이트
    document.getElementById('statLikes').textContent = '0'; // 좋아요 기능 구현시 업데이트
    
    const today = new Date().toDateString();
    const todayArtworks = allArtworks.filter(art => 
        new Date(art.uploadDate).toDateString() === today
    );
    document.getElementById('statToday').textContent = todayArtworks.length;
}

// 관리자 탭 전환
function switchAdminTab(tab) {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchAdminTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Content`).classList.add('active');
    
    if (tab === 'artworks') {
        loadArtworksTable();
    }
}

function loadArtworksTable() {
    const tbody = document.getElementById('artworksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = allArtworks.map(artwork => `
        <tr>
            <td><input type="checkbox" value="${artwork.id}"></td>
            <td>${artwork.title}</td>
            <td>${artwork.grade}</td>
            <td>${artwork.category}</td>
            <td>${new Date(artwork.uploadDate).toLocaleDateString()}</td>
            <td>
                <button class="admin-btn edit" onclick="editArtwork('${artwork.id}')">수정</button>
                <button class="admin-btn delete" onclick="deleteArtwork('${artwork.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
}

function editArtwork(id) {
    alert('수정 기능은 현재 준비 중입니다.');
}

function saveSettings() {
    alert('설정이 저장되었습니다.');
}

// 전역 함수로 노출 (HTML에서 호출용)
window.toggleUploadPanel = toggleUploadPanel;
window.toggleAdminPanel = toggleAdminPanel;
window.switchTypeTab = switchTypeTab;
window.switchAdminTab = switchAdminTab;
window.closeModal = closeModal;
window.openImageInNewTab = openImageInNewTab;
window.deleteArtwork = deleteArtwork;
window.editArtwork = editArtwork;
window.saveSettings = saveSettings;
window.previewImages = previewImages;
window.removeImage = removeImage;
