// 학생 작품 갤러리 JavaScript

// Cloudinary 설정 (여기에 본인의 정보를 입력하세요!)
const CLOUDINARY_CONFIG = {
    cloudName: 'dc0hyzldx',        // ← 여기에 본인의 Cloud Name 입력
    uploadPreset: 'student_gallery'      // ← Upload Preset 이름
};

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    
    // 초기화 함수들 실행
    initFilterButtons();
    initGalleryItems();
    initSmoothScroll();
    initLoadingAnimation();
    initCloudinaryUpload();
    initArtworkForm();
    
    console.log('✅ 모든 기능이 준비되었습니다!');
    console.log('📸 Cloudinary 업로드 기능이 준비되었습니다!');
});

// 필터 버튼 기능
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
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

// 갤러리 아이템 클릭 이벤트
function initGalleryItems() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const viewButtons = document.querySelectorAll('.view-btn');

    // 갤러리 아이템 클릭
    galleryItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // view-btn 클릭시에는 아이템 클릭 이벤트 실행 안함
            if (e.target.classList.contains('view-btn')) {
                return;
            }
            
            const title = item.querySelector('.item-title').textContent;
            const author = item.querySelector('.item-author').textContent;
            const description = item.querySelector('.item-description').textContent;
            
            showArtworkDetail(title, author, description);
        });
    });

    // 자세히 보기 버튼 클릭
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 버블링 방지
            
            const item = button.closest('.gallery-item');
            const title = item.querySelector('.item-title').textContent;
            const author = item.querySelector('.item-author').textContent;
            const description = item.querySelector('.item-description').textContent;
            
            showArtworkDetail(title, author, description);
        });
    });
}

// 작품 상세보기 모달 (간단한 alert로 구현)
function showArtworkDetail(title, author, description) {
    const message = `
🎨 작품 정보

📝 제목: ${title}
👤 작가: ${author}
📖 설명: ${description}

곧 더 자세한 작품 정보를 볼 수 있는 기능이 추가될 예정입니다!
    `;
    
    alert(message);
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
                
                // 모바일에서 메뉴 닫기 (추후 모바일 메뉴 구현시 사용)
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

// 로딩 애니메이션 초기화
function initLoadingAnimation() {
    // 페이지 로드시 갤러리 아이템들이 순차적으로 나타나는 효과
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 150 + 300); // 300ms 후부터 시작
    });
}

// 업로드 모달 열기
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    
    // 폼 초기화
    resetUploadForm();
}

// 업로드 모달 닫기
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // 배경 스크롤 복원
    
    // 폼 초기화
    resetUploadForm();
}

// 폼 초기화
function resetUploadForm() {
    const form = document.getElementById('artworkForm');
    form.reset();
    
    // 이미지 미리보기 숨기기
    const previewImage = document.getElementById('previewImage');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    previewImage.style.display = 'none';
    uploadPlaceholder.style.display = 'block';
    
    // 제출 버튼 비활성화
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    
    // 숨겨진 이미지 URL 초기화
    document.getElementById('uploadedImageUrl').value = '';
}

// Cloudinary 업로드 위젯 초기화
function initCloudinaryUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    
    // 클릭 이벤트
    uploadArea.addEventListener('click', function() {
        if (CLOUDINARY_CONFIG.cloudName === 'YOUR_CLOUD_NAME') {
            alert('⚠️ Cloudinary 설정을 먼저 완료해주세요!\n\njs/app.js 파일에서 CLOUDINARY_CONFIG의 cloudName을 본인의 값으로 변경해주세요.');
            return;
        }
        
        openCloudinaryWidget();
    });
}

// Cloudinary 업로드 위젯 열기
function openCloudinaryWidget() {
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            sources: ['local', 'camera'],
            multiple: false,
            maxFileSize: 10000000, // 10MB
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            theme: 'minimal',
            text: {
                ko: {
                    or: '또는',
                    back: '뒤로',
                    close: '닫기',
                    upload_from: '업로드',
                    local: '내 컴퓨터',
                    camera: '카메라'
                }
            },
            styles: {
                palette: {
                    window: '#FFFFFF',
                    windowBorder: '#90A0B3',
                    tabIcon: '#667eea',
                    menuIcons: '#5A616A',
                    textDark: '#000000',
                    textLight: '#FFFFFF',
                    link: '#667eea',
                    action: '#667eea',
                    inactiveTabIcon: '#0E2F5A',
                    error: '#F44235',
                    inProgress: '#0078FF',
                    complete: '#20B832',
                    sourceBg: '#E4EBF1'
                }
            }
        },
        (error, result) => {
            if (error) {
                console.error('업로드 오류:', error);
                alert('이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
                return;
            }
            
            if (result && result.event === 'success') {
                console.log('업로드 성공:', result.info);
                handleUploadSuccess(result.info);
            }
        }
    );
    
    widget.open();
}

// 업로드 성공 처리
function handleUploadSuccess(uploadInfo) {
    const imageUrl = uploadInfo.secure_url;
    const previewImage = document.getElementById('previewImage');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    const uploadedImageUrl = document.getElementById('uploadedImageUrl');
    
    // 이미지 미리보기 표시
    previewImage.src = imageUrl;
    previewImage.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
    
    // 업로드된 이미지 URL 저장
    uploadedImageUrl.value = imageUrl;
    
    // 폼 유효성 검사
    validateForm();
    
    console.log('이미지가 성공적으로 업로드되었습니다:', imageUrl);
}

// 폼 유효성 검사
function validateForm() {
    const title = document.getElementById('artworkTitle').value.trim();
    const artist = document.getElementById('artistName').value.trim();
    const grade = document.getElementById('studentGrade').value;
    const category = document.getElementById('artworkCategory').value;
    const imageUrl = document.getElementById('uploadedImageUrl').value;
    
    const submitBtn = document.querySelector('.submit-btn');
    
    // 모든 필수 필드가 채워졌는지 확인
    const isValid = title && artist && grade && category && imageUrl;
    
    submitBtn.disabled = !isValid;
    
    return isValid;
}

// 폼 제출 처리
function initArtworkForm() {
    const form = document.getElementById('artworkForm');
    
    // 입력 필드 변경시 유효성 검사
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });
    
    // 폼 제출 이벤트
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }
        
        // 폼 데이터 수집
        const formData = {
            title: document.getElementById('artworkTitle').value.trim(),
            artist: document.getElementById('artistName').value.trim(),
            grade: document.getElementById('studentGrade').value,
            category: document.getElementById('artworkCategory').value,
            description: document.getElementById('artworkDescription').value.trim(),
            imageUrl: document.getElementById('uploadedImageUrl').value
        };
        
        // 작품 추가
        addNewArtwork(formData);
        
        // 모달 닫기
        closeUploadModal();
        
        // 성공 메시지
        alert(`🎉 "${formData.title}" 작품이 성공적으로 등록되었습니다!`);
    });
}

// 새 작품을 갤러리에 추가
function addNewArtwork(artworkData) {
    const galleryGrid = document.getElementById('galleryGrid');
    
    // 새 갤러리 아이템 생성
    const newItem = document.createElement('div');
    newItem.className = 'gallery-item';
    newItem.setAttribute('data-category', artworkData.category);
    
    newItem.innerHTML = `
        <div class="image-container">
            <img src="${artworkData.imageUrl}" alt="${artworkData.title}">
            <div class="image-overlay">
                <button class="view-btn">자세히 보기</button>
            </div>
        </div>
        <div class="item-info">
            <h3 class="item-title">${artworkData.title}</h3>
            <p class="item-author">${artworkData.artist}</p>
            <span class="item-grade">${artworkData.grade}</span>
            <p class="item-description">${artworkData.description || '작가의 창의적인 작품입니다.'}</p>
        </div>
    `;
    
    // 갤러리 맨 앞에 추가 (최신 작품이 먼저 보이도록)
    galleryGrid.insertBefore(newItem, galleryGrid.firstChild);
    
    // 새 아이템에 애니메이션 효과
    newItem.style.opacity = '0';
    newItem.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        newItem.style.transition = 'all 0.6s ease';
        newItem.style.opacity = '1';
        newItem.style.transform = 'translateY(0)';
    }, 100);
    
    // 새 아이템에 이벤트 리스너 추가
    initGalleryItems();
    
    console.log('새 작품이 갤러리에 추가되었습니다:', artworkData);
}

// 스크롤 이벤트 (헤더 스타일 변경)
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    const scrolled = window.pageYOffset;
    
    if (scrolled > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 25px rgba(0,0,0,0.15)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
    }
});

// 갤러리 아이템 호버 효과 (추가)
document.addEventListener('DOMContentLoaded', function() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// 모달 외부 클릭시 닫기
window.addEventListener('click', function(e) {
    const modal = document.getElementById('uploadModal');
    if (e.target === modal) {
        closeUploadModal();
    }
});

// ESC 키로 모달 닫기
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('uploadModal');
        if (modal.style.display === 'flex') {
            closeUploadModal();
        }
    }
});

// 에러 처리
window.addEventListener('error', function(e) {
    console.error('오류가 발생했습니다:', e.error);
});

// 개발자를 위한 유틸리티 함수들
const GalleryUtils = {
    // 새 작품 추가 (테스트용)
    addArtwork: function(title, author, grade, description, category, imageUrl) {
        const galleryGrid = document.getElementById('galleryGrid');
        const newItem = document.createElement('div');
        newItem.className = 'gallery-item';
        newItem.setAttribute('data-category', category);
        
        newItem.innerHTML = `
            <div class="image-container">
                <img src="${imageUrl}" alt="${title}">
                <div class="image-overlay">
                    <button class="view-btn">자세히 보기</button>
                </div>
            </div>
            <div class="item-info">
                <h3 class="item-title">${title}</h3>
                <p class="item-author">${author}</p>
                <span class="item-grade">${grade}</span>
                <p class="item-description">${description}</p>
            </div>
        `;
        
        galleryGrid.appendChild(newItem);
        
        // 새 아이템에 이벤트 리스너 추가
        initGalleryItems();
        
        console.log(`새 작품이 추가되었습니다: ${title}`);
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
    }
};

// 콘솔에 유틸리티 함수 정보 출력
console.log('🛠️ 개발자 도구:');
console.log('- GalleryUtils.addArtwork() : 새 작품 추가');
console.log('- GalleryUtils.getArtworkCount() : 작품 수 확인');
console.log('- GalleryUtils.getCategoryCount() : 카테고리별 작품 수 확인');
