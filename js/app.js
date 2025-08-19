// 학생 작품 갤러리 JavaScript - 관리자 모드 추가 버전

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

// [중요] 관리자 비밀번호 (실제 운영 시에는 더 복잡한 비밀번호로 변경하세요)
const ADMIN_PASSWORD = "admin1234"; 

// 전역 변수
let currentDetailImageUrl = '';
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;
let isConnected = false;
let isUploading = false;
let isAdmin = false; // 관리자 모드 상태
let currentArtworkIdForModal = null; // 상세보기 모달에서 사용할 작품 ID

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    
    checkConnectionAndLoadArtworks();
    
    initFilterButtons();
    initSmoothScroll();
    initArtworkForm();
    initDetailModalButtons();
    initAdminFeatures(); // 관리자 기능 초기화
    
    console.log('✅ 모든 기능이 준비되었습니다!');
});

// ========================================================
// 관리자 기능
// ========================================================
function initAdminFeatures() {
    // URL을 확인하여 관리자 모드 활성화 시도
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('admin')) {
        promptForAdminLogin();
    }

    // 푸터의 Admin Mode 링크에 이벤트 연결
    document.getElementById('adminLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        promptForAdminLogin();
    });

    // 세션 스토리지에 저장된 관리자 상태 확인
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
    } else if (password) {
        alert('❌ 비밀번호가 틀렸습니다.');
    }
}

function enableAdminUI() {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    console.log('🔧 관리자 UI가 활성화되었습니다.');
}

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
        // 1. Upstash에서 모든 작품 데이터 가져오기
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (!artworksData) throw new Error('작품 데이터를 불러올 수 없습니다.');
        
        let artworks = typeof artworksData === 'string' ? JSON.parse(artworksData) : artworksData;

        // 2. 해당 ID를 가진 작품을 제외한 새 배열 생성
        const updatedArtworks = artworks.filter(art => art.id !== artworkId);

        if (artworks.length === updatedArtworks.length) {
            console.warn('삭제할 작품을 찾지 못했습니다.');
            return;
        }

        // 3. 변경된 작품 목록을 Upstash에 다시 저장
        await callUpstashAPI('SET', REDIS_KEY, updatedArtworks);

        // 4. 화면에서 해당 작품 요소 제거
        const elementToRemove = document.querySelector(`[data-artwork-id="${artworkId}"]`);
        if (elementToRemove) {
            elementToRemove.style.transition = 'all 0.5s ease';
            elementToRemove.style.transform = 'scale(0)';
            elementToRemove.style.opacity = '0';
            setTimeout(() => {
                elementToRemove.remove();
                checkEmptyGallery();
            }, 500);
        }
        
        alert('작품이 성공적으로 삭제되었습니다.');
        closeDetailModal(); // 상세보기 모달이 열려있다면 닫기

    } catch (error) {
        console.error('❌ 작품 삭제 중 오류 발생:', error);
        alert('작품 삭제에 실패했습니다. 다시 시도해주세요.');
    }
}


// ========================================================
// 기존 기능 (일부 수정됨)
// ========================================================

// 작품 요소 생성 (DOM에 추가) - 관리자 버튼 추가
function createArtworkElement(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid || document.querySelector(`[data-artwork-id="${artworkData.id}"]`)) return;

    const imageUrls = artworkData.imageUrls || [artworkData.imageUrl];
    if (!imageUrls || imageUrls.length === 0) return;

    const newItem = document.createElement('div');
    newItem.className = 'gallery-item';
    newItem.dataset.category = artworkData.category || 'drawing';
    newItem.dataset.artworkId = artworkData.id;
    newItem.dataset.imageUrls = JSON.stringify(imageUrls);
    newItem.dataset.link = artworkData.link || '';

    const uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
    const mainImageUrl = imageUrls[0];
    const imageCountBadge = imageUrls.length > 1 ? `<span class="image-count-badge">${imageUrls.length}</span>` : '';

    newItem.innerHTML = `
        <div class="image-container">
            <img src="${mainImageUrl}" alt="${artworkData.title}" loading="lazy">
            ${imageCountBadge}
            <div class="image-overlay">
                <button class="view-btn">자세히 보기</button>
            </div>
        </div>
        <div class="item-info">
            <h3 class="item-title">${artworkData.title}</h3>
            <span class="item-grade">${artworkData.grade || '정보 없음'}</span>
            <p class="item-description">${artworkData.description || '작가의 창의적인 작품입니다.'}</p>
            <small class="upload-date">📅 ${uploadDate}</small>
        </div>
        <div class="item-admin-actions admin-only">
            <button class="admin-btn edit" data-id="${artworkData.id}">✏️ 수정</button>
            <button class="admin-btn delete" data-id="${artworkData.id}">🗑️ 삭제</button>
        </div>
    `;
    
    galleryGrid.appendChild(newItem);
    
    newItem.style.opacity = '0';
    setTimeout(() => { newItem.style.transition = 'all 0.6s ease'; newItem.style.opacity = '1'; }, 100);
    
    addEventListenersToArtwork(newItem);
    return newItem;
}

// 개별 작품에 이벤트 리스너 추가 - 관리자 버튼 이벤트 추가
function addEventListenersToArtwork(artworkElement) {
    artworkElement.querySelector('.image-container').addEventListener('click', () => showArtworkDetailModal(artworkElement));
    artworkElement.querySelector('.item-info').addEventListener('click', () => showArtworkDetailModal(artworkElement));

    const deleteBtn = artworkElement.querySelector('.admin-btn.delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteArtwork(e.target.dataset.id);
        });
    }

    const editBtn = artworkElement.querySelector('.admin-btn.edit');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            alert('수정 기능은 현재 준비 중입니다.');
        });
    }
}

// 작품 상세보기 모달 표시 - 현재 작품 ID 저장
function showArtworkDetailModal(item) {
    currentArtworkIdForModal = item.dataset.artworkId;
    const { title, grade, description } = {
        title: item.querySelector('.item-title').textContent,
        grade: item.querySelector('.item-grade').textContent,
        description: item.querySelector('.item-description').textContent
    };
    const { category, imageUrls: imageUrlsString, link: artworkLink } = item.dataset;
    const uploadDate = item.querySelector('.upload-date')?.textContent.replace('📅 ', '') || '정보 없음';
    
    currentDetailImageUrls = JSON.parse(imageUrlsString || '[]');
    currentDetailImageIndex = 0;

    const categoryMap = { 'drawing': '그림', 'craft': '공예', 'sculpture': '조소', 'digital': '디지털아트' };

    document.getElementById('detailArtworkTitle').textContent = title;
    document.getElementById('detailGrade').textContent = grade;
    document.getElementById('detailCategory').textContent = categoryMap[category] || category;
    document.getElementById('detailUploadDate').textContent = uploadDate;
    document.getElementById('detailDescriptionText').textContent = description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery(currentDetailImageUrls);
    updateDetailSliderView();

    const linkSection = document.getElementById('detailLinkSection');
    if (artworkLink) {
        document.getElementById('detailLink').href = artworkLink;
        linkSection.style.display = 'block';
    } else {
        linkSection.style.display = 'none';
    }
    
    document.getElementById('artworkDetailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 상세보기 모달 버튼 이벤트 리스너 초기화 - 삭제/수정 버튼 추가
function initDetailModalButtons() {
    document.getElementById('next-image-btn').addEventListener('click', showNextImage);
    document.getElementById('prev-image-btn').addEventListener('click', showPrevImage);

    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        if (currentArtworkIdForModal) deleteArtwork(currentArtworkIdForModal);
    });

    document.getElementById('detailEditBtn').addEventListener('click', () => {
        alert('수정 기능은 현재 준비 중입니다.');
    });
}

// --- 이하 헬퍼 함수 및 기존 로직 ---

async function callUpstashAPI(command, key, value = null) {
    try {
        let url = `${UPSTASH_CONFIG.url}/${command}`;
        if (command !== 'ping') url += `/${encodeURIComponent(key)}`;

        const options = {
            method: command === 'get' || command === 'ping' ? 'GET' : 'POST',
            headers: { 'Authorization': `Bearer ${UPSTASH_CONFIG.token}` }
        };
        if (value !== null && command === 'set') options.body = JSON.stringify(value);
        
        const response = await fetch(url.toLowerCase(), options);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
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
        updateConnectionStatus('disconnected', `연결 실패`);
    }
}

async function loadArtworksFromUpstash() {
    showLoading();
    try {
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (artworksData) {
            const artworks = JSON.parse(artworksData);
            artworks.forEach((artwork, i) => setTimeout(() => createArtworkElement(artwork), i * 50));
            setTimeout(() => {
                checkEmptyGallery();
                hideLoading();
                updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
            }, artworks.length * 50 + 300);
        } else {
            hideLoading();
            checkEmptyGallery();
            updateConnectionStatus('connected', '온라인 - 새 갤러리');
        }
    } catch (error) {
        hideLoading();
        checkEmptyGallery();
        updateConnectionStatus('disconnected', '작품 로드 실패');
    }
}

async function saveArtworkToUpstash(newArtwork) {
    updateConnectionStatus('connecting', '작품 저장 중...');
    try {
        const data = await callUpstashAPI('GET', REDIS_KEY);
        const artworks = data ? JSON.parse(data) : [];
        artworks.unshift(newArtwork);
        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(artworks));
        updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
    } catch (error) {
        updateConnectionStatus('disconnected', '저장 실패');
        throw error;
    }
}

function checkEmptyGallery() {
    const hasChildren = document.getElementById('galleryGrid').children.length > 0;
    document.getElementById('emptyGallery').style.display = hasChildren ? 'none' : 'block';
    document.querySelector('.filter-buttons').style.display = hasChildren ? 'flex' : 'none';
}

function initFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterGalleryItems(button.dataset.filter);
        });
    });
}

function filterGalleryItems(filter) {
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.style.display = (filter === 'all' || item.dataset.category === filter) ? 'block' : 'none';
    });
}

function closeDetailModal() {
    document.getElementById('artworkDetailModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentArtworkIdForModal = null;
}

function updateDetailImageGallery(imageUrls) {
    const container = document.querySelector('.thumbnail-container');
    container.innerHTML = '';
    if (imageUrls.length > 1) {
        imageUrls.forEach((url, i) => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.className = 'thumbnail';
            thumb.onclick = () => { currentDetailImageIndex = i; updateDetailSliderView(); };
            container.appendChild(thumb);
        });
    }
}

function updateDetailSliderView() {
    const mainImg = document.getElementById('currentMainImage');
    if (!mainImg || currentDetailImageUrls.length === 0) return;
    mainImg.src = currentDetailImageUrls[currentDetailImageIndex];
    currentDetailImageUrl = mainImg.src;
    document.querySelectorAll('.thumbnail').forEach((t, i) => t.classList.toggle('active', i === currentDetailImageIndex));
    const show = currentDetailImageUrls.length > 1;
    document.getElementById('prev-image-btn').style.display = document.getElementById('next-image-btn').style.display = show ? 'block' : 'none';
}

function showNextImage() {
    if (currentDetailImageUrls.length < 2) return;
    currentDetailImageIndex = (currentDetailImageIndex + 1) % currentDetailImageUrls.length;
    updateDetailSliderView();
}

function showPrevImage() {
    if (currentDetailImageUrls.length < 2) return;
    currentDetailImageIndex = (currentDetailImageIndex - 1 + currentDetailImageUrls.length) % currentDetailImageUrls.length;
    updateDetailSliderView();
}

function openImageInNewTab() { if (currentDetailImageUrl) window.open(currentDetailImageUrl, '_blank'); }

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
    }));
}

function showLoading() { document.getElementById('loading').style.display = 'block'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function openUploadModal() {
    if (!isConnected) return alert('⚠️ 서버에 연결되지 않았습니다.');
    document.getElementById('uploadModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    resetUploadForm();
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function resetUploadForm() {
    document.getElementById('artworkForm').reset();
    uploadedImages = [];
    updateImagePreview();
    document.querySelector('.submit-btn').disabled = true;
    isUploading = false;
}

let uploadedImages = [];
document.getElementById('imageUploadArea').addEventListener('click', () => {
    if (typeof cloudinary === 'undefined') return;
    cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName, uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        multiple: true, maxFiles: 10, folder: 'student-gallery',
    }, (err, res) => {
        if (!err && res && res.event === 'success') {
            uploadedImages.push(res.info.secure_url);
            updateImagePreview();
            validateForm();
        }
    }).open();
});

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = uploadedImages.map((url, i) =>
        `<div class="preview-item"><img src="${url}" alt="미리보기 ${i + 1}"><button type="button" class="preview-remove" onclick="removeImage(${i})">&times;</button></div>`
    ).join('');
    document.querySelector('.upload-placeholder').style.display = uploadedImages.length > 0 ? 'none' : 'block';
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    validateForm();
}

function validateForm() {
    const { title, grade, studentClass, category } = {
        title: document.getElementById('artworkTitle').value.trim(),
        grade: document.getElementById('studentGrade').value,
        studentClass: document.getElementById('studentClass').value,
        category: document.getElementById('artworkCategory').value
    };
    const isValid = title && grade && studentClass && category && uploadedImages.length > 0 && isConnected && !isUploading;
    document.querySelector('.submit-btn').disabled = !isValid;
    return isValid;
}

function initArtworkForm() {
    const form = document.getElementById('artworkForm');
    form.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('input', validateForm));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        isUploading = true;
        document.querySelector('.submit-btn .btn-text').style.display = 'none';
        document.querySelector('.submit-btn .btn-loading').style.display = 'flex';
        try {
            const formData = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: document.getElementById('artworkTitle').value.trim(),
                grade: `${document.getElementById('studentGrade').value}학년 ${document.getElementById('studentClass').value}반`,
                category: document.getElementById('artworkCategory').value,
                description: document.getElementById('artworkDescription').value.trim(),
                link: document.getElementById('artworkLink').value.trim(),
                imageUrls: uploadedImages,
                uploadDate: new Date().toISOString()
            };
            await saveArtworkToUpstash(formData);
            const newEl = createArtworkElement(formData);
            document.getElementById('galleryGrid').prepend(newEl);
            closeUploadModal();
            alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
            checkEmptyGallery();
        } catch (error) {
            alert(`작품 등록 중 오류: ${error.message}`);
        } finally {
            isUploading = false;
            document.querySelector('.submit-btn .btn-text').style.display = 'inline';
            document.querySelector('.submit-btn .btn-loading').style.display = 'none';
        }
    });
}

function updateConnectionStatus(status, message) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    if (!indicator || !text) return;
    indicator.className = `status-indicator ${status}`;
    text.textContent = message;
    isConnected = status === 'connected';
}
