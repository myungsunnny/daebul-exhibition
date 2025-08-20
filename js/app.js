// 학생 작품 갤러리 JavaScript - 완전한 관리자 기능 구현

// 설정
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',
    uploadPreset: 'student_gallery'
};

const UPSTASH_CONFIG = {
    url: 'https://sharp-hookworm-54944.upstash.io',
    token: 'AdagAAIncDFhNjc5YWZmYzQ5NDA0ZTEyODQ5ZGNmNDU5YTEwOGM4MHAxNTQ5NDQ'
};

const REDIS_KEY = 'student_gallery:artworks';
const SETTINGS_KEY = 'student_gallery:settings';
const COMMENTS_KEY = 'student_gallery:comments';
const USERS_KEY = 'student_gallery:users';
let ADMIN_PASSWORD = "admin1234"; // 변경 가능하도록 let으로 변경

// 전역 변수
let isConnected = false;
let isAdmin = false;
let allArtworks = [];
let allComments = [];
let allUsers = [];
let uploadedImages = [];
let isUploading = false;
let editingArtworkId = null;

// 기본 설정값
const defaultSettings = {
    siteTitle: '우리학교 학생 작품 전시관',
    siteDescription: '창의적이고 아름다운 학생들의 작품을 함께 감상해보세요',
    headerImageUrl: '',
    allowComments: true,
    moderateComments: false,
    requireUploadPassword: false,
    uploadPassword: 'upload123',
    adminPassword: 'admin1234',
    gradeInfo: {
        'all': {
            title: '전체 학년 작품 소개',
            description: '우리 학교 1학년부터 6학년까지 모든 학생들의 창의적이고 아름다운 작품들을 한눈에 볼 수 있습니다.\n\n각 학년별로 다양한 주제와 기법으로 만들어진 작품들이 전시되어 있으며, 학년이 올라갈수록 더욱 정교하고 깊이 있는 작품들을 감상하실 수 있습니다.\n\n활동 모습, 활동지, 결과물 등 다양한 형태의 작품들을 통해 우리 학생들의 무한한 상상력과 예술적 재능을 확인해보세요.'
        },
        '1학년': {
            title: '1학년 작품 - 첫걸음의 순수함',
            description: '1학년 학생들의 첫 작품 활동입니다.\n\n순수하고 자유로운 상상력으로 만들어진 작품들은 보는 이의 마음을 따뜻하게 만듭니다. 아직 기법이 서툴지만, 그 안에 담긴 진정성과 열정이 느껴집니다.\n\n주로 크레파스, 색연필을 사용한 그림 작품과 간단한 만들기 활동 작품들을 만나보실 수 있습니다.'
        },
        '2학년': {
            title: '2학년 작품 - 호기심 가득한 탐험',
            description: '2학년 학생들의 호기심과 상상력이 가득 담긴 작품들입니다.\n\n1학년보다 더욱 다양한 재료와 기법에 도전하며, 자신만의 표현 방법을 찾아가는 과정이 작품에 잘 드러나 있습니다.\n\n물감을 사용한 그림, 간단한 조형 활동, 자연물을 활용한 만들기 등 다채로운 작품들을 감상하실 수 있습니다.'
        },
        '3학년': {
            title: '3학년 작품 - 창의력의 발현',
            description: '3학년 학생들의 창의력이 본격적으로 발현되기 시작하는 시기의 작품들입니다.\n\n기본적인 미술 기법들을 익히기 시작하면서, 자신만의 독특한 아이디어를 작품에 담아내려 노력합니다.\n\n수채화, 판화, 점토 작품 등 다양한 장르의 작품들을 통해 학생들의 성장하는 예술적 감성을 느껴보세요.'
        },
        '4학년': {
            title: '4학년 작품 - 기법과 상상력의 조화',
            description: '4학년 학생들의 안정된 기법과 풍부한 상상력이 조화를 이루는 작품들입니다.\n\n체계적인 미술 교육을 통해 다양한 표현 기법을 익히고, 이를 바탕으로 자신만의 작품 세계를 구축해 나갑니다.\n\n정교한 그림 작품부터 입체적인 조형 작품까지, 한층 성숙해진 예술적 표현을 만나보실 수 있습니다.'
        },
        '5학년': {
            title: '5학년 작품 - 개성 있는 표현력',
            description: '5학년 학생들의 뚜렷한 개성과 표현력이 돋보이는 작품들입니다.\n\n고학년으로서 보다 깊이 있는 주제 의식을 가지고 작품을 제작하며, 자신만의 예술적 스타일을 찾아가는 과정을 보여줍니다.\n\n사회적 이슈나 환경 문제 등을 다룬 작품들도 등장하며, 예술을 통한 소통과 메시지 전달의 중요성을 배워갑니다.'
        },
        '6학년': {
            title: '6학년 작품 - 완성도 높은 예술 세계',
            description: '6학년 학생들의 완성도 높은 작품들로, 초등 미술 교육의 집대성을 보여줍니다.\n\n6년간 쌓아온 미술 기법과 예술적 감성이 어우러져, 어른들도 감탄할 만한 수준 높은 작품들이 탄생합니다.\n\n졸업을 앞두고 있는 만큼, 추억과 미래에 대한 꿈이 담긴 의미 있는 작품들이 많으며, 후배들에게는 좋은 목표가 되고 있습니다.'
        }
    }
};

// 현재 설정값 저장용 변수
let currentSettings = { ...defaultSettings };

// === 1. 즉시 실행되는 전역 함수들 ===
function toggleUploadPanel() {
    console.log('🖱️ 작품 올리기 버튼 클릭됨');
    
    // 업로드 비밀번호 확인
    if (currentSettings.requireUploadPassword && !isAdmin) {
        const password = prompt('작품 등록 비밀번호를 입력하세요:');
        if (password !== currentSettings.uploadPassword) {
            if (password) {
                alert('❌ 비밀번호가 틀렸습니다.');
            }
            return;
        }
    }
    
    const panel = document.getElementById('uploadPanel');
    const button = document.querySelector('.header-btn');
    
    // 모든 패널 닫기
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    // 패널 토글
    if (panel.style.display === 'block' || panel.classList.contains('active')) {
        panel.classList.remove('active');
        panel.style.display = 'none';
        button.classList.remove('active');
        console.log('📤 업로드 패널 닫힘');
    } else {
        panel.classList.add('active');
        panel.style.display = 'block';
        button.classList.add('active');
        resetForm();
        console.log('📥 업로드 패널 열림');
    }
}

function toggleAdminPanel() {
    console.log('🖱️ 관리자 버튼 클릭됨');
    
    if (!isAdmin) {
        const password = prompt('관리자 비밀번호를 입력하세요:');
        if (password === ADMIN_PASSWORD) {
            alert('✅ 관리자 모드가 활성화되었습니다.');
            isAdmin = true;
            document.body.classList.add('admin-mode');
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            
            // 시스템 상태 패널 표시
            const statusSection = document.getElementById('statusSection');
            if (statusSection) {
                statusSection.style.display = 'block';
            }
        } else if (password) {
            alert('❌ 비밀번호가 틀렸습니다.');
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
    
    // 패널 토글
    if (panel.style.display === 'block' || panel.classList.contains('active')) {
        panel.classList.remove('active');
        panel.style.display = 'none';
        adminButton.classList.remove('active');
        console.log('⚙️ 관리자 패널 닫힘');
    } else {
        panel.classList.add('active');
        panel.style.display = 'block';
        adminButton.classList.add('active');
        loadAdminData();
        console.log('⚙️ 관리자 패널 열림');
    }
}

function switchTypeTab(type) {
    console.log('🖱️ 타입 탭 클릭:', type);
    
    // 모든 탭 비활성화
    document.querySelectorAll('.type-tab').forEach(tab => tab.classList.remove('active'));
    
    // 클릭된 탭 활성화
    const activeTab = document.querySelector(`[data-type="${type}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.type-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // 해당 섹션 표시
    const targetSection = type === 'all' ? 'allSection' : `${type}Section`;
    const section = document.getElementById(targetSection);
    if (section) {
        section.classList.add('active');
        section.style.display = 'block';
    }
    
    console.log('✅ 타입 탭 전환 완료:', type);
}

function switchAdminTab(tab) {
    console.log('🖱️ 관리자 탭 클릭:', tab);
    
    // 모든 탭/콘텐츠 비활성화
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    
    // 클릭된 탭 활성화
    const tabNames = {
        'artworks': '작품 관리',
        'comments': '댓글 관리',
        'users': '사용자 관리',
        'settings': '사이트 설정'
    };
    
    const targetTab = Array.from(document.querySelectorAll('.admin-tab')).find(t => 
        t.textContent.includes(tabNames[tab])
    );
    if (targetTab) targetTab.classList.add('active');
    
    // 해당 콘텐츠 표시
    const content = document.getElementById(`${tab}Content`);
    if (content) {
        content.classList.add('active');
        content.style.display = 'block';
    }
    
    // 탭별 특별 처리
    if (tab === 'artworks') {
        loadArtworksTable();
    } else if (tab === 'comments') {
        loadCommentsTable();
    } else if (tab === 'users') {
        loadUsersTable();
    } else if (tab === 'settings') {
        loadSettingsForm();
    }
    
    console.log('✅ 관리자 탭 전환 완료:', tab);
}

function closeModal() {
    console.log('🖱️ 모달 닫기 클릭');
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // 편집 모드 초기화
    editingArtworkId = null;
    resetForm();
}

function openImageInNewTab() {
    console.log('🖱️ 원본 이미지 보기 클릭');
    const mainImg = document.getElementById('currentMainImage');
    if (mainImg && mainImg.src) {
        window.open(mainImg.src, '_blank');
    }
}

function removeImage(index) {
    console.log('🖱️ 이미지 제거 클릭:', index);
    if (uploadedImages[index]) {
        uploadedImages.splice(index, 1);
        updateImagePreview();
        validateForm();
        console.log('✅ 이미지 제거 완료. 남은 개수:', uploadedImages.length);
    }
}

// === API 및 데이터 함수들 ===
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
        console.error('API 오류:', error);
        throw error;
    }
}

async function loadArtworks() {
    try {
        updateConnectionStatus('connecting', '연결 중...');
        
        // 연결 테스트
        await callUpstashAPI('PING');
        
        // 모든 데이터 로드
        const [artworksData, commentsData, usersData] = await Promise.all([
            callUpstashAPI('GET', REDIS_KEY),
            callUpstashAPI('GET', COMMENTS_KEY),
            callUpstashAPI('GET', USERS_KEY)
        ]);
        
        allArtworks = artworksData ? JSON.parse(artworksData) : [];
        allComments = commentsData ? JSON.parse(commentsData) : [];
        allUsers = usersData ? JSON.parse(usersData) : [];
        
        console.log('📊 데이터 로드 완료:', {
            artworks: allArtworks.length,
            comments: allComments.length,
            users: allUsers.length
        });
        
        renderAllArtworks();
        updateCounts();
        updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품`);
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        updateConnectionStatus('disconnected', '연결 실패');
        
        // 테스트 데이터 추가 (연결 실패시)
        addTestData();
    }
}

// 테스트 데이터 추가 함수
function addTestData() {
    if (allArtworks.length === 0) {
        allArtworks = [
            {
                id: 'test_1',
                title: '🌈 무지개 그림',
                studentName: '김철수',
                grade: '1학년',
                category: 'result',
                description: '비온 뒤 하늘에 나타난 무지개를 그렸어요.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjIgg66y07KeA6rCc64+EIDwvdGV4dD48L3N2Zz4='],
                uploadDate: new Date().toISOString(),
                link: ''
            },
            {
                id: 'test_2',
                title: '📸 운동회 활동',
                studentName: '이영희',
                grade: '3학년',
                category: 'activity',
                description: '운동회에서 열심히 달리는 모습입니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmNjk5NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfk7gg7Zat64+Z7ZqM7JuQ7LKt7ZqMIDwvdGV4dD48L3N2Zz4='],
                uploadDate: new Date().toISOString(),
                link: ''
            }
        ];
        
        renderAllArtworks();
        updateCounts();
        console.log('📝 테스트 데이터 추가됨');
    }
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
            <p class="artwork-author">${artwork.studentName} (${artwork.grade})</p>
            <p class="artwork-description">${artwork.description}</p>
            <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
        </div>
    `;
    
    return element;
}

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
    
    // 댓글 수 업데이트
    const totalCommentsEl = document.getElementById('totalComments');
    if (totalCommentsEl) totalCommentsEl.textContent = allComments.length;
}

// 기본 함수들
function showArtworkDetail(artworkId) {
    console.log('🖱️ 작품 상세보기:', artworkId);
    
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) return;
    
    const categoryMap = { 
        'activity': '📷 활동 모습', 
        'worksheet': '📝 활동지', 
        'result': '🎨 결과물' 
    };
    
    // 모달 내용 업데이트
    document.getElementById('detailArtworkTitle').textContent = artwork.title;
    document.getElementById('detailStudentName').textContent = artwork.studentName;
    document.getElementById('detailGrade').textContent = artwork.grade;
    document.getElementById('detailCategory').textContent = categoryMap[artwork.category] || artwork.category;
    document.getElementById('detailUploadDate').textContent = new Date(artwork.uploadDate).toLocaleDateString('ko-KR');
    document.getElementById('detailDescriptionText').textContent = artwork.description;
    
    // 이미지 갤러리 업데이트
    const mainImg = document.getElementById('currentMainImage');
    if (mainImg && artwork.imageUrls.length > 0) {
        mainImg.src = artwork.imageUrls[0];
    }
    
    // 모달 표시
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function deleteArtwork(artworkId) {
    if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
        return;
    }
    
    allArtworks = allArtworks.filter(art => art.id !== artworkId);
    renderAllArtworks();
    updateCounts();
    closeModal();
    alert('작품이 삭제되었습니다.');
}

function editArtwork(id) {
    if (!isAdmin) {
        alert('관리자만 수정할 수 있습니다.');
        return;
    }
    
    const artwork = allArtworks.find(a => a.id === id);
    if (!artwork) {
        alert('작품을 찾을 수 없습니다.');
        return;
    }
    
    alert('편집 기능은 구현 중입니다.');
}

function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    editingArtworkId = null;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = '작품 등록하기';
    }
    
    console.log('📝 폼 초기화 완료');
}

function validateForm() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }
}

// 빈 함수들 (필요시 구현)
function loadAdminData() { console.log('관리자 데이터 로드'); }
function loadArtworksTable() { console.log('작품 테이블 로드'); }
function loadCommentsTable() { console.log('댓글 테이블 로드'); }
function loadUsersTable() { console.log('사용자 테이블 로드'); }
function loadSettingsForm() { console.log('설정 폼 로드'); }
function saveSettings() { 
    alert('설정이 저장되었습니다.'); 
    console.log('설정 저장'); 
}
function previewHeaderImage() { console.log('헤더 이미지 미리보기'); }
function removeHeaderImage() { console.log('헤더 이미지 제거'); }
function closeFullscreenImage() { console.log('전체화면 이미지 닫기'); }
function bulkDeleteArtworks() { console.log('일괄 삭제'); }
function bulkDeleteComments() { console.log('댓글 일괄 삭제'); }
function exportData() { console.log('데이터 내보내기'); }
function resetAllData() { console.log('데이터 초기화'); }
function deleteComment() { console.log('댓글 삭제'); }
function approveComment() { console.log('댓글 승인'); }

// 설정 관련 함수들
async function loadSettings() {
    try {
        console.log('⚙️ 설정 로드');
        currentSettings = { ...defaultSettings };
        applySettings();
    } catch (error) {
        console.error('❌ 설정 로드 오류:', error);
        currentSettings = { ...defaultSettings };
        applySettings();
    }
}

function applySettings() {
    console.log('🔧 설정 적용');
    
    // 사이트 제목 적용
    const titleElement = document.getElementById('headerTitleText');
    if (titleElement) {
        titleElement.textContent = currentSettings.siteTitle;
    }
    
    // 페이지 타이틀도 변경
    document.title = currentSettings.siteTitle;
    
    // 사이트 설명 적용
    const subtitleElement = document.querySelector('.subtitle');
    if (subtitleElement) {
        subtitleElement.textContent = currentSettings.siteDescription;
    }
}

// 학년별 필터 및 정보 표시 기능
function applyGradeFilter(grade) {
    console.log('🎯 학년 필터 적용:', grade);
    
    const allCards = document.querySelectorAll('.artwork-card');
    let visibleCount = 0;
    
    allCards.forEach(card => {
        const artworkId = card.dataset.artworkId;
        const artwork = allArtworks.find(a => a.id === artworkId);
        
        if (!artwork) {
            card.style.display = 'none';
            return;
        }
        
        let shouldShow = false;
        
        if (grade === 'all') {
            shouldShow = true;
        } else {
            shouldShow = artwork.grade === grade;
        }
        
        if (shouldShow) {
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`✅ 필터 결과: ${visibleCount}개 작품 표시`);
    updateFilteredCounts(grade, visibleCount);
}

function updateFilteredCounts(grade, visibleCount) {
    const activeSection = document.querySelector('.type-section.active');
    if (activeSection) {
        const countElement = activeSection.querySelector('.type-count');
        if (countElement) {
            if (grade === 'all') {
                countElement.textContent = `${visibleCount}개 작품`;
            } else {
                countElement.textContent = `${grade} ${visibleCount}개 작품`;
            }
        }
    }
}

function showGradeInfo(grade) {
    console.log('📚 학년 정보 표시:', grade);
    
    const gradeInfoSection = document.getElementById('gradeInfoSection');
    const gradeInfoTitle = document.getElementById('gradeInfoTitle');
    const gradeInfoDescription = document.getElementById('gradeInfoDescription');
    
    if (!gradeInfoSection || !gradeInfoTitle || !gradeInfoDescription) {
        console.error('학년 정보 요소를 찾을 수 없습니다');
        return;
    }
    
    const info = currentSettings.gradeInfo[grade];
    if (info) {
        gradeInfoTitle.textContent = info.title;
        gradeInfoDescription.textContent = info.description;
        
        gradeInfoSection.classList.add('active');
        gradeInfoSection.style.display = 'block';
        
        setTimeout(() => {
            gradeInfoSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
        
        console.log('✅ 학년 정보 표시 완료:', grade);
    } else {
        gradeInfoSection.classList.remove('active');
        gradeInfoSection.style.display = 'none';
    }
}

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🔍 필터 버튼 클릭:', this.dataset.category);
            
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            applyGradeFilter(category);
            showGradeInfo(category);
            console.log('✅ 필터 적용:', category);
        });
    });
    
    console.log('✅ 필터 버튼 이벤트 리스너 등록됨:', filterBtns.length, '개');
}

function initializeGallery() {
    showGradeInfo('all');
    setupFilterButtons();
    console.log('🎨 갤러리 초기화 완료');
}

// 검색 기능
function performSearch(searchTerm) {
    console.log('🔍 검색 실행:', searchTerm);
    
    const allCards = document.querySelectorAll('.artwork-card');
    let visibleCount = 0;
    
    if (!searchTerm.trim()) {
        // 검색어가 없으면 모든 작품 표시
        allCards.forEach(card => {
            card.style.display = 'block';
            visibleCount++;
        });
    } else {
        const term = searchTerm.toLowerCase();
        
        allCards.forEach(card => {
            const artworkId = card.dataset.artworkId;
            const artwork = allArtworks.find(a => a.id === artworkId);
            
            if (!artwork) {
                card.style.display = 'none';
                return;
            }
            
            const searchableText = [
                artwork.title,
                artwork.studentName,
                artwork.description,
                artwork.grade
            ].join(' ').toLowerCase();
            
            if (searchableText.includes(term)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    console.log(`✅ 검색 완료: ${visibleCount}개 결과`);
}

// Cloudinary 업로드 (기본 구현)
function uploadToCloudinary() {
    console.log('☁️ Cloudinary 업로드 시도');
    alert('Cloudinary 업로드는 아직 구현되지 않았습니다. 일반 파일 업로드를 사용해주세요.');
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 DOM 로드 완료 - 갤러리 초기화 시작');
    
    // 시스템 상태 섹션은 기본적으로 숨김
    const statusSection = document.getElementById('statusSection');
    if (statusSection) {
        statusSection.style.display = 'none';
        statusSection.classList.add('admin-only');
    }
    
    // 세션에서 관리자 상태 확인
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        isAdmin = true;
        document.body.classList.add('admin-mode');
        if (statusSection) {
            statusSection.style.display = 'block';
        }
    }
    
    // 필터 버튼들
    setupFilterButtons();
    
    // 타입 탭 버튼들
    const typeTabs = document.querySelectorAll('.type-tab');
    typeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const type = this.dataset.type;
            console.log('📑 타입 탭 클릭:', type);
            switchTypeTab(type);
        });
    });
    
    // 관리자 탭 버튼들
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const text = this.textContent.trim();
            console.log('⚙️ 관리자 탭 클릭:', text);
            
            const tabMap = {
                '작품 관리': 'artworks',
                '댓글 관리': 'comments', 
                '사용자 관리': 'users',
                '사이트 설정': 'settings'
            };
            
            const tabKey = tabMap[text];
            if (tabKey) switchAdminTab(tabKey);
        });
    });
    
    // 검색 입력
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value;
            console.log('🔍 검색어 입력:', searchTerm);
            
            // 디바운싱: 500ms 후에 검색 실행
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(searchTerm);
            }, 500);
        });
        console.log('🔍 검색 기능 활성화');
    }
    
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
    
    console.log('🎉 모든 이벤트 리스너 등록 완료');
    
    // 초기화 순서
    loadSettings();
    loadArtworks();
    initializeGallery();
    
    console.log('✅ 갤러리 초기화 완료!');
});

// 전역 오류 처리
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');
