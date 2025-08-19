// 학생 작품 갤러리 JavaScript - 다중 이미지 슬라이더 기능 추가 버전

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

// 현재 상세보기 중인 이미지 URL (새 탭에서 열기용)
let currentDetailImageUrl = '';

// 이미지 슬라이더를 위한 전역 변수
let currentDetailImageUrls = [];
let currentDetailImageIndex = 0;

// 연결 상태
let isConnected = false;

// 업로드 중인 상태 (중복 업로드 방지)
let isUploading = false;

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    
    // 연결 상태 확인 및 작품 불러오기
    checkConnectionAndLoadArtworks();
    
    // 초기화 함수들 실행
    initFilterButtons();
    initSmoothScroll();
    initArtworkForm();
    initDetailModalButtons(); // 슬라이더 버튼 이벤트 리스너 초기화
    
    console.log('✅ 모든 기능이 준비되었습니다!');
    console.log('📸 Cloudinary 업로드 기능이 준비되었습니다!');
    console.log('☁️ Upstash Redis 연결을 확인 중...');
});

// 연결 상태 업데이트
function updateConnectionStatus(status, message) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (indicator && text) {
        indicator.className = `status-indicator ${status}`;
        text.textContent = message;
        
        switch (status) {
            case 'connected':
                indicator.style.color = '#20B832';
                isConnected = true;
                break;
            case 'disconnected':
                indicator.style.color = '#F44235';
                isConnected = false;
                break;
            case 'connecting':
                indicator.style.color = '#0078FF';
                isConnected = false;
                break;
        }
    }
}

// Upstash Redis API 호출
async function callUpstashAPI(command, key, value = null) {
    try {
        let url = UPSTASH_CONFIG.url;
        
        if (command === 'GET') {
            url += `/get/${encodeURIComponent(key)}`;
        } else if (command === 'SET') {
            url += `/set/${encodeURIComponent(key)}`;
        } else if (command === 'PING') {
            url += `/ping`;
        }
        
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_CONFIG.token}`,
                'Content-Type': 'application/json',
            }
        };
        
        if (value !== null && command === 'SET') {
            options.body = JSON.stringify(value);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('❌ Upstash API 호출 오류:', error);
        throw error;
    }
}

// 연결 확인 및 작품 불러오기
async function checkConnectionAndLoadArtworks() {
    updateConnectionStatus('connecting', '서버 연결 중...');
    
    try {
        await callUpstashAPI('PING');
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        await loadArtworksFromUpstash();
    } catch (error) {
        console.error('❌ 연결 오류:', error);
        updateConnectionStatus('disconnected', `연결 실패: ${error.message}`);
    }
}

// Upstash에서 작품 불러오기
async function loadArtworksFromUpstash() {
    try {
        showLoading();
        updateConnectionStatus('connecting', '작품 불러오는 중...');
        
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        
        if (artworksData) {
            const artworks = typeof artworksData === 'string' ? JSON.parse(artworksData) : artworksData;
            console.log(`☁️ Upstash에서 ${artworks.length}개 작품을 불러왔습니다.`);
            
            artworks.forEach((artwork, index) => {
                setTimeout(() => createArtworkElement(artwork), index * 50);
            });
            
            setTimeout(() => {
                updateStats();
                checkEmptyGallery();
                hideLoading();
                updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
            }, artworks.length * 50 + 300);
        } else {
            console.log('☁️ Upstash에 저장된 작품이 없습니다.');
            hideLoading();
            checkEmptyGallery();
            updateConnectionStatus('connected', '온라인 - 새 갤러리');
        }
    } catch (error) {
        console.error('❌ 작품 불러오기 오류:', error);
        hideLoading();
        checkEmptyGallery();
        updateConnectionStatus('disconnected', '작품 로드 실패');
    }
}

// 작품 저장
async function saveArtworkToUpstash(newArtwork) {
    try {
        updateConnectionStatus('connecting', '작품 저장 중...');
        
        let artworks = [];
        const existingData = await callUpstashAPI('GET', REDIS_KEY);
        if (existingData) {
            artworks = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
        }
        
        artworks.unshift(newArtwork); // 새 작품을 맨 앞에 추가
        
        await callUpstashAPI('SET', REDIS_KEY, artworks);
        
        updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
        console.log('✅ 작품이 Upstash에 성공적으로 저장되었습니다:', newArtwork.title);
        return true;
    } catch (error) {
        console.error('❌ 작품 저장 오류:', error);
        updateConnectionStatus('disconnected', '저장 실패');
        throw error;
    }
}

// 작품 요소 생성 (DOM에 추가)
function createArtworkElement(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;
    if (document.querySelector(`[data-artwork-id="${artworkData.id}"]`)) return; // 중복 방지

    const imageUrls = artworkData.imageUrls || [artworkData.imageUrl];
    if (!imageUrls || imageUrls.length === 0) return; // 이미지 없으면 생성 안함

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
    `;
    
    galleryGrid.appendChild(newItem);
    
    // 애니메이션
    newItem.style.opacity = '0';
    newItem.style.transform = 'translateY(30px)';
    setTimeout(() => {
        newItem.style.transition = 'all 0.6s ease';
        newItem.style.opacity = '1';
        newItem.style.transform = 'translateY(0)';
    }, 100);
    
    addEventListenersToArtwork(newItem);
    return newItem; // 새로 생성된 요소를 반환
}

// 개별 작품에 이벤트 리스너 추가
function addEventListenersToArtwork(artworkElement) {
    artworkElement.addEventListener('click', () => showArtworkDetailModal(artworkElement));
}

// 빈 갤러리 체크
function checkEmptyGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    const emptyGallery = document.getElementById('emptyGallery');
    const filterButtons = document.querySelector('.filter-buttons');
    
    if (galleryGrid.children.length === 0) {
        emptyGallery.style.display = 'block';
        filterButtons.style.display = 'none';
    } else {
        emptyGallery.style.display = 'none';
        filterButtons.style.display = 'flex';
    }
}

// 통계 업데이트
function updateStats() {
    // 이 함수는 현재 HTML 구조에 통계 표시 영역이 없으므로 비워둡니다.
    // 필요시 #artworkCount, #artistCount 등을 HTML에 추가하고 로직을 구현할 수 있습니다.
}

// 필터 버튼 기능
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            showLoading();
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filter = button.dataset.filter;
            setTimeout(() => {
                filterGalleryItems(filter);
                hideLoading();
            }, 300);
        });
    });
}

// 갤러리 아이템 필터링
function filterGalleryItems(filter) {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        const category = item.dataset.category;
        const shouldShow = filter === 'all' || category === filter;
        item.style.display = shouldShow ? 'block' : 'none';
    });
}

// 작품 상세보기 모달 표시
function showArtworkDetailModal(item) {
    const title = item.querySelector('.item-title').textContent;
    const grade = item.querySelector('.item-grade').textContent;
    const description = item.querySelector('.item-description').textContent;
    const category = item.dataset.category;
    const uploadDate = item.querySelector('.upload-date')?.textContent.replace('📅 ', '') || '정보 없음';
    const imageUrlsString = item.dataset.imageUrls;
    const artworkLink = item.dataset.link;

    currentDetailImageUrls = JSON.parse(imageUrlsString || '[]');
    currentDetailImageIndex = 0;

    const categoryMap = { 'drawing': '그림', 'craft': '공예', 'sculpture': '조소', 'digital': '디지털아트' };

    document.getElementById('detailArtworkTitle').textContent = title;
    document.getElementById('detailGrade').textContent = grade;
    document.getElementById('detailCategory').textContent = categoryMap[category] || category;
    document.getElementById('detailUploadDate').textContent = uploadDate;
    document.getElementById('detailDescriptionText').textContent = description || '작품에 대한 설명이 없습니다.';
    
    updateDetailImageGallery(currentDetailImageUrls); // 썸네일 생성
    updateDetailSliderView(); // 메인 이미지 및 화살표 업데이트

    const linkSection = document.getElementById('detailLinkSection');
    const linkElement = document.getElementById('detailLink');
    if (artworkLink) {
        linkElement.href = artworkLink;
        linkSection.style.display = 'block';
    } else {
        linkSection.style.display = 'none';
    }
    
    document.getElementById('artworkDetailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 상세보기 모달 닫기
function closeDetailModal() {
    document.getElementById('artworkDetailModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentDetailImageUrl = '';
}

// 상세보기 이미지 갤러리 및 썸네일 업데이트
function updateDetailImageGallery(imageUrls) {
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    thumbnailContainer.innerHTML = '';
    
    if (imageUrls.length > 1) {
        imageUrls.forEach((url, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = url;
            thumbnail.alt = `이미지 ${index + 1}`;
            thumbnail.className = 'thumbnail';
            thumbnail.onclick = () => {
                currentDetailImageIndex = index;
                updateDetailSliderView();
            };
            thumbnailContainer.appendChild(thumbnail);
        });
    }
}

// 상세보기 슬라이더 뷰 업데이트 (메인 이미지, 화살표, 활성 썸네일)
function updateDetailSliderView() {
    const mainImage = document.getElementById('currentMainImage');
    const prevBtn = document.getElementById('prev-image-btn');
    const nextBtn = document.getElementById('next-image-btn');

    if (!mainImage || currentDetailImageUrls.length === 0) return;

    mainImage.src = currentDetailImageUrls[currentDetailImageIndex];
    currentDetailImageUrl = mainImage.src; // 새 탭에서 열기용 URL 업데이트

    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentDetailImageIndex);
    });

    const showArrows = currentDetailImageUrls.length > 1;
    prevBtn.style.display = showArrows ? 'block' : 'none';
    nextBtn.style.display = showArrows ? 'block' : 'none';
}

// 이전/다음 이미지 보기
function showNextImage() {
    if (currentDetailImageUrls.length === 0) return;
    currentDetailImageIndex = (currentDetailImageIndex + 1) % currentDetailImageUrls.length;
    updateDetailSliderView();
}

function showPrevImage() {
    if (currentDetailImageUrls.length === 0) return;
    currentDetailImageIndex = (currentDetailImageIndex - 1 + currentDetailImageUrls.length) % currentDetailImageUrls.length;
    updateDetailSliderView();
}

// 상세보기 모달 버튼 이벤트 리스너 초기화
function initDetailModalButtons() {
    document.getElementById('next-image-btn').addEventListener('click', showNextImage);
    document.getElementById('prev-image-btn').addEventListener('click', showPrevImage);
}

// 원본 이미지 새 탭에서 열기
function openImageInNewTab() {
    if (currentDetailImageUrl) window.open(currentDetailImageUrl, '_blank');
}

// 부드러운 스크롤
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

// 로딩 애니메이션
function showLoading() { document.getElementById('loading').style.display = 'block'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// 업로드 모달 열기/닫기
function openUploadModal() {
    if (!isConnected) {
        alert('⚠️ 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    document.getElementById('uploadModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    resetUploadForm();
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 업로드 폼 초기화
function resetUploadForm() {
    document.getElementById('artworkForm').reset();
    uploadedImages = [];
    updateImagePreview();
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    isUploading = false;
}

// 버튼 로딩 상태
function setButtonLoading(isLoading) {
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoading.style.display = isLoading ? 'flex' : 'none';
}

// 여러 이미지 URL 저장 배열
let uploadedImages = [];

// Cloudinary 업로드 위젯 열기
document.getElementById('imageUploadArea').addEventListener('click', function() {
    if (typeof cloudinary === 'undefined') {
        alert('Cloudinary 라이브러리가 로드되지 않았습니다.');
        return;
    }
    cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 10,
        folder: 'student-gallery',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    }, (error, result) => {
        if (!error && result && result.event === 'success') {
            uploadedImages.push(result.info.secure_url);
            updateImagePreview();
            validateForm();
        }
    }).open();
});

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    uploadedImages.forEach((imageUrl, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${imageUrl}" alt="미리보기 ${index + 1}">
            <button type="button" class="preview-remove" onclick="removeImage(${index})">&times;</button>
        `;
        container.appendChild(previewItem);
    });
    document.querySelector('.upload-placeholder').style.display = uploadedImages.length > 0 ? 'none' : 'block';
}

// 미리보기 이미지 제거
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    validateForm();
}

// 폼 유효성 검사
function validateForm() {
    const title = document.getElementById('artworkTitle').value.trim();
    const grade = document.getElementById('studentGrade').value;
    const studentClass = document.getElementById('studentClass').value;
    const category = document.getElementById('artworkCategory').value;
    const isValid = title && grade && studentClass && category && uploadedImages.length > 0 && isConnected && !isUploading;
    document.querySelector('.submit-btn').disabled = !isValid;
    return isValid;
}

// 폼 제출 처리
function initArtworkForm() {
    const form = document.getElementById('artworkForm');
    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', validateForm);
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!validateForm()) {
            alert('모든 필수 항목을 입력하고 이미지를 업로드해주세요.');
            return;
        }

        isUploading = true;
        setButtonLoading(true);

        try {
            const formData = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                title: document.getElementById('artworkTitle').value.trim(),
                grade: document.getElementById('studentGrade').value + '학년 ' + document.getElementById('studentClass').value + '반',
                category: document.getElementById('artworkCategory').value,
                description: document.getElementById('artworkDescription').value.trim(),
                link: document.getElementById('artworkLink').value.trim(),
                imageUrls: uploadedImages, // 다중 이미지 배열 저장
                uploadDate: new Date().toISOString()
            };

            await saveArtworkToUpstash(formData);
            
            // 새 작품을 갤러리 맨 앞에 추가
            const galleryGrid = document.getElementById('galleryGrid');
            const newElement = createArtworkElement(formData); // createArtworkElement가 요소를 반환하도록 수정했음
            if (galleryGrid.firstChild) {
                galleryGrid.insertBefore(newElement, galleryGrid.firstChild);
            } else {
                galleryGrid.appendChild(newElement);
            }

            closeUploadModal();
            alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
            updateStats();
            checkEmptyGallery();
        } catch (error) {
            alert(`작품 등록 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            isUploading = false;
            setButtonLoading(false);
        }
    });
}
