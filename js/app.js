// 학생 작품 갤러리 JavaScript - 작동하는 안전한 버전

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
    initGalleryItems();
    initSmoothScroll();
    initCloudinaryUpload();
    initArtworkForm();
    
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

// 단순한 Upstash Redis API 호출 (기본 방식)
async function callUpstashAPI(command, key, value = null) {
    try {
        let url = UPSTASH_CONFIG.url;
        
        // 단순한 REST API 방식
        if (command === 'GET') {
            url += `/get/${encodeURIComponent(key)}`;
        } else if (command === 'SET') {
            url += `/set/${encodeURIComponent(key)}`;
        } else if (command === 'DEL') {
            url += `/del/${encodeURIComponent(key)}`;
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
        
        console.log('🔗 Upstash API 호출:', { command, key, url });
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Upstash API 응답:', data);
        
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
        console.log('🔄 Upstash 연결 테스트 중...');
        const pingResult = await callUpstashAPI('PING');
        console.log('✅ Upstash PING 결과:', pingResult);
        
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        
        // 작품 불러오기
        await loadArtworksFromUpstash();
        
    } catch (error) {
        console.error('❌ 연결 오류:', error);
        updateConnectionStatus('disconnected', `연결 실패: ${error.message}`);
        
        // 상세 에러 정보
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('인증 오류: Token 확인 필요');
        } else if (error.message.includes('404')) {
            console.error('URL 오류: Upstash URL 확인 필요');
        } else if (error.message.includes('CORS')) {
            console.error('CORS 오류: 브라우저 보안 정책');
        } else {
            console.error('기타 네트워크 오류:', error);
        }
    }
}

// Upstash에서 작품 불러오기
async function loadArtworksFromUpstash() {
    try {
        showLoading();
        updateConnectionStatus('connecting', '작품 불러오는 중...');
        
        console.log('📥 Upstash에서 작품 데이터 조회 중...');
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        
        console.log('📦 받은 데이터:', artworksData);
        
        if (artworksData && artworksData !== null) {
            let artworks;
            
            // 데이터 타입 확인 및 파싱
            if (typeof artworksData === 'string') {
                try {
                    artworks = JSON.parse(artworksData);
                } catch (parseError) {
                    console.error('JSON 파싱 오류:', parseError);
                    throw new Error('저장된 데이터 형식이 올바르지 않습니다.');
                }
            } else if (Array.isArray(artworksData)) {
                artworks = artworksData;
            } else {
                console.log('예상치 못한 데이터 형식:', typeof artworksData);
                artworks = [];
            }
            
            console.log(`☁️ Upstash에서 ${artworks.length}개 작품을 불러왔습니다.`);
            console.log('🎨 작품 목록:', artworks);
            
            // 작품들을 화면에 표시
            artworks.forEach((artwork, index) => {
                setTimeout(() => {
                    createArtworkElement(artwork);
                }, index * 100);
            });
            
            // 완료 후 상태 업데이트
            setTimeout(() => {
                updateStats();
                checkEmptyGallery();
                hideLoading();
                updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
            }, artworks.length * 100 + 500);
            
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

// 안전한 작품 저장 (타임스탬프 기반)
async function saveArtworkToUpstash(newArtwork) {
    try {
        updateConnectionStatus('connecting', '작품 저장 중...');
        
        console.log('💾 새 작품 저장 중:', newArtwork);
        
        // 재시도 로직 (최대 3번)
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                // 기존 작품들 가져오기
                let artworks = [];
                const existingData = await callUpstashAPI('GET', REDIS_KEY);
                
                if (existingData && existingData !== null) {
                    if (typeof existingData === 'string') {
                        artworks = JSON.parse(existingData);
                    } else if (Array.isArray(existingData)) {
                        artworks = existingData;
                    }
                }
                
                console.log('📋 기존 작품 수:', artworks.length);
                
                // 중복 확인 (ID 기반)
                const isDuplicate = artworks.some(artwork => artwork.id === newArtwork.id);
                if (isDuplicate) {
                    console.log('⚠️ 중복된 작품 ID, 저장 취소:', newArtwork.id);
                    return false;
                }
                
                // 새 작품을 맨 앞에 추가
                artworks.unshift(newArtwork);
                
                // 최대 1000개로 제한
                if (artworks.length > 1000) {
                    artworks = artworks.slice(0, 1000);
                }
                
                console.log('💾 총 작품 수 (저장 예정):', artworks.length);
                
                // Upstash에 저장
                await callUpstashAPI('SET', REDIS_KEY, artworks);
                
                updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
                console.log('✅ 작품이 Upstash에 성공적으로 저장되었습니다:', newArtwork.title);
                
                return true;
                
            } catch (retryError) {
                retryCount++;
                console.warn(`재시도 ${retryCount}/${maxRetries}:`, retryError);
                
                if (retryCount >= maxRetries) {
                    throw retryError;
                }
                
                // 재시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
    } catch (error) {
        console.error('❌ 작품 저장 오류:', error);
        updateConnectionStatus('disconnected', '저장 실패');
        throw error;
    }
}

// 작품 요소 생성 (DOM에 추가)
function createArtworkElement(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (!galleryGrid) {
        console.error('galleryGrid 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 중복 방지: 이미 존재하는 작품인지 확인
    const existingItem = document.querySelector(`[data-artwork-id="${artworkData.id}"]`);
    if (existingItem) {
        console.log('이미 존재하는 작품입니다:', artworkData.id);
        return;
    }
    
    // 필수 데이터 확인
    if (!artworkData.title || !artworkData.artist || !artworkData.imageUrl) {
        console.warn('작품 데이터가 불완전합니다:', artworkData);
        return;
    }
    
    // 새 갤러리 아이템 생성
    const newItem = document.createElement('div');
    newItem.className = 'gallery-item';
    newItem.setAttribute('data-category', artworkData.category || 'drawing');
    newItem.setAttribute('data-artwork-id', artworkData.id);
    
    // 업로드 날짜 포맷팅
    let uploadDate = '날짜 정보 없음';
    if (artworkData.uploadDate) {
        try {
            uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
        } catch (dateError) {
            console.warn('날짜 파싱 오류:', artworkData.uploadDate);
        }
    }
    
    newItem.innerHTML = `
        <div class="image-container">
            <img src="${artworkData.imageUrl}" alt="${artworkData.title}" loading="lazy">
            <div class="image-overlay">
                <button class="view-btn">자세히 보기</button>
            </div>
        </div>
        <div class="item-info">
            <h3 class="item-title">${artworkData.title}</h3>
            <p class="item-author">${artworkData.artist}</p>
            <span class="item-grade">${artworkData.grade || '학년 정보 없음'}</span>
            <p class="item-description">${artworkData.description || '작가의 창의적인 작품입니다.'}</p>
            <small class="upload-date">📅 ${uploadDate}</small>
        </div>
    `;
    
    // 갤러리에 추가
    galleryGrid.appendChild(newItem);
    
    // 애니메이션 효과
    newItem.style.opacity = '0';
    newItem.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        newItem.style.transition = 'all 0.6s ease';
        newItem.style.opacity = '1';
        newItem.style.transform = 'translateY(0)';
    }, 100);
    
    // 이벤트 리스너 추가
    addEventListenersToArtwork(newItem);
}

// 개별 작품에 이벤트 리스너 추가
function addEventListenersToArtwork(artworkElement) {
    // 작품 클릭 이벤트
    artworkElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            return;
        }
        showArtworkDetailModal(artworkElement);
    });
    
    // 자세히 보기 버튼 클릭
    const viewBtn = artworkElement.querySelector('.view-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showArtworkDetailModal(artworkElement);
        });
    }
    
    // 호버 효과
    artworkElement.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    artworkElement.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
}

// 빈 갤러리 체크
function checkEmptyGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    const emptyGallery = document.getElementById('emptyGallery');
    const filterButtons = document.querySelector('.filter-buttons');
    
    if (galleryGrid && emptyGallery && filterButtons) {
        if (galleryGrid.children.length === 0) {
            emptyGallery.style.display = 'block';
            filterButtons.style.display = 'none';
        } else {
            emptyGallery.style.display = 'none';
            filterButtons.style.display = 'flex';
        }
    }
}

// 통계 업데이트
function updateStats() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const artists = new Set();
    const categories = new Set();
    
    galleryItems.forEach(item => {
        const author = item.querySelector('.item-author')?.textContent;
        const category = item.getAttribute('data-category');
        
        if (author) artists.add(author);
        if (category) categories.add(category);
    });
    
    // 통계 업데이트
    const artworkCount = document.getElementById('artworkCount');
    const artistCount = document.getElementById('artistCount');
    const categoryCount = document.getElementById('categoryCount');
    
    if (artworkCount) artworkCount.textContent = galleryItems.length;
    if (artistCount) artistCount.textContent = artists.size;
    if (categoryCount) categoryCount.textContent = categories.size;
}

// 필터 버튼 기능
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const galleryItems = document.querySelectorAll('.gallery-item');
            
            // 로딩 표시
            showLoading();
            
            // 활성 버튼 변경
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.getAttribute('data-filter');
            
            // 잠깐 기다린 후 필터링 (로딩 효과)
            setTimeout(() => {
                filterGalleryItems(galleryItems, filter);
                hideLoading();
            }, 500);
        });
    });
}

// 갤러리 아이템 필터링
function filterGalleryItems(items, filter) {
    items.forEach((item, index) => {
        const category = item.getAttribute('data-category');
        
        if (filter === 'all' || category === filter) {
            // 보여주기
            item.style.display = 'block';
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            // 순차적으로 나타나는 애니메이션
            setTimeout(() => {
                item.style.transition = 'all 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        } else {
            // 숨기기
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                item.style.display = 'none';
            }, 300);
        }
    });
}

// 갤러리 아이템 클릭 이벤트 (기존 작품들에 대해)
function initGalleryItems() {
    const galleryItems = document.querySelectorAll('.gallery-item');

    galleryItems.forEach(item => {
        addEventListenersToArtwork(item);
    });
}

// 작품 상세보기 모달 표시
function showArtworkDetailModal(item) {
    const title = item.querySelector('.item-title').textContent;
    const author = item.querySelector('.item-author').textContent;
    const grade = item.querySelector('.item-grade').textContent;
    const description = item.querySelector('.item-description').textContent;
    const imageUrl = item.querySelector('img').src;
    const category = item.getAttribute('data-category');
    const uploadDate = item.querySelector('.upload-date')?.textContent.replace('📅 ', '') || '날짜 정보 없음';
    
    // 카테고리 한글 변환
    const categoryMap = {
        'drawing': '그림',
        'craft': '공예',
        'sculpture': '조소',
        'digital': '디지털아트'
    };
    
    // 모달 요소들 업데이트
    document.getElementById('detailArtworkTitle').textContent = title;
    document.getElementById('detailArtist').textContent = author;
    document.getElementById('detailGrade').textContent = grade;
    document.getElementById('detailCategory').textContent = categoryMap[category] || category;
    document.getElementById('detailUploadDate').textContent = uploadDate;
    document.getElementById('detailDescriptionText').textContent = description || '작품에 대한 설명이 없습니다.';
    document.getElementById('detailImage').src = imageUrl;
    
    // 현재 이미지 URL 저장 (새 탭에서 열기용)
    currentDetailImageUrl = imageUrl;
    
    // 모달 표시
    const modal = document.getElementById('artworkDetailModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 상세보기 모달 닫기
function closeDetailModal() {
    const modal = document.getElementById('artworkDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentDetailImageUrl = '';
}

// 원본 이미지 새 탭에서 열기
function openImageInNewTab() {
    if (currentDetailImageUrl) {
        window.open(currentDetailImageUrl, '_blank');
    }
}

// 부드러운 스크롤 기능
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                console.log(`${targetId} 섹션으로 이동했습니다.`);
            }
        });
    });
}

// 로딩 애니메이션 표시/숨김
function showLoading() {
    const loading = document.getElementById('loading');
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (loading && galleryGrid) {
        loading.style.display = 'block';
        galleryGrid.style.opacity = '0.5';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (loading && galleryGrid) {
        loading.style.display = 'none';
        galleryGrid.style.opacity = '1';
    }
}

// 업로드 모달 열기
function openUploadModal() {
    if (!isConnected) {
        alert('⚠️ 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        resetUploadForm();
    }
}

// 업로드 모달 닫기
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetUploadForm();
    }
}

// 폼 초기화
function resetUploadForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    
    // 업로드된 이미지 배열 초기화
    uploadedImages = [];
    
    // 이미지 미리보기 초기화
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    if (imagePreviewContainer) {
        imagePreviewContainer.innerHTML = '';
    }
    
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    if (uploadPlaceholder) {
        uploadPlaceholder.style.display = 'block';
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        submitBtn.disabled = true;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
    }
    
    const uploadedImageUrls = document.getElementById('uploadedImageUrls');
    if (uploadedImageUrls) uploadedImageUrls.value = '';
    
    // 업로드 상태 초기화
    isUploading = false;
}

// 버튼 로딩 상태 변경
function setButtonLoading(loading) {
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (loading) {
            submitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }
}

// Cloudinary 업로드 위젯 초기화
function initCloudinaryUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            openCloudinaryWidget();
        });
    }
}

// 여러 이미지 URL 저장 배열
let uploadedImages = [];

// Cloudinary 업로드 위젯 열기 (다중 이미지 지원)
function openCloudinaryWidget() {
    if (typeof cloudinary === 'undefined') {
        alert('Cloudinary 라이브러리가 로드되지 않았습니다.');
        return;
    }

    const widget = cloudinary.createUploadWidget(
        {
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            sources: ['local', 'camera'],
            multiple: true,  // 다중 선택 허용
            maxFiles: 10,    // 최대 10개 파일
            maxFileSize: 10000000,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            theme: 'minimal'
        },
        (error, result) => {
            if (error) {
                console.error('업로드 오류:', error);
                alert('이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
                return;
            }
            
            if (result && result.event === 'success') {
                console.log('업로드 성공:', result.info);
                handleMultipleUploadSuccess(result.info);
            }
        }
    );
    
    widget.open();
}

// 다중 업로드 성공 처리
function handleMultipleUploadSuccess(uploadInfo) {
    const imageUrl = uploadInfo.secure_url;
    uploadedImages.push(imageUrl);
    
    // 미리보기 업데이트
    updateImagePreview();
    
    // 업로드된 이미지 URL들을 hidden field에 저장
    document.getElementById('uploadedImageUrls').value = JSON.stringify(uploadedImages);
    
    // 업로드 placeholder 숨기기
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    if (uploadPlaceholder && uploadedImages.length > 0) {
        uploadPlaceholder.style.display = 'none';
    }
    
    validateForm();
    console.log('이미지가 성공적으로 업로드되었습니다:', imageUrl);
    console.log('전체 업로드된 이미지:', uploadedImages);
}

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    
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
}

// 이미지 제거
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    
    // hidden field 업데이트
    document.getElementById('uploadedImageUrls').value = JSON.stringify(uploadedImages);
    
    // 이미지가 모두 제거되면 placeholder 다시 표시
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    if (uploadPlaceholder && uploadedImages.length === 0) {
        uploadPlaceholder.style.display = 'block';
    }
    
    validateForm();
}

// 폼 유효성 검사
function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim() || '';
    const grade = document.getElementById('studentGrade')?.value || '';
    const studentClass = document.getElementById('studentClass')?.value || '';
    const category = document.getElementById('artworkCategory')?.value || '';
    const hasImages = uploadedImages.length > 0;
    
    const submitBtn = document.querySelector('.submit-btn');
    const isValid = title && grade && studentClass && category && hasImages && isConnected && !isUploading;
    
    if (submitBtn) {
        const btnLoading = submitBtn.querySelector('.btn-loading');
        if (!btnLoading || btnLoading.style.display !== 'flex') {
            submitBtn.disabled = !isValid;
        }
    }
    
    return isValid;
}

// 폼 제출 처리
function initArtworkForm() {
    const form = document.getElementById('artworkForm');
    
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('change', validateForm);
        });
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 연결 상태 확인
            if (!isConnected) {
                alert('⚠️ 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            
            // 중복 업로드 방지
            if (isUploading) {
                console.log('이미 업로드 중입니다.');
                return;
            }
            
            if (!validateForm()) {
                alert('모든 필수 항목을 입력해주세요.');
                return;
            }
            
            isUploading = true;
            setButtonLoading(true);
            
            try {
                // 고유 ID 생성 (타임스탬프 + 랜덤)
                const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
                
                const formData = {
                    id: uniqueId,
                    title: document.getElementById('artworkTitle').value.trim(),
                    artist: document.getElementById('artistName').value.trim(),
                    grade: document.getElementById('studentGrade').value,
                    category: document.getElementById('artworkCategory').value,
                    description: document.getElementById('artworkDescription').value.trim(),
                    imageUrl: document.getElementById('uploadedImageUrl').value,
                    uploadDate: new Date().toISOString()
                };
                
                console.log('📤 새 작품 업로드 시작:', formData);
                
                await saveArtworkToUpstash(formData);
                addNewArtwork(formData);
                closeUploadModal();
                
                alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!\n\n이제 전 세계 어디서든 이 작품을 볼 수 있습니다! 🌍`);
                
                updateStats();
                checkEmptyGallery();
                
            } catch (error) {
                console.error('❌ 작품 등록 오류:', error);
                alert(`작품 등록 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n다시 시도해주세요.`);
            } finally {
                isUploading = false;
                setButtonLoading(false);
            }
        });
    }
}

// 새 작품을 갤러리에 추가 (화면 표시용)
function addNewArtwork(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (galleryGrid) {
        // 중복 방지 체크
        const existingItem = document.querySelector(`[data-artwork-id="${artworkData.id}"]`);
        if (existingItem) {
            console.log('이미 화면에 표시된 작품입니다:', artworkData.id);
            return;
        }
        
        const newItem = document.createElement('div');
        newItem.className = 'gallery-item';
        newItem.setAttribute('data-category', artworkData.category);
        newItem.setAttribute('data-artwork-id', artworkData.id);
        
        const uploadDate = new Date(artworkData.uploadDate).toLocaleDateString('ko-KR');
        
        newItem.innerHTML = `
            <div class="image-container">
                <img src="${artworkData.imageUrl}" alt="${artworkData.title}" loading="lazy">
                <div class="image-overlay">
                    <button class="view-btn">자세히 보기</button>
                </div>
            </div>
            <div class="item-info">
                <h3 class="item-title">${artworkData.title}</h3>
                <p class="item-author">${artworkData.artist}</p>
                <span class="item-grade">${artworkData.grade}</span>
                <p class="item-description">${artworkData.description || '작가의 창의적인 작품입니다.'}</p>
                <small class="upload-date">📅 ${uploadDate}</small>
            </div>
        `;
        
        // 최신 작품을 맨 앞에 추가
        galleryGrid.insertBefore(newItem, galleryGrid.firstChild);
        
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            newItem.style.transition = 'all 0.6s ease';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateY(0)';
        }, 100);
        
        addEventListenersToArtwork(newItem);
        
        console.log('새 작품이 갤러리에 추가되었습니다:', artworkData);
    }
}

// 스크롤 이벤트 (헤더 스타일 변경)
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    const scrolled = window.pageYOffset;
    
    if (header) {
        if (scrolled > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 25px rgba(0,0,0,0.15)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
        }
    }
});

// 주기적 연결 상태 확인 (3분마다)
setInterval(async () => {
    try {
        await callUpstashAPI('PING');
        if (!isConnected) {
            updateConnectionStatus('connected', '연결 복구됨');
            // 연결 복구시 작품 다시 불러오기
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid && galleryGrid.children.length === 0) {
                await loadArtworksFromUpstash();
            }
        }
    } catch (error) {
        updateConnectionStatus('disconnected', '연결 끊어짐');
    }
}, 180000); // 3분마다

// 모달 외부 클릭시 닫기
window.addEventListener('click', function(e) {
    const uploadModal = document.getElementById('uploadModal');
    const detailModal = document.getElementById('artworkDetailModal');
    
    if (e.target === uploadModal) {
        closeUploadModal();
    }
    
    if (e.target === detailModal) {
        closeDetailModal();
    }
});

// ESC 키로 모달 닫기
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const uploadModal = document.getElementById('uploadModal');
        const detailModal = document.getElementById('artworkDetailModal');
        
        if (uploadModal && uploadModal.style.display === 'flex') {
            closeUploadModal();
        }
        
        if (detailModal && detailModal.style.display === 'flex') {
            closeDetailModal();
        }
    }
});

// 에러 처리
window.addEventListener('error', function(e) {
    console.error('JavaScript 오류가 발생했습니다:', e.error);
});

// 개발자를 위한 유틸리티 함수들
const GalleryUtils = {
    // 연결 테스트
    testConnection: async function() {
        try {
            console.log('🔄 연결 테스트 시작...');
            const result = await callUpstashAPI('PING');
            console.log('✅ 연결 테스트 성공:', result);
            alert('✅ Upstash 연결이 정상입니다!');
            return true;
        } catch (error) {
            console.log('❌ 연결 테스트 실패:', error);
            alert(`❌ 연결 실패: ${error.message}`);
            return false;
        }
    },
    
    // 저장된 데이터 확인
    getSavedData: async function() {
        try {
            console.log('📥 저장된 데이터 조회 중...');
            const data = await callUpstashAPI('GET', REDIS_KEY);
            
            if (data && data !== null) {
                let artworks;
                if (typeof data === 'string') {
                    artworks = JSON.parse(data);
                } else {
                    artworks = data;
                }
                console.log('☁️ Upstash 저장된 작품 데이터:', artworks);
                return artworks;
            } else {
                console.log('☁️ Upstash에 저장된 데이터가 없습니다.');
                return [];
            }
        } catch (error) {
            console.error('❌ 데이터 조회 실패:', error);
            return null;
        }
    },
    
    // 갤러리 새로고침
    refreshGallery: async function() {
        try {
            console.log('🔄 갤러리 새로고침 중...');
            
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                galleryGrid.innerHTML = '';
            }
            
            await loadArtworksFromUpstash();
            console.log('✅ 갤러리 새로고침 완료');
        } catch (error) {
            console.error('❌ 갤러리 새로고침 실패:', error);
        }
    },
    
    // 연결 강제 재시도
    forceReconnect: async function() {
        console.log('🔄 연결 강제 재시도...');
        await checkConnectionAndLoadArtworks();
    },
    
    // 전체 작품 수 확인
    getArtworkCount: function() {
        const items = document.querySelectorAll('.gallery-item');
        console.log(`현재 전시 중인 작품 수: ${items.length}개`);
        return items.length;
    },
    
    // 카테고리별 작품 수 확인
    getCategoryCount: function() {
        const categories = {};
        const items = document.querySelectorAll('.gallery-item');
        
        items.forEach(item => {
            const category = item.getAttribute('data-category');
            categories[category] = (categories[category] || 0) + 1;
        });
        
        console.log('카테고리별 작품 수:', categories);
        return categories;
    },
    
    // 테스트 작품 추가
    addTestArtwork: async function() {
        const testArtwork = {
            id: Date.now().toString() + '_test_' + Math.random().toString(36).substr(2, 9),
            title: `테스트 작품 ${new Date().toLocaleTimeString()}`,
            artist: '테스터',
            grade: '1학년 1반',
            category: 'drawing',
            description: '연결 테스트용 작품입니다.',
            imageUrl: 'https://via.placeholder.com/400x300/667eea/ffffff?text=Test+Artwork',
            uploadDate: new Date().toISOString()
        };
        
        try {
            console.log('📤 테스트 작품 추가:', testArtwork);
            await saveArtworkToUpstash(testArtwork);
            addNewArtwork(testArtwork);
            updateStats();
            checkEmptyGallery();
            console.log('✅ 테스트 작품이 추가되었습니다.');
            alert('✅ 테스트 작품이 성공적으로 추가되었습니다!');
        } catch (error) {
            console.error('❌ 테스트 작품 추가 실패:', error);
            alert(`❌ 테스트 작품 추가 실패: ${error.message}`);
        }
    },
    
    // 모든 작품 삭제 (주의!)
    clearGallery: async function() {
        if (confirm('⚠️ 정말로 모든 작품을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
            try {
                console.log('🗑️ 갤러리 초기화 중...');
                await callUpstashAPI('DEL', REDIS_KEY);
                
                const galleryGrid = document.getElementById('galleryGrid');
                if (galleryGrid) {
                    galleryGrid.innerHTML = '';
                }
                
                updateStats();
                checkEmptyGallery();
                updateConnectionStatus('connected', '온라인 - 갤러리 초기화됨');
                console.log('✅ 갤러리가 초기화되었습니다.');
                alert('✅ 갤러리가 초기화되었습니다.');
            } catch (error) {
                console.error('❌ 갤러리 초기화 실패:', error);
                alert(`❌ 갤러리 초기화 실패: ${error.message}`);
            }
        }
    }
};

// 콘솔에 유틸리티 함수 정보 출력
console.log('🛠️ 개발자 도구 (안정화 버전):');
console.log('- GalleryUtils.testConnection() : 연결 테스트');
console.log('- GalleryUtils.getSavedData() : 저장된 데이터 확인');
console.log('- GalleryUtils.refreshGallery() : 갤러리 새로고침');
console.log('- GalleryUtils.forceReconnect() : 연결 강제 재시도');
console.log('- GalleryUtils.addTestArtwork() : 테스트 작품 추가');
console.log('- GalleryUtils.getArtworkCount() : 작품 수 확인');
console.log('- GalleryUtils.getCategoryCount() : 카테고리별 작품 수 확인');
console.log('- GalleryUtils.clearGallery() : 갤러리 초기화 (주의!)');

// 페이지 로드 완료 후 디버그 정보
setTimeout(() => {
    console.log('🔍 시스템 상태:');
    console.log('- Upstash URL:', UPSTASH_CONFIG.url);
    console.log('- Token 길이:', UPSTASH_CONFIG.token.length);
    console.log('- 연결 상태:', isConnected ? '✅ 연결됨' : '❌ 연결 안됨');
    console.log('- 현재 작품 수:', document.querySelectorAll('.gallery-item').length);
    console.log('- 업로드 상태:', isUploading ? '업로드 중' : '대기 중');
    
    if (!isConnected) {
        console.log('❌ 연결 문제 해결 방법:');
        console.log('1. GalleryUtils.testConnection() 실행');
        console.log('2. 브라우저 네트워크 탭에서 요청 확인');
        console.log('3. Upstash 대시보드에서 URL/Token 재확인');
    }
}, 5000);
