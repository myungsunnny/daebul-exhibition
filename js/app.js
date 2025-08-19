// 학생 작품 갤러리 JavaScript - 작동하는 안전한 버전
// 학생 작품 갤러리 JavaScript - 오류 수정 버전

// Cloudinary 설정
const CLOUDINARY_CONFIG = {
@@ -24,6 +24,9 @@ let isConnected = false;
// 업로드 중인 상태 (중복 업로드 방지)
let isUploading = false;

// 여러 이미지 URL 저장 배열
let uploadedImages = [];

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
console.log('🎨 학생 갤러리 시작!');
@@ -771,9 +774,6 @@ function initCloudinaryUpload() {
}
}

// 여러 이미지 URL 저장 배열
let uploadedImages = [];

// Cloudinary 업로드 위젯 열기 (다중 이미지 지원)
function openCloudinaryWidget() {
if (typeof cloudinary === 'undefined') {
@@ -818,7 +818,10 @@ function handleMultipleUploadSuccess(uploadInfo) {
updateImagePreview();

// 업로드된 이미지 URL들을 hidden field에 저장
    document.getElementById('uploadedImageUrls').value = JSON.stringify(uploadedImages);
    const uploadedImageUrlsField = document.getElementById('uploadedImageUrls');
    if (uploadedImageUrlsField) {
        uploadedImageUrlsField.value = JSON.stringify(uploadedImages);
    }

// 업로드 placeholder 숨기기
const uploadPlaceholder = document.querySelector('.upload-placeholder');
@@ -857,7 +860,10 @@ function removeImage(index) {
updateImagePreview();

// hidden field 업데이트
    document.getElementById('uploadedImageUrls').value = JSON.stringify(uploadedImages);
    const uploadedImageUrlsField = document.getElementById('uploadedImageUrls');
    if (uploadedImageUrlsField) {
        uploadedImageUrlsField.value = JSON.stringify(uploadedImages);
    }

// 이미지가 모두 제거되면 placeholder 다시 표시
const uploadPlaceholder = document.querySelector('.upload-placeholder');
@@ -868,12 +874,18 @@ function removeImage(index) {
validateForm();
}

// 안전한 DOM 요소 값 가져오기
function safeGetValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
}

// 폼 유효성 검사
function validateForm() {
    const title = document.getElementById('artworkTitle')?.value.trim() || '';
    const grade = document.getElementById('studentGrade')?.value || '';
    const studentClass = document.getElementById('studentClass')?.value || '';
    const category = document.getElementById('artworkCategory')?.value || '';
    const title = safeGetValue('artworkTitle');
    const grade = safeGetValue('studentGrade');
    const studentClass = safeGetValue('studentClass');
    const category = safeGetValue('artworkCategory');
const hasImages = uploadedImages.length > 0;

const submitBtn = document.querySelector('.submit-btn');
@@ -889,7 +901,7 @@ function validateForm() {
return isValid;
}

// 폼 제출 처리
// 폼 제출 처리 (수정된 버전)
function initArtworkForm() {
const form = document.getElementById('artworkForm');

@@ -927,14 +939,26 @@ function initArtworkForm() {
// 고유 ID 생성 (타임스탬프 + 랜덤)
const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);

                // 안전한 방식으로 폼 데이터 수집
                const title = safeGetValue('artworkTitle');
                const grade = safeGetValue('studentGrade');
                const studentClass = safeGetValue('studentClass');
                const category = safeGetValue('artworkCategory');
                const description = safeGetValue('artworkDescription');
                const artworkLink = safeGetValue('artworkLink');
                
                // 학년 반 정보 조합
                const gradeClass = `${grade}학년 ${studentClass}반`;
                
const formData = {
id: uniqueId,
                    title: document.getElementById('artworkTitle').value.trim(),
                    artist: document.getElementById('artistName').value.trim(),
                    grade: document.getElementById('studentGrade').value,
                    category: document.getElementById('artworkCategory').value,
                    description: document.getElementById('artworkDescription').value.trim(),
                    imageUrl: document.getElementById('uploadedImageUrl').value,
                    title: title,
                    grade: gradeClass,
                    category: category,
                    description: description || '작가의 창의적인 작품입니다.',
                    imageUrls: uploadedImages, // 다중 이미지 지원
                    imageUrl: uploadedImages[0], // 하위 호환성을 위한 첫 번째 이미지
                    link: artworkLink,
uploadDate: new Date().toISOString()
};

@@ -1177,10 +1201,10 @@ const GalleryUtils = {
const testArtwork = {
id: Date.now().toString() + '_test_' + Math.random().toString(36).substr(2, 9),
title: `테스트 작품 ${new Date().toLocaleTimeString()}`,
            artist: '테스터',
grade: '1학년 1반',
category: 'drawing',
description: '연결 테스트용 작품입니다.',
            imageUrls: ['https://via.placeholder.com/400x300/667eea/ffffff?text=Test+Artwork'],
imageUrl: 'https://via.placeholder.com/400x300/667eea/ffffff?text=Test+Artwork',
uploadDate: new Date().toISOString()
};
