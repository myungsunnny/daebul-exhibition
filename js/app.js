// 학생 작품 갤러리 JavaScript

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 학생 갤러리 시작!');
    
    // 초기화 함수들 실행
    initFilterButtons();
    initGalleryItems();
    initSmoothScroll();
    initLoadingAnimation();
    
    console.log('✅ 모든 기능이 준비되었습니다!');
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

// 작품 업로드 모달 함수
function openUploadModal() {
    const message = `
📸 작품 업로드 기능

현재 준비 중인 기능입니다!

곧 다음 기능들이 추가될 예정입니다:
✅ 이미지 파일 업로드
✅ 작품 제목 및 설명 입력
✅ 학년반 정보 입력
✅ 카테고리 선택

Cloudinary 연동을 통해 안전하고 빠르게 
작품을 업로드할 수 있게 됩니다!
    `;
    
    alert(message);
    
    // 실제 구현시 여기에 Cloudinary 업로드 위젯 코드 추가
    console.log('업로드 기능은 Cloudinary 연동 후 구현예정입니다.');
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
