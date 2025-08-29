let isEditMode = false;
let editingArtworkId = null;
let currentUser = null; // 현재 사용자 정보
let sortableInstances = []; // Sortable 인스턴스들을 저장

// 기본 작품 등록 설정
let siteSettings = {
@@ -161,6 +162,12 @@ function toggleAdminPanel() {
if (adminButton) adminButton.textContent = '🚪 관리자 나가기';

alert('✅ 관리자 모드가 활성화되었습니다.');
            
            // 관리자 모드 활성화 후 Sortable 초기화
            setTimeout(() => {
                initializeSortable();
            }, 500);
            
} else if (password) {
alert('❌ 비밀번호가 틀렸습니다.');
return;
@@ -176,6 +183,14 @@ function toggleAdminPanel() {
const adminButton = document.querySelectorAll('.header-btn')[1];
if (adminButton) adminButton.textContent = '⚙️ 관리자 모드';

            // 관리자 모드 비활성화 시 Sortable 제거
            sortableInstances.forEach(instance => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            });
            sortableInstances = [];
            
alert('관리자 모드가 종료되었습니다.');
return;
} else {
@@ -586,6 +601,22 @@ async function loadArtworksFromFirebase() {
});
});

        // 순서 정보가 있는 경우 순서대로 정렬, 없는 경우 생성일 기준으로 정렬
        artworks.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            } else if (a.order !== undefined) {
                return -1; // 순서가 있는 작품을 앞으로
            } else if (b.order !== undefined) {
                return 1; // 순서가 있는 작품을 앞으로
            } else {
                // 둘 다 순서가 없는 경우 생성일 기준으로 정렬
                const dateA = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) : new Date(0);
                return dateB - dateA;
            }
        });
        
console.log('✅ Firebase에서 작품 로드 성공:', artworks.length, '개');
return artworks;

@@ -773,6 +804,106 @@ function renderAllArtworks() {
}
}, index * 30);
});
    
    // 드래그 앤 드롭 기능 초기화 (관리자 모드일 때만)
    if (isAdmin) {
        initializeSortable();
    }
}

// Sortable.js 초기화 함수
function initializeSortable() {
    console.log('🔄 Sortable 초기화 시작');
    
    // 기존 Sortable 인스턴스들 제거
    sortableInstances.forEach(instance => {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    });
    sortableInstances = [];
    
    // 전체 갤러리에 Sortable 적용
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid) {
        const sortable = new Sortable(galleryGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onStart: function(evt) {
                console.log('🖱️ 드래그 시작:', evt.item.dataset.artworkId);
                evt.item.style.opacity = '0.8';
            },
            onEnd: function(evt) {
                console.log('🖱️ 드래그 종료:', evt.item.dataset.artworkId);
                evt.item.style.opacity = '1';
                
                // 순서 변경 알림
                if (evt.oldIndex !== evt.newIndex) {
                    console.log(`📊 작품 순서 변경: ${evt.oldIndex} → ${evt.newIndex}`);
                    showOrderChangeNotification();
                }
            }
        });
        sortableInstances.push(sortable);
        console.log('✅ 전체 갤러리 Sortable 초기화 완료');
    }
    
    // 카테고리별 갤러리에도 Sortable 적용
    const categoryGalleries = ['activityGallery', 'worksheetGallery', 'resultGallery'];
    categoryGalleries.forEach(galleryId => {
        const gallery = document.getElementById(galleryId);
        if (gallery) {
            const sortable = new Sortable(gallery, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onStart: function(evt) {
                    evt.item.style.opacity = '0.8';
                },
                onEnd: function(evt) {
                    evt.item.style.opacity = '1';
                    if (evt.oldIndex !== evt.newIndex) {
                        showOrderChangeNotification();
                    }
                }
            });
            sortableInstances.push(sortable);
            console.log(`✅ ${galleryId} Sortable 초기화 완료`);
        }
    });
    
    console.log('✅ 모든 Sortable 인스턴스 초기화 완료');
}

// 순서 변경 알림 표시
function showOrderChangeNotification() {
    // 기존 알림이 있다면 제거
    const existingNotification = document.querySelector('.order-change-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'order-change-notification';
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px;">
            <span>🔄 작품 순서가 변경되었습니다. "순서 저장" 버튼을 클릭하여 저장하세요.</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-size: 16px;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function createArtworkElement(artwork) {
@@ -787,7 +918,8 @@ function createArtworkElement(artwork) {
const imageCount = artwork.imageUrls.length > 1 ? 
`<span class="artwork-type">${artwork.imageUrls.length}장</span>` : '';


    // 관리자 모드일 때 드래그 핸들 추가
    const dragHandle = isAdmin ? '<div class="drag-handle">🔄</div>' : '';

element.innerHTML = `
       <div class="artwork-image" onclick="showArtworkDetail('${artwork.id}')">
@@ -801,13 +933,12 @@ function createArtworkElement(artwork) {
       </div>
       <div class="artwork-info">
           <div class="artwork-header" onclick="showArtworkDetail('${artwork.id}')">
                ${dragHandle}
               <h3 class="artwork-title">${artwork.title}</h3>
               <p class="artwork-author">${artwork.grade}</p>
               <p class="artwork-description">${artwork.description}</p>
               <small style="color: #999; font-size: 0.8rem;">📅 ${uploadDate}</small>
           </div>
            

       </div>
   `;

@@ -1323,17 +1454,31 @@ async function saveArtworkOrder() {

// Firebase에 순서 업데이트
if (db) {
                console.log('🔥 Firebase에 순서 정보 업데이트 중...');
const updatePromises = newOrder.map(artwork => 
                    db.collection('artworks').doc(artwork.id).update({ order: artwork.order })
                    db.collection('artworks').doc(artwork.id).update({ 
                        order: artwork.order,
                        lastModified: firebase.firestore.FieldValue.serverTimestamp()
                    })
);
await Promise.all(updatePromises);
                console.log('✅ Firebase에 순서 정보 업데이트 완료');
}

// 로컬 데이터 업데이트
allArtworks = newOrder;

            // 카테고리별 갤러리도 동일한 순서로 업데이트
            updateCategoryGalleriesOrder(newOrder);
            
alert('✅ 작품 순서가 성공적으로 저장되었습니다!');
console.log('✅ 작품 순서 저장 완료');
            
            // 순서 변경 알림 제거
            const notification = document.querySelector('.order-change-notification');
            if (notification) {
                notification.remove();
            }
}

} catch (error) {
@@ -1342,6 +1487,38 @@ async function saveArtworkOrder() {
}
}

// 카테고리별 갤러리 순서 업데이트
function updateCategoryGalleriesOrder(orderedArtworks) {
    const categoryGalleries = {
        'activity': document.getElementById('activityGallery'),
        'worksheet': document.getElementById('worksheetGallery'),
        'result': document.getElementById('resultGallery')
    };
    
    // 각 카테고리별로 작품들을 순서대로 정렬
    Object.keys(categoryGalleries).forEach(category => {
        const gallery = categoryGalleries[category];
        if (gallery) {
            // 해당 카테고리의 작품들만 필터링하여 순서대로 정렬
            const categoryArtworks = orderedArtworks.filter(artwork => artwork.category === category);
            
            // 기존 요소들 제거
            gallery.innerHTML = '';
            
            // 새로운 순서로 요소들 추가
            categoryArtworks.forEach(artwork => {
                const element = createArtworkElement(artwork);
                if (element) {
                    gallery.appendChild(element);
                    setTimeout(() => element.classList.add('show'), 100);
                }
            });
        }
    });
    
    console.log('✅ 카테고리별 갤러리 순서 업데이트 완료');
}

// 대량 작품 삭제
function bulkDeleteArtworks() {
console.log('🗑️ 대량 작품 삭제 시도');
@@ -1799,6 +1976,10 @@ window.exportData = exportData;
window.saveArtworkOrder = saveArtworkOrder;
window.bulkDeleteArtworks = bulkDeleteArtworks;

// 작품 순서 관리 함수들
window.initializeSortable = initializeSortable;
window.showOrderChangeNotification = showOrderChangeNotification;
window.updateCategoryGalleriesOrder = updateCategoryGalleriesOrder;

// 헤더 이미지 관련 함수들
window.previewHeaderImage = previewHeaderImage;
