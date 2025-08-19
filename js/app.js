// 학생 작품 갤러리 JavaScript - 관리자 모드 (상단 메뉴) 최종 버전

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
let isConnected = false;
let isAdmin = false; // 관리자 모드 상태
let currentArtworkIdForModal = null;
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;
let currentDetailImageUrl = '';
let isUploading = false;
let uploadedImages = [];

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    checkConnectionAndLoadArtworks();
    initEventListeners();
    initAdminFeatures(); // 관리자 기능 초기화
    console.log('✅ 모든 기능이 준비되었습니다!');
});

function initEventListeners() {
    initFilterButtons();
    initSmoothScroll();
    initArtworkForm();
    initDetailModalButtons();
}


// ========================================================
// 관리자 기능
// ========================================================
function initAdminFeatures() {
    const adminMenuLink = document.getElementById('adminMenuLink');
    
    adminMenuLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAdmin) {
            logoutAdmin();
        } else {
            promptForAdminLogin();
        }
    });

    // 페이지 로드 시 세션 스토리지 확인
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
    
    const adminMenuLink = document.getElementById('adminMenuLink');
    adminMenuLink.textContent = '로그아웃';
    adminMenuLink.classList.add('logout-link');

    console.log('🔧 관리자 UI가 활성화되었습니다.');
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminLoggedIn');
    isAdmin = false;
    document.body.classList.remove('admin-mode');

    const adminMenuLink = document.getElementById('adminMenuLink');
    adminMenuLink.textContent = '관리자';
    adminMenuLink.classList.remove('logout-link');

    alert('로그아웃되었습니다.');
    console.log('🔧 관리자 모드가 비활성화되었습니다.');
}

async function deleteArtwork(artworkId) {
    if (!isAdmin) return alert('관리자만 삭제할 수 있습니다.');
    if (!confirm('정말로 이 작품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    console.log(`🗑️ 작품 삭제 시도: ${artworkId}`);
    try {
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        if (!artworksData) throw new Error('작품 데이터를 불러올 수 없습니다.');
        
        const artworks = JSON.parse(artworksData);
        const updatedArtworks = artworks.filter(art => art.id !== artworkId);

        if (artworks.length === updatedArtworks.length) {
            return console.warn('삭제할 작품을 찾지 못했습니다.');
        }

        await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(updatedArtworks));

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
        closeDetailModal();

    } catch (error) {
        console.error('❌ 작품 삭제 중 오류 발생:', error);
        alert('작품 삭제에 실패했습니다. 다시 시도해주세요.');
    }
}


// ========================================================
// 작품 요소 생성 및 이벤트 리스너
// ========================================================
function createArtworkElement(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid || document.querySelector(`[data-artwork-id="${artworkData.id}"]`)) return;

    const imageUrls = artworkData.imageUrls || [artworkData.imageUrl];
    if (!imageUrls || imageUrls.length === 0) return;

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

function addEventListenersToArtwork(element) {
    element.querySelector('.image-container').addEventListener('click', () => showArtworkDetailModal(element));
    element.querySelector('.item-info').addEventListener('click', () => showArtworkDetailModal(element));

    element.querySelector('.admin-btn.delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteArtwork(e.target.dataset.id);
    });

    element.querySelector('.admin-btn.edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('수정 기능은 현재 준비 중입니다.');
    });
}


// ========================================================
// 모달 관련 함수
// ========================================================
function showArtworkDetailModal(item) {
    currentArtworkIdForModal = item.dataset.artworkId;
    
    const { title, grade, description } = {
        title: item.querySelector('.item-title').textContent,
        grade: item.querySelector('.item-grade').textContent,
        description: item.querySelector('.item-description').textContent
    };
    const { category, imageUrls: imageUrlsString, link: artworkLink } = item.dataset;
    
    currentDetailImageUrls = JSON.parse(imageUrlsString || '[]');
    currentDetailImageIndex = 0;

    const categoryMap = { 'drawing': '그림', 'craft': '공예', 'sculpture': '조소', 'digital': '디지털아트' };
    
    document.getElementById('detailArtworkTitle').textContent = title;
    document.getElementById('detailGrade').textContent = grade;
    document.getElementById('detailCategory').textContent = categoryMap[category] || category;
    document.getElementById('detailUploadDate').textContent = item.querySelector('.upload-date')?.textContent.replace('📅 ', '') || '정보 없음';
    document.getElementById('detailDescriptionText').textContent = description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery(currentDetailImageUrls);
    updateDetailSliderView();

    const linkSection = document.getElementById('detailLinkSection');
    linkSection.style.display = artworkLink ? 'block' : 'none';
    if(artworkLink) document.getElementById('detailLink').href = artworkLink;
    
    document.getElementById('artworkDetailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

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


// ========================================================
// API 및 데이터 처리
// ========================================================
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
            const artworks = JSON.parse(artworksData);
            artworks.forEach((artwork, i) => setTimeout(() => createArtworkElement(artwork), i * 20));
            setTimeout(() => {
                checkEmptyGallery();
                hideLoading();
                updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
            }, artworks.length * 20 + 300);
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


// ========================================================
// UI 헬퍼 및 폼 처리
// ========================================================
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
        item.style.display = (filter === 'all' || item.dataset.category === filter) ? 'flex' : 'none';
    });
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
    const submitBtn = form.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    form.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('input', validateForm));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        isUploading = true;
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';

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
            document.getElementById('galleryGrid').prepend(createArtworkElement(formData));
            closeUploadModal();
            alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
            checkEmptyGallery();
        } catch (error) {
            alert(`작품 등록 중 오류: ${error.message}`);
        } finally {
            isUploading = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
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
