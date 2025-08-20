// 학생 작품 갤러리 JavaScript - 사용자 친화적 버전

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
