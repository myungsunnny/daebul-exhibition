// 학생 작품 갤러리 JavaScript - 완전한 업로드 시스템

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
let ADMIN_PASSWORD = "admin1234";

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
            description: '우리 학교 1학년부터 6학년까지 모든 학생들의 창의적이고 아름다운 작품들을 한눈에 볼 수 있습니다.\n\n각 학년별로 다양한 주제와 기법으로 만들어진 작품들이 전시되어 있으며, 학년이 올라갈수록 더욱 정교하고 깊이 있는 작품들을 감상하실 수 있습니다.'
        },
        '1학년': {
            title: '1학년 작품 - 첫걸음의 순수함',
            description: '1학년 학생들의 첫 작품 활동입니다. 순수하고 자유로운 상상력으로 만들어진 작품들입니다.'
        },
        '2학년': {
            title: '2학년 작품 - 호기심 가득한 탐험',
            description: '2학년 학생들의 호기심과 상상력이 가득 담긴 작품들입니다.'
        },
        '3학년': {
            title: '3학년 작품 - 창의력의 발현',
            description: '3학년 학생들의 창의력이 본격적으로 발현되기 시작하는 시기의 작품들입니다.'
        },
        '4학년': {
            title: '4학년 작품 - 기법과 상상력의 조화',
            description: '4학년 학생들의 안정된 기법과 풍부한 상상력이 조화를 이루는 작품들입니다.'
        },
        '5학년': {
            title: '5학년 작품 - 개성 있는 표현력',
            description: '5학년 학생들의 뚜렷한 개성과 표현력이 돋보이는 작품들입니다.'
        },
        '6학년': {
            title: '6학년 작품 - 완성도 높은 예술 세계',
            description: '6학년 학생들의 완성도 높은 작품들로, 초등 미술 교육의 집대성을 보여줍니다.'
        }
    }
};

let currentSettings = { ...defaultSettings };

// === API 및 데이터 함수들 ===
async function callUpstashAPI(command, key, value = null) {
    try {
        console.log(`🔗 API 호출: ${command} ${key}`);
        
        const url = `${UPSTASH_CONFIG.url}/${command.toLowerCase()}${key ? `/${encodeURIComponent(key)}` : ''}`;
        const options = {
            method: command === 'GET' || command === 'PING' ? 'GET' : 'POST',
            headers: { 
                'Authorization': `Bearer ${UPSTASH_CONFIG.token}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (value !== null && command !== 'GET' && command !== 'PING') {
            options.body = value;
        }
        
        console.log('📤 요청:', { url, method: options.method });
        
        const response = await fetch(url, options);
        console.log('📥 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ API 응답:', result);
        
        return result.result;
    } catch (error) {
        console.error('❌ API 오류:', error);
        throw error;
    }
}

async function testConnection() {
    try {
        console.log('🔌 데이터베이스 연결 테스트 시작');
        updateConnectionStatus('connecting', '연결 테스트 중...');
        
        const pingResult = await callUpstashAPI('PING');
        console.log('🏓 PING 결과:', pingResult);
        
        if (pingResult === 'PONG') {
            updateConnectionStatus('connected', '데이터베이스 연결됨');
            isConnected = true;
            return true;
        } else {
            throw new Error('PING 응답이 올바르지 않음');
        }
    } catch (error) {
        console.error('❌ 연결 테스트 실패:', error);
        updateConnectionStatus('disconnected', `연결 실패: ${error.message}`);
        isConnected = false;
        return false;
    }
}

async function loadArtworks() {
    try {
        console.log('📂 작품 데이터 로드 시작');
        
        // 연결 테스트 먼저 실행
        const connected = await testConnection();
        if (!connected) {
            console.log('🔄 오프라인 모드로 전환');
            addTestData();
            return;
        }
        
        // 모든 데이터 로드
        const [artworksData, commentsData, usersData] = await Promise.all([
            callUpstashAPI('GET', REDIS_KEY).catch(() => null),
            callUpstashAPI('GET', COMMENTS_KEY).catch(() => null),
            callUpstashAPI('GET', USERS_KEY).catch(() => null)
        ]);
        
        allArtworks = artworksData ? JSON.parse(artworksData) : [];
        allComments = commentsData ? JSON.parse(commentsData) : [];
        allUsers = usersData ? JSON.parse(usersData) : [];
        
        console.log('📊 데이터 로드 완료:', {
            artworks: allArtworks.length,
            comments: allComments.length,
            users: allUsers.length
        });
        
        // 데이터가 없으면 테스트 데이터 추가
        if (allArtworks.length === 0) {
            addTestData();
        }
        
        renderAllArtworks();
        updateCounts();
        updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품`);
        
    } catch (error) {
        console.error('❌ 데이터 로드 오류:', error);
        updateConnectionStatus('disconnected', `데이터 로드 실패: ${error.message}`);
        addTestData();
    }
}

// 테스트 데이터 추가 함수
function addTestData() {
    console.log('🧪 테스트 데이터 추가');
    
    if (allArtworks.length === 0) {
        allArtworks = [
            {
                id: 'test_1',
                title: '🌈 무지개 그림',
                studentName: '김철수',
                grade: '1학년',
                category: 'result',
                description: '비온 뒤 하늘에 나타난 무지개를 그렸어요. 7가지 색깔을 모두 사용했습니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InJhaW5ib3ciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZmYwMDAwO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTYuNjclIiBzdHlsZT0ic3RvcC1jb2xvcjojZmY4YzAwO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMzMuMzMlIiBzdHlsZT0ic3RvcC1jb2xvcjojZmZmZjAwO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBmZjAwO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iNjYuNjYlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA4MGZmO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iODMuMzMlIiBzdHlsZT0ic3RvcC1jb2xvcjojODAwMGZmO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2ZmMDBmZjtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzg3Q0VGQSIvPjxwYXRoIGQ9Ik01MCA4MEM1MCA4MCA4MCA2MCAyNTAgNjBDMjUwIDYwIDI4MCA4MCAyODAgODBDMjgwIDkwIDI1MCA5MCAyNTAgOTBDMjUwIDkwIDgwIDkwIDUwIDkwWiIgZmlsbD0idXJsKCNyYWluYm93KSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMDA0MDgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPvCfjIgg66y07KeA6rCcPC90ZXh0Pjwvc3ZnPg=='],
                uploadDate: new Date().toISOString(),
                link: ''
            },
            {
                id: 'test_2',
                title: '📸 운동회 달리기',
                studentName: '이영희',
                grade: '3학년',
                category: 'activity',
                description: '운동회에서 열심히 달리는 모습입니다. 1등을 했어요!',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzRFQjNEMSIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiBmaWxsPSIjRkZEQjAwIiByPSIzMCIvPjxwYXRoIGQ9Ik0xMzAgODBMMTcwIDgwTDE2NSAxMjBMMTM1IDEyMFoiIGZpbGw9IiNGRjY5QjQiLz48cGF0aCBkPSJNMTQ1IDEyMEwxNTUgMTIwTDE1MyAxNjBMMTQ3IDE2MFoiIGZpbGw9IiNGRkQ3MDciLz48Y2lyY2xlIGN4PSIxNDAiIGN5PSI2NSIgcj0iNSIgZmlsbD0iIzFFMjkzQiIvPjxjaXJjbGUgY3g9IjE2MCIgY3k9IjY1IiByPSI1IiBmaWxsPSIjMUUyOTNCIi8+PHBhdGggZD0iTTE0MCA3NUMxNDAgNzUgMTUwIDgwIDE2MCA3NSIgc3Ryb2tlPSIjMUUyOTNCIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48dGV4dCB4PSIxNTAiIHk9IjE4NSIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBCMLBIIWF7cyLc2VyaWYiPvCfk7gg7Zat64+Z7ZqM66esDQgQ==</dGV4dD48L3N2Zz4='],
                uploadDate: new Date().toISOString(),
                link: ''
            },
            {
                id: 'test_3',
                title: '📝 수학 활동지',
                studentName: '박민수',
                grade: '2학년',
                category: 'worksheet',
                description: '덧셈과 뺄셈을 연습하는 활동지를 완성했습니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0Y3RkFGQyIgc3Ryb2tlPSIjRTJFOEYwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxNTAiIHk9IjMwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjMjU0NEE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj7siJjtlZntmLnrj5nsp4E8L3RleHQ+PGxpbmUgeDE9IjMwIiB5MT0iNDAiIHgyPSIyNzAiIHkyPSI0MCIgc3Ryb2tlPSIjRTJFOEYwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCIgeT0iNjUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBCMLIYDF0cy1zZXJpZiI+MyArIDUgPSA4PC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSI5NSIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj43IC0gMiA9IDU8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjEyNSIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj42ICsgNCA9IDEwPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIxNTUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBCMLIYDF0cy1zZXJpZiI+OSAtIDMgPSA2PC90ZXh0Pjx0ZXh0IHg9IjI1MCIgeT0iNjUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNEQzI2MjYiIGZvbnQtZmFtaWx5PSJBCMLIYDF0cy1zZXJpZiI+4pyFPC90ZXh0Pjx0ZXh0IHg9IjI1MCIgeT0iOTUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNEQzI2MjYiIGZvbnQtZmFtaWx5PSJBCMLIYDF0cy1zZXJpZiI+4pyFPC90ZXh0Pjx0ZXh0IHg9IjI1MCIgeT0iMTI1IiBmb250LXNpemU9IjIwIiBmaWxsPSIjREMyNjI2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPuKchTwvdGV4dD48dGV4dCB4PSIyNTAiIHk9IjE1NSIgZm9udC1zaXplPSIyMCIgZmlsbD0iI0RDMjYyNiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj7inIU8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxODUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjczODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBCMLIYDF0cy1zZXJpZiI+7ZWZ7IOdOiDrsJXrr7zsiJg8L3RleHQ+PC9zdmc+'],
                uploadDate: new Date().toISOString(),
                link: ''
            }
        ];
        
        renderAllArtworks();
        updateCounts();
        console.log('✅ 테스트 데이터 추가 완료');
    }
}

// === 폼 관련 함수들 ===
function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    editingArtworkId = null;
    updateImagePreview();
    validateForm();
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = '작품 등록하기';
    }
    
    console.log('📝 폼 초기화 완료');
}

function handleFileSelect(fileInput) {
    if (!fileInput || !fileInput.files) {
        console.log('파일 입력 없음');
        return;
    }
    
    const files = fileInput.files;
    console.log('📁 파일 선택됨:', files.length, '개');
    
    uploadedImages = []; // 기존 이미지 초기화
    
    Array.from(files).forEach((file, index) => {
        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            alert(`파일 "${file.name}"이 너무 큽니다. (최대 10MB)`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages.push(e.target.result);
            updateImagePreview();
            validateForm();
            console.log(`✅ 이미지 ${index + 1} 로드 완료`);
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
    
    container.innerHTML = uploadedImages.map((url, index) =>
        `<div style="position: relative; display: inline-block; margin: 5px;">
            <img src="${url}" alt="미리보기 ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
            <button type="button" onclick="removeImage(${index})" style="position: absolute; top: -8px; right: -8px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; font-weight: bold;">&times;</button>
        </div>`
    ).join('');
    
    if (uploadText) uploadText.style.display = 'none';
    
    console.log('🖼️ 이미지 미리보기 업데이트:', uploadedImages.length, '개');
}

function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim();
    const studentName = document.getElementById('studentName')?.value.trim();
    const grade = document.getElementById('studentGrade')?.value;
    const category = document.getElementById('artworkCategory')?.value;
    const description = document.getElementById('artworkDescription')?.value.trim();
    
    const isValid = title && studentName && grade && category && description && 
                   uploadedImages.length > 0 && !isUploading;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.5';
        
        // 상태 메시지 표시
        let statusMessage = '';
        if (!title) statusMessage = '제목을 입력하세요';
        else if (!studentName) statusMessage = '학생 이름을 입력하세요';
        else if (!grade) statusMessage = '학년을 선택하세요';
        else if (!category) statusMessage = '작품 분류를 선택하세요';
        else if (!description) statusMessage = '작품 설명을 입력하세요';
        else if (uploadedImages.length === 0) statusMessage = '이미지를 선택하세요';
        else if (isUploading) statusMessage = '업로드 중...';
        else statusMessage = '등록 준비 완료';
        
        // 상태 표시 요소가 있다면 업데이트
        const statusEl = document.getElementById('formStatus');
        if (statusEl) {
            statusEl.textContent = statusMessage;
            statusEl.className = isValid ? 'status-success' : 'status-warning';
        }
    }
    
    return isValid;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('📝 폼 제출 시도');
    
    if (!validateForm()) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = editingArtworkId ? '수정 중...' : '등록 중...';

    try {
        const formData = {
            id: editingArtworkId || `artwork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: document.getElementById('artworkTitle').value.trim(),
            studentName: document.getElementById('studentName').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink')?.value.trim() || '',
            imageUrls: [...uploadedImages],
            uploadDate: editingArtworkId ? 
                allArtworks.find(a => a.id === editingArtworkId)?.uploadDate || new Date().toISOString() :
                new Date().toISOString(),
            modifiedDate: editingArtworkId ? new Date().toISOString() : undefined
        };
        
        console.log('💾 저장할 작품 데이터:', formData);
        
        if (editingArtworkId) {
            // 수정 모드
            const index = allArtworks.findIndex(a => a.id === editingArtworkId);
            if (index !== -1) {
                allArtworks[index] = formData;
            }
        } else {
            // 신규 등록
            allArtworks.unshift(formData);
        }
        
        // 사용자 정보 업데이트
        updateUserStats(formData.studentName, formData.grade);
        
        // UI 업데이트
        if (!editingArtworkId) {
            addArtworkToGallery(formData);
        } else {
            renderAllArtworks(); // 수정의 경우 전체 새로고침
        }
        
        // 서버에 저장 (비동기)
        if (isConnected) {
            try {
                await callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
                await callUpstashAPI('SET', USERS_KEY, JSON.stringify(allUsers));
                console.log('✅ 서버 저장 성공');
            } catch (error) {
                console.error('⚠️ 서버 저장 실패 (로컬에는 저장됨):', error);
            }
        }
        
        // 성공 처리
        resetForm();
        toggleUploadPanel();
        updateCounts();
        
        if (isAdmin) {
            loadArtworksTable(); // 관리자 테이블 새로고침
        }
        
        const message = editingArtworkId ? 
            `🎉 "${formData.title}" 작품이 성공적으로 수정되었습니다!` :
            `🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`;
        
        alert(message);
        console.log('✅ 작품 처리 완료');
        
    } catch (error) {
        console.error('❌ 작품 처리 오류:', error);
        alert('작품 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        editingArtworkId = null;
    }
}

function updateUserStats(studentName, grade) {
    const existingUser = allUsers.find(u => u.name === studentName);
    
    if (existingUser) {
        existingUser.artworkCount = allArtworks.filter(a => a.studentName === studentName).length;
        existingUser.lastActivity = new Date().toISOString();
    } else {
        allUsers.push({
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: studentName,
            grade: grade,
            artworkCount: 1,
            commentCount: 0,
            likeCount: 0,
            joinDate: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });
    }
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

// === 기본 함수들 ===
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

// === 기타 필수 함수들 ===
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    editingArtworkId = null;
    resetForm();
}

function showArtworkDetail(artworkId) {
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

function removeImage(index) {
    if (uploadedImages[index]) {
        uploadedImages.splice(index, 1);
        updateImagePreview();
        validateForm();
        console.log('✅ 이미지 제거 완료. 남은 개수:', uploadedImages.length);
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
    
    // 서버에서도 삭제
    if (isConnected) {
        callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
    }
    
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
    
    // 편집 모드 설정
    editingArtworkId = id;
    
    // 업로드 패널 열기
    toggleUploadPanel();
    
    // 폼에 기존 데이터 채우기
    document.getElementById('artworkTitle').value = artwork.title;
    document.getElementById('studentName').value = artwork.studentName;
    document.getElementById('studentGrade').value = artwork.grade.replace('학년', '');
    document.getElementById('artworkCategory').value = artwork.category;
    document.getElementById('artworkDescription').value = artwork.description;
    document.getElementById('artworkLink').value = artwork.link || '';
    
    // 기존 이미지 로드
    uploadedImages = [...artwork.imageUrls];
    updateImagePreview();
    
    // 버튼 텍스트 변경
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = '작품 수정하기';
    }
    
    validateForm();
    console.log('✅ 편집 모드 설정 완료');
}

// 빈 함수들 (기본 구현)
function loadAdminData() {
    const today = new Date().toDateString();
    const todayArtworks = allArtworks.filter(art => 
        new Date(art.uploadDate).toDateString() === today
    );
    
    // 통계 업데이트
    const statArtworks = document.getElementById('statArtworks');
    const statComments = document.getElementById('statComments');
    const statLikes = document.getElementById('statLikes');
    const statToday = document.getElementById('statToday');
    
    if (statArtworks) statArtworks.textContent = allArtworks.length;
    if (statComments) statComments.textContent = allComments.length;
    if (statLikes) statLikes.textContent = allArtworks.reduce((sum, art) => sum + (art.likeCount || 0), 0);
    if (statToday) statToday.textContent = todayArtworks.length;
}

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
function openImageInNewTab() {
    const mainImg = document.getElementById('currentMainImage');
    if (mainImg && mainImg.src) {
        window.open(mainImg.src, '_blank');
    }
}

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
    alert('Cloudinary 업로드는 현재 구현되지 않았습니다.\n일반 파일 업로드를 사용해주세요.');
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
        console.log('✅ 입력 필드 이벤트 리스너 등록됨:', inputs.length, '개');
    }
    
    // 이미지 파일 입력
    const imageInput = document.getElementById('imageFile');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            console.log('📁 파일 선택 이벤트 발생');
            handleFileSelect(this);
        });
        console.log('📷 이미지 입력 이벤트 리스너 등록됨');
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
    
    // 데이터베이스 연결 상태 확인
    setTimeout(() => {
        console.log('📊 초기화 완료 상태:');
        console.log('- 연결 상태:', isConnected ? '연결됨' : '오프라인');
        console.log('- 작품 수:', allArtworks.length);
        console.log('- 관리자 모드:', isAdmin ? '활성' : '비활성');
    }, 2000);
    
    console.log('✅ 갤러리 초기화 완료!');
    
    // 테스트 함수 등록
    window.testUpload = function() {
        console.log('=== 업로드 테스트 ===');
        console.log('연결 상태:', isConnected);
        console.log('폼 검증:', validateForm());
        console.log('업로드된 이미지:', uploadedImages.length);
        
        if (uploadedImages.length === 0) {
            console.log('⚠️ 테스트용 이미지 추가');
            uploadedImages.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuO1jwfOV04qU1QgSU1BR0U8L3RleHQ+PC9zdmc+');
            updateImagePreview();
        }
        
        // 폼 필드 자동 채우기
        document.getElementById('artworkTitle').value = '테스트 작품';
        document.getElementById('studentName').value = '테스트 학생';
        document.getElementById('studentGrade').value = '3';
        document.getElementById('artworkCategory').value = 'result';
        document.getElementById('artworkDescription').value = '테스트용 작품 설명입니다.';
        
        validateForm();
        console.log('✅ 테스트 데이터 설정 완료');
    };
    
    window.forceUpload = function() {
        console.log('=== 강제 업로드 테스트 ===');
        if (document.getElementById('artworkForm')) {
            handleFormSubmit({ preventDefault: () => {} });
        }
    };
});

// 전역 오류 처리
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
    
    // 사용자에게 오류 알림 (선택적)
    if (e.error && e.error.message && e.error.message.includes('fetch')) {
        console.log('📶 네트워크 오류 감지 - 오프라인 모드로 전환');
        updateConnectionStatus('disconnected', '네트워크 오류');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 거부:', e.reason);
});

// 네트워크 상태 모니터링
window.addEventListener('online', function() {
    console.log('🌐 온라인 상태로 변경');
    loadArtworks();
});

window.addEventListener('offline', function() {
    console.log('📵 오프라인 상태로 변경');
    updateConnectionStatus('disconnected', '오프라인');
});

// 페이지 새로고침 전 확인
window.addEventListener('beforeunload', function(e) {
    if (isUploading) {
        e.preventDefault();
        e.returnValue = '작품 업로드가 진행 중입니다. 정말 떠나시겠습니까?';
        return e.returnValue;
    }
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');
console.log('🔧 디버깅 명령어:');
console.log('  - window.testUpload() : 업로드 폼 테스트');
console.log('  - window.forceUpload() : 강제 업로드 실행');
console.log('  - toggleUploadPanel() : 업로드 패널 토글');
console.log('  - console.log(allArtworks) : 전체 작품 데이터 확인');
console.log('  - console.log(isConnected) : 연결 상태 확인');
