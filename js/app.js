// 학생 작품 갤러리 JavaScript - 새로운 분류 시스템 적용

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
const ADMIN_PASSWORD = "admin1234";

// 전역 변수
let isConnected = false;
let isAdmin = false;
let allArtworks = [];
let uploadedImages = [];
let isUploading = false;

// 기본 설정값
const defaultSettings = {
    siteTitle: '우리학교 학생 작품 전시관',
    siteDescription: '창의적이고 아름다운 학생들의 작품을 함께 감상해보세요',
    headerImageUrl: '',
    allowComments: true,
    moderateComments: false,
    requireUploadPassword: false,
    uploadPassword: 'upload123',
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
    } else if (tab === 'settings') {
        loadSettingsForm(); // 설정 폼 로드
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

function deleteArtwork(artworkId) {
    console.log('🖱️ 작품 삭제 클릭:', artworkId);
    
    if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
        return;
    }
    
    // 삭제 처리
    try {
        allArtworks = allArtworks.filter(art => art.id !== artworkId);
        
        // UI에서 제거
        const elementsToRemove = document.querySelectorAll(`[data-artwork-id="${artworkId}"]`);
        elementsToRemove.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.8)';
            setTimeout(() => element.remove(), 300);
        });
        
        // 서버 업데이트 (비동기)
        callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
        
        alert('작품이 삭제되었습니다.');
        closeModal();
        updateCounts();
        
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

function editArtwork(id) {
    console.log('🖱️ 작품 수정 클릭:', id);
    alert('수정 기능은 현재 준비 중입니다.');
}

function previewImages() {
    console.log('🖱️ 이미지 미리보기 함수 호출');
    const fileInput = document.getElementById('imageFile');
    handleFileSelect(fileInput);
}

function closeFullscreenImage() {
    console.log('🖱️ 전체화면 이미지 닫기');
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
    }
}

function bulkDeleteArtworks() {
    console.log('🖱️ 일괄 삭제 클릭');
    alert('일괄 삭제 기능은 현재 준비 중입니다.');
}

function bulkDeleteComments() {
    console.log('🖱️ 댓글 일괄 삭제 클릭');
    alert('댓글 일괄 삭제 기능은 현재 준비 중입니다.');
}

function exportData() {
    console.log('🖱️ 데이터 내보내기 클릭');
    try {
        const dataStr = JSON.stringify(allArtworks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'artworks_backup.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('데이터가 내보내기 되었습니다.');
    } catch (error) {
        console.error('내보내기 오류:', error);
        alert('데이터 내보내기 중 오류가 발생했습니다.');
    }
}

function resetAllData() {
    console.log('🖱️ 데이터 초기화 클릭');
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까?')) {
        if (confirm('한 번 더 확인합니다. 모든 작품이 영구적으로 삭제됩니다.')) {
            allArtworks = [];
            
            // UI 초기화
            document.querySelectorAll('.type-gallery').forEach(gallery => {
                if (gallery) gallery.innerHTML = '';
            });
            
            updateCounts();
            callUpstashAPI('DEL', REDIS_KEY);
            alert('모든 데이터가 삭제되었습니다.');
        }
    }
}

// === 2. 관리자 설정 관련 함수들 ===
async function loadSettings() {
    try {
        console.log('⚙️ 설정 로드 시도');
        const data = await callUpstashAPI('GET', SETTINGS_KEY);
        if (data) {
            currentSettings = { ...defaultSettings, ...JSON.parse(data) };
            console.log('✅ 설정 로드 완료:', currentSettings);
        } else {
            currentSettings = { ...defaultSettings };
            console.log('📝 기본 설정 사용');
        }
        applySettings();
    } catch (error) {
        console.error('❌ 설정 로드 오류:', error);
        currentSettings = { ...defaultSettings };
        applySettings();
    }
}

function applySettings() {
    console.log('🔧 설정 적용 중...');
    
    // 사이트 제목 적용
    const titleElement = document.getElementById('headerTitleText');
    if (titleElement) {
        titleElement.textContent = currentSettings.siteTitle;
    }
    
    // 헤더 이미지 적용
    const headerImage = document.getElementById('headerImage');
    if (headerImage && currentSettings.headerImageUrl) {
        headerImage.src = currentSettings.headerImageUrl;
        headerImage.style.display = 'block';
    } else if (headerImage) {
        headerImage.style.display = 'none';
    }
    
    // 사이트 설명 적용
    const subtitleElement = document.querySelector('.subtitle');
    if (subtitleElement) {
        subtitleElement.textContent = currentSettings.siteDescription;
    }
    
    console.log('✅ 설정 적용 완료');
}

function loadSettingsForm() {
    console.log('📝 설정 폼 로드');
    
    // 기본 설정 필드
    const siteTitle = document.getElementById('siteTitle');
    const siteDescription = document.getElementById('siteDescription');
    const allowComments = document.getElementById('allowComments');
    const moderateComments = document.getElementById('moderateComments');
    const requireUploadPassword = document.getElementById('requireUploadPassword');
    const uploadPassword = document.getElementById('uploadPassword');
    
    if (siteTitle) siteTitle.value = currentSettings.siteTitle;
    if (siteDescription) siteDescription.value = currentSettings.siteDescription;
    if (allowComments) allowComments.checked = currentSettings.allowComments;
    if (moderateComments) moderateComments.checked = currentSettings.moderateComments;
    if (requireUploadPassword) requireUploadPassword.checked = currentSettings.requireUploadPassword;
    if (uploadPassword) uploadPassword.placeholder = `기존 값: ${currentSettings.uploadPassword}`;
    
    // 학년별 설정 필드
    Object.keys(currentSettings.gradeInfo).forEach(grade => {
        const gradeKey = grade === 'all' ? 'All' : grade.replace('학년', '');
        const titleField = document.getElementById(`gradeTitle${gradeKey}`);
        const descField = document.getElementById(`gradeDesc${gradeKey}`);
        
        if (titleField) titleField.value = currentSettings.gradeInfo[grade].title;
        if (descField) descField.value = currentSettings.gradeInfo[grade].description;
    });
    
    console.log('✅ 설정 폼 로드 완료');
}

function saveSettings() {
    console.log('💾 설정 저장 시작');
    
    try {
        // 기본 설정 수집
        const siteTitle = document.getElementById('siteTitle')?.value.trim();
        const siteDescription = document.getElementById('siteDescription')?.value.trim();
        const allowComments = document.getElementById('allowComments')?.checked;
        const moderateComments = document.getElementById('moderateComments')?.checked;
        const requireUploadPassword = document.getElementById('requireUploadPassword')?.checked;
        const newUploadPassword = document.getElementById('uploadPassword')?.value.trim();
        
        // 새 설정 객체 생성
        const newSettings = {
            siteTitle: siteTitle || currentSettings.siteTitle,
            siteDescription: siteDescription || currentSettings.siteDescription,
            headerImageUrl: currentSettings.headerImageUrl, // 별도로 처리
            allowComments: allowComments !== undefined ? allowComments : currentSettings.allowComments,
            moderateComments: moderateComments !== undefined ? moderateComments : currentSettings.moderateComments,
            requireUploadPassword: requireUploadPassword !== undefined ? requireUploadPassword : currentSettings.requireUploadPassword,
            uploadPassword: newUploadPassword || currentSettings.uploadPassword,
            gradeInfo: {}
        };
        
        // 학년별 설정 수집
        ['all', '1학년', '2학년', '3학년', '4학년', '5학년', '6학년'].forEach(grade => {
            const gradeKey = grade === 'all' ? 'All' : grade.replace('학년', '');
            const titleField = document.getElementById(`gradeTitle${gradeKey}`);
            const descField = document.getElementById(`gradeDesc${gradeKey}`);
            
            newSettings.gradeInfo[grade] = {
                title: titleField?.value.trim() || currentSettings.gradeInfo[grade]?.title || `${grade} 작품`,
                description: descField?.value.trim() || currentSettings.gradeInfo[grade]?.description || `${grade} 설명`
            };
        });
        
        // 설정 저장
        currentSettings = newSettings;
        
        // 서버에 저장
        callUpstashAPI('SET', SETTINGS_KEY, JSON.stringify(currentSettings))
            .then(() => {
                console.log('✅ 설정 서버 저장 완료');
                applySettings();
                alert('⚙️ 설정이 성공적으로 저장되었습니다!');
            })
            .catch(error => {
                console.error('❌ 설정 서버 저장 오류:', error);
                alert('❌ 설정 저장 중 오류가 발생했습니다.');
            });
        
        console.log('💾 새 설정:', newSettings);
        
    } catch (error) {
        console.error('❌ 설정 저장 오류:', error);
        alert('❌ 설정 저장 중 오류가 발생했습니다.');
    }
}

function previewHeaderImage() {
    console.log('🖱️ 헤더 이미지 미리보기');
    const fileInput = document.getElementById('headerImageFile');
    const preview = document.getElementById('headerImagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                // 설정에 저장
                currentSettings.headerImageUrl = e.target.result;
                console.log('📷 헤더 이미지 임시 저장');
            }
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function removeHeaderImage() {
    console.log('🖱️ 헤더 이미지 제거');
    const preview = document.getElementById('headerImagePreview');
    const fileInput = document.getElementById('headerImageFile');
    const headerImage = document.getElementById('headerImage');
    
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (headerImage) headerImage.style.display = 'none';
    
    // 설정에서 제거
    currentSettings.headerImageUrl = '';
}

// === 3. 헬퍼 함수들 ===
function resetForm() {
    const form = document.getElementById('artworkForm');
    if (form) {
        form.reset();
    }
    uploadedImages = [];
    updateImagePreview();
    validateForm();
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
                   uploadedImages.length > 0 && isConnected && !isUploading;
    
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
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    isUploading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
        const formData = {
            id: `artwork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: document.getElementById('artworkTitle').value.trim(),
            studentName: document.getElementById('studentName').value.trim(),
            grade: document.getElementById('studentGrade').value + '학년',
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            link: document.getElementById('artworkLink')?.value.trim() || '',
            imageUrls: [...uploadedImages],
            uploadDate: new Date().toISOString()
        };
        
        console.log('💾 저장할 작품 데이터:', formData);
        
        // 로컬 데이터에 추가
        allArtworks.unshift(formData);
        
        // UI에 즉시 추가
        addArtworkToGallery(formData);
        
        // 서버에 저장 (비동기)
        callUpstashAPI('SET', REDIS_KEY, JSON.stringify(allArtworks));
        
        // 성공 처리
        resetForm();
        toggleUploadPanel();
        updateCounts();
        
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
        console.log('✅ 작품 등록 완료');
        
    } catch (error) {
        console.error('❌ 작품 등록 오류:', error);
        alert('작품 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function addArtworkToGallery(artwork) {
    // 새로운 갤러리 ID들로 수정
    const galleries = ['galleryGrid', 'activityGallery', 'worksheetGallery', 'resultGallery'];
    
    galleries.forEach(galleryId => {
        const gallery = document.getElementById(galleryId);
        if (!gallery) return;
        
        // 전체 갤러리이거나 해당 카테고리 갤러리인 경우에만 추가
        if (galleryId === 'galleryGrid' || galleryId === `${artwork.category}Gallery`) {
            const element = createArtworkElement(artwork);
            if (element) {
                gallery.appendChild(element);
                setTimeout(() => element.classList.add('show'), 100);
            }
        }
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

function showArtworkDetail(artworkId) {
    console.log('🖱️ 작품 상세보기:', artworkId);
    
    const artwork = allArtworks.find(a => a.id === artworkId);
    if (!artwork) return;
    
    // 새로운 카테고리 매핑
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
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    if (mainImg && artwork.imageUrls.length > 0) {
        mainImg.src = artwork.imageUrls[0];
        
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

// === 4. API 및 데이터 함수들 ===
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
        
        // 데이터 로드
        const data = await callUpstashAPI('GET', REDIS_KEY);
        if (data) {
            allArtworks = JSON.parse(data);
            console.log('📊 작품 로드 완료:', allArtworks.length, '개');
        } else {
            allArtworks = [];
            console.log('📊 새로운 갤러리 시작');
        }
        
        renderAllArtworks();
        updateCounts();
        updateConnectionStatus('connected', `온라인 - ${allArtworks.length}개 작품`);
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        updateConnectionStatus('disconnected', '연결 실패');
    }
}

function renderAllArtworks() {
    // 새로운 갤러리 ID들로 수정
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

function updateConnectionStatus(status, message) {
    const statusEl = document.getElementById('upstashStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-indicator status-${status}">${message}</span>`;
    }
    
    isConnected = status === 'connected';
    validateForm();
}

function updateCounts() {
    // 새로운 카테고리로 수정
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

function loadAdminData() {
    const today = new Date().toDateString();
    const todayArtworks = allArtworks.filter(art => 
        new Date(art.uploadDate).toDateString() === today
    );
    
    document.getElementById('statArtworks').textContent = allArtworks.length;
    document.getElementById('statComments').textContent = '0';
    document.getElementById('statLikes').textContent = '0';
    document.getElementById('statToday').textContent = todayArtworks.length;
}

function loadArtworksTable() {
    const tbody = document.getElementById('artworksTableBody');
    if (!tbody) return;
    
    // 새로운 카테고리 표시명 매핑
    const categoryDisplayNames = {
        'activity': '📷 활동 모습',
        'worksheet': '📝 활동지',
        'result': '🎨 결과물'
    };
    
    tbody.innerHTML = allArtworks.map(artwork => `
        <tr>
            <td><input type="checkbox" value="${artwork.id}"></td>
            <td>${artwork.title}</td>
            <td>${artwork.studentName}</td>
            <td>${artwork.grade}</td>
            <td>${categoryDisplayNames[artwork.category] || artwork.category}</td>
            <td>${new Date(artwork.uploadDate).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-warning btn-small" onclick="editArtwork('${artwork.id}')">수정</button>
                <button class="btn btn-danger btn-small" onclick="deleteArtwork('${artwork.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
}

// === 5. 학년별 필터 및 정보 표시 기능 ===
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
            // 정확한 학년 매칭: "1학년" === "1학년"
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
    // 현재 활성화된 타입 섹션의 카운트 업데이트
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
    
    // 전체 카운트도 업데이트
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl && grade !== 'all') {
        totalCountEl.textContent = visibleCount;
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
    
    // 현재 설정에서 학년 정보 가져오기
    const info = currentSettings.gradeInfo[grade];
    if (info) {
        gradeInfoTitle.textContent = info.title;
        gradeInfoDescription.textContent = info.description;
        
        // 섹션 표시
        gradeInfoSection.classList.add('active');
        gradeInfoSection.style.display = 'block';
        
        // 부드러운 스크롤 효과
        setTimeout(() => {
            gradeInfoSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
        
        console.log('✅ 학년 정보 표시 완료:', grade);
    } else {
        // 정보가 없으면 섹션 숨기기
        gradeInfoSection.classList.remove('active');
        gradeInfoSection.style.display = 'none';
    }
}

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🔍 필터 버튼 클릭:', this.dataset.category);
            
            // 모든 필터 버튼 비활성화
            filterBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 버튼 활성화
            this.classList.add('active');
            
            // 필터 적용
            const category = this.dataset.category;
            applyGradeFilter(category);
            showGradeInfo(category);
            console.log('✅ 필터 적용:', category);
        });
    });
    
    console.log('✅ 필터 버튼 이벤트 리스너 등록됨:', filterBtns.length, '개');
}

function initializeGallery() {
    // 초기 전체 학년 정보 표시
    showGradeInfo('all');
    
    // 필터 버튼 설정
    setupFilterButtons();
    
    console.log('🎨 갤러리 초기화 완료');
}

// === 6. 이벤트 리스너 설정 (수정된 버전) ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 DOM 로드 완료 - 갤러리 초기화 시작');
    
    // 시스템 상태 섹션은 기본적으로 숨김 (관리자 전용)
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
        
        // 입력 필드들
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
    
    // 필터 버튼들 (수정된 부분)
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
        searchInput.addEventListener('input', function() {
            console.log('🔍 검색어 입력:', this.value);
            // 검색 로직은 추후 구현
        });
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
    
    // 전체화면 오버레이
    const fullscreenOverlay = document.getElementById('fullscreenOverlay');
    if (fullscreenOverlay) {
        fullscreenOverlay.addEventListener('click', closeFullscreenImage);
    }
    
    console.log('🎉 모든 이벤트 리스너 등록 완료');
    
    // 설정 로드 (새로 추가)
    loadSettings();
    
    // 데이터 로드
    loadArtworks();
    
    // 갤러리 초기화 (새로 추가)
    initializeGallery();
    
    // 테스트용 함수 등록
    window.testGallery = function() {
        console.log('=== 갤러리 테스트 ===');
        console.log('isConnected:', isConnected);
        console.log('isAdmin:', isAdmin);
        console.log('allArtworks:', allArtworks.length);
        console.log('uploadedImages:', uploadedImages.length);
        
        // 새로운 카테고리로 테스트 작품 추가
        const testArtworks = [
            {
                id: 'test_activity_' + Date.now(),
                title: '📷 활동 모습 테스트',
                studentName: '김철수',
                grade: '1학년',
                category: 'activity',
                description: '활동하는 모습을 담은 사진입니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmNjk5NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfk7cg7Zal64+ZIOuqqOyKtTwvdGV4dD48L3N2Zz4='],
                uploadDate: new Date().toISOString(),
                link: ''
            },
            {
                id: 'test_worksheet_' + Date.now(),
                title: '📝 활동지 테스트',
                studentName: '이영희',
                grade: '3학년',
                category: 'worksheet',
                description: '수업 시간에 작성한 활동지입니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfk50g7Zal64+Z7KeAPC90ZXh0Pjwvc3ZnPg=='],
                uploadDate: new Date().toISOString(),
                link: ''
            },
            {
                id: 'test_result_' + Date.now(),
                title: '🎨 결과물 테스트',
                studentName: '박민수',
                grade: '6학년',
                category: 'result',
                description: '완성된 작품 결과물입니다.',
                imageUrls: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM0ZDM5OSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjqgg6rKw6rO87Jq8PC90ZXh0Pjwvc3ZnPg=='],
                uploadDate: new Date().toISOString(),
                link: ''
            }
        ];
        
        testArtworks.forEach(artwork => {
            allArtworks.unshift(artwork);
            addArtworkToGallery(artwork);
        });
        
        updateCounts();
        
        alert('새로운 분류 테스트 작품들이 추가되었습니다! (활동 모습, 활동지, 결과물)');
        console.log('테스트 작품들 추가됨:', testArtworks.length, '개');
    };
    
    console.log('✅ 갤러리 초기화 완료!');
    console.log('💡 테스트: window.testGallery() 실행해보세요');
});

// === 7. 전역 함수 등록 (HTML onclick용) ===
window.toggleUploadPanel = toggleUploadPanel;
window.toggleAdminPanel = toggleAdminPanel;
window.switchTypeTab = switchTypeTab;
window.switchAdminTab = switchAdminTab;
window.closeModal = closeModal;
window.openImageInNewTab = openImageInNewTab;
window.removeImage = removeImage;
window.deleteArtwork = deleteArtwork;
window.editArtwork = editArtwork;
window.saveSettings = saveSettings;
window.previewImages = previewImages;
window.previewHeaderImage = previewHeaderImage;
window.removeHeaderImage = removeHeaderImage;
window.closeFullscreenImage = closeFullscreenImage;
window.bulkDeleteArtworks = bulkDeleteArtworks;
window.bulkDeleteComments = bulkDeleteComments;
window.exportData = exportData;
window.resetAllData = resetAllData;
window.showArtworkDetail = showArtworkDetail;

// Cloudinary 업로드 (선택사항)
window.uploadToCloudinary = function() {
    console.log('☁️ Cloudinary 업로드 시도');
    if (typeof cloudinary !== 'undefined') {
        cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            multiple: true,
            maxFiles: 10,
            folder: 'student-gallery'
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                uploadedImages.push(result.info.secure_url);
                updateImagePreview();
                validateForm();
                console.log('✅ Cloudinary 업로드 성공:', result.info.secure_url);
            }
            if (error) {
                console.error('❌ Cloudinary 업로드 오류:', error);
                alert('이미지 업로드 중 오류가 발생했습니다.');
            }
        }).open();
    } else {
        alert('Cloudinary 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
};

// === 8. 오류 처리 및 디버깅 ===
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    console.error('파일:', e.filename, '라인:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 거부:', e.reason);
});

// 온라인/오프라인 감지
window.addEventListener('online', function() {
    console.log('🌐 온라인 상태로 변경');
    loadArtworks();
});

window.addEventListener('offline', function() {
    console.log('📵 오프라인 상태로 변경');
    updateConnectionStatus('disconnected', '오프라인');
});

// 페이지 언로드 감지
window.addEventListener('beforeunload', function(e) {
    if (isUploading) {
        e.preventDefault();
        e.returnValue = '작품 업로드가 진행 중입니다. 정말 떠나시겠습니까?';
        return e.returnValue;
    }
});

console.log('🚀 학생 갤러리 JavaScript 완전 로드 완료');
console.log('🔧 디버깅 명령어:');
console.log('  - window.testGallery() : 새로운 분류 테스트 작품 추가');
console.log('  - toggleUploadPanel() : 업로드 패널 토글');
console.log('  - toggleAdminPanel() : 관리자 패널 토글');
console.log('  - console.log(allArtworks) : 전체 작품 데이터 확인');
console.log('  - console.log(currentSettings) : 현재 설정 확인');
