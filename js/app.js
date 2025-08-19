// 학생 작품 갤러리 JavaScript - Upstash Redis 연동

// Cloudinary 설정 (여기에 본인의 정보를 입력하세요!)
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',        // ← 여기에 본인의 Cloud Name 입력
    uploadPreset: 'student_gallery'      // ← Upload Preset 이름
};

// Upstash Redis 설정 (여기에 본인의 정보를 입력하세요!)
const UPSTASH_CONFIG = {
    url: 'https://sharp-hookworm-54944.upstash.io',      // ← Upstash Redis REST URL
    token: 'AdagAAIncDFhNjc5YWZmYzQ5NDA0ZTEyODQ5ZGNmNDU5YTEwOGM4MHAxNTQ5NDQ'   // ← Upstash Redis REST Token
};

// Redis 키
const REDIS_KEY = 'student_gallery:artworks';

// 현재 상세보기 중인 이미지 URL (새 탭에서 열기용)
let currentDetailImageUrl = '';

// 연결 상태
let isConnected = false;

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

// Upstash Redis API 호출
async function callUpstashAPI(command, key, value = null) {
    try {
        if (UPSTASH_CONFIG.url === 'YOUR_UPSTASH_REDIS_REST_URL') {
            throw new Error('Upstash 설정을 먼저 완료해주세요!');
        }

        const body = value !== null ? [command, key, JSON.stringify(value)] : [command, key];
        
        const response = await fetch(UPSTASH_CONFIG.url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_CONFIG.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Upstash API 호출 오류:', error);
        throw error;
    }
}

// 연결 확인 및 작품 불러오기
async function checkConnectionAndLoadArtworks() {
    updateConnectionStatus('connecting', '서버 연결 중...');
    
    try {
        // 연결 테스트
        await callUpstashAPI('PING');
        updateConnectionStatus('connected', '온라인 - 실시간 동기화');
        
        // 작품 불러오기
        await loadArtworksFromUpstash();
        
    } catch (error) {
        console.error('연결 오류:', error);
        updateConnectionStatus('disconnected', '오프라인 - 연결 실패');
        
        if (error.message.includes('Upstash 설정')) {
            alert('⚠️ Upstash 설정을 먼저 완료해주세요!\n\njs/app.js 파일에서 UPSTASH_CONFIG의 url과 token을 본인의 값으로 변경해주세요.');
        }
    }
}

// Upstash에서 작품 불러오기
async function loadArtworksFromUpstash() {
    try {
        showLoading();
        updateConnectionStatus('connecting', '작품 불러오는 중...');
        
        const artworksData = await callUpstashAPI('GET', REDIS_KEY);
        
        if (artworksData) {
            const artworks = JSON.parse(artworksData);
            console.log(`☁️ Upstash에서 ${artworks.length}개 작품을 불러왔습니다.`);
            
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
        console.error('작품 불러오기 오류:', error);
        hideLoading();
        checkEmptyGallery();
        updateConnectionStatus('disconnected', '작품 로드 실패');
    }
}

// Upstash에 작품 저장
async function saveArtworkToUpstash(newArtwork) {
    try {
        updateConnectionStatus('connecting', '작품 저장 중...');
        
        // 기존 작품들 가져오기
        let artworks = [];
        const existingData = await callUpstashAPI('GET', REDIS_KEY);
        
        if (existingData) {
            artworks = JSON.parse(existingData);
        }
        
        // 새 작품을 맨 앞에 추가 (최신 작품이 먼저 보이도록)
        artworks.unshift(newArtwork);
        
        // Upstash에 저장
        await callUpstashAPI('SET', REDIS_KEY, artworks);
        
        updateConnectionStatus('connected', `온라인 - ${artworks.length}개 작품 동기화됨`);
        console.log('☁️ 작품이 Upstash에 성공적으로 저장되었습니다:', newArtwork.title);
        
        return true;
    } catch (error) {
        console.error('작품 저장 오류:', error);
        updateConnectionStatus('disconnected', '저장 실패');
        throw error;
    }
}

// 작품 요소 생성 (DOM에 추가)
function createArtworkElement(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    
    // 새 갤러리 아이템 생성
    const newItem = document.createElement('div');
    newItem.className = 'gallery-item';
    newItem.setAttribute('data-category', artworkData.category);
    newItem.setAttribute('data-artwork-id', artworkData.id);
    
    // 업로드 날짜 포맷팅
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
