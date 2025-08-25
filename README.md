# 🎨 브릭 톡톡 전시회 - 학생 작품 갤러리

## 📖 프로젝트 소개
대불초등학교 학생들이 브릭모델로 학교와 세상의 문제를 탐구하고 해결해 나가는 과정을 담은 프로젝트 학습 결과물 전시관입니다. 1학년부터 6학년까지 모든 학생들의 창의적이고 아름다운 작품들을 한눈에 볼 수 있습니다.

## ✨ 주요 기능

### 🎯 작품 전시 및 관리
- 📸 **작품 업로드**: 학생들의 작품을 쉽게 등록하고 관리
- 🎨 **카테고리별 분류**: 활동 모습, 활동지, 결과물로 체계적 구분
- 🏫 **학년별 필터링**: 1학년부터 6학년까지 학년별 작품 조회
- 🔍 **검색 기능**: 작품명, 학생명, 설명으로 빠른 검색
- 📱 **반응형 갤러리**: 모바일과 데스크톱 모두 최적화

### ⚙️ 관리자 모드
- 🔐 **보안 관리**: 관리자 비밀번호로 접근 제어
- ✏️ **작품 수정/삭제**: 등록된 작품 정보 수정 및 삭제
- 🔄 **순서 관리**: 드래그 앤 드롭으로 작품 순서 자유롭게 변경
- 💾 **데이터 백업**: 작품 데이터 내보내기 및 백업
- ⚙️ **사이트 설정**: 업로드 비밀번호, 학년별 설명 관리

### 🎨 작품 순서 관리 (신규 기능)
- 🖱️ **드래그 앤 드롭**: 작품 카드를 드래그하여 순서 변경
- 📊 **실시간 순서 저장**: Firebase에 순서 정보 자동 저장
- 🔄 **카테고리 동기화**: 전체 갤러리와 카테고리별 갤러리 순서 동기화
- 💡 **시각적 피드백**: 드래그 중 시각적 효과와 순서 변경 알림

## 🛠️ 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업과 접근성 고려
- **CSS3**: 모던한 디자인과 애니메이션, 반응형 레이아웃
- **JavaScript (ES6+)**: 모듈화된 코드 구조와 비동기 처리

### Backend & Storage
- **Firebase Firestore**: 실시간 데이터베이스 및 작품 정보 저장
- **Firebase Storage**: 이미지 파일 저장 및 관리
- **Cloudinary**: 이미지 최적화 및 CDN 서비스

### Libraries & Tools
- **Sortable.js**: 드래그 앤 드롭 기능 구현
- **Firebase SDK**: 클라우드 서비스 통합

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/username/daebul-exhibition.git
cd daebul-exhibition
```

### 2. Firebase 설정
1. [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트 생성
2. Firestore Database와 Storage 활성화
3. `js/app.js`의 `FIREBASE_CONFIG` 설정 업데이트

### 3. 로컬 실행
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js 사용
npx http-server

# 브라우저에서 http://localhost:8000 접속
```

### 4. GitHub Pages 배포
1. GitHub 저장소에 코드 푸시
2. Settings > Pages에서 GitHub Pages 활성화
3. 자동으로 `https://username.github.io/daebul-exhibition`으로 배포

## 🔑 관리자 접속

### 기본 접속 정보
- **비밀번호**: `admin1234`
- **접근 방법**: 우측 상단 "⚙️ 관리자 모드" 버튼 클릭

### 관리자 기능
- 📊 **작품 통계**: 총 작품 수, 오늘 등록된 작품 수 확인
- ✏️ **작품 관리**: 수정, 삭제, 순서 변경
- 🔄 **순서 관리**: 드래그 앤 드롭으로 작품 순서 조정
- ⚙️ **사이트 설정**: 업로드 비밀번호, 학년별 설명 관리
- 💾 **데이터 관리**: 백업, 내보내기, 초기화

## 📁 파일 구조
```
daebul-exhibition/
├── index.html              # 메인 페이지 및 UI 구조
├── css/
│   └── style.css          # 스타일시트 및 반응형 디자인
├── js/
│   └── app.js             # 메인 애플리케이션 로직
├── images/                 # 정적 이미지 및 아이콘
└── README.md              # 프로젝트 설명서
```

## 🎨 작품 순서 관리 사용법

### 1. 관리자 모드 진입
- 우측 상단 "⚙️ 관리자 모드" 버튼 클릭
- 비밀번호 `admin1234` 입력

### 2. 작품 순서 변경
- 작품 카드의 🔄 드래그 핸들 클릭
- 원하는 위치로 드래그하여 순서 변경
- 우측 상단에 순서 변경 알림 표시

### 3. 순서 저장
- "순서 저장" 버튼 클릭하여 Firebase에 저장
- 카테고리별 갤러리도 자동으로 순서 동기화

## 🔧 Firebase 설정 가이드

### Firestore 보안 규칙
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Storage 보안 규칙
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 📱 반응형 디자인

### 지원 디바이스
- 🖥️ **데스크톱**: 1200px 이상 (최적화)
- 📱 **태블릿**: 768px - 1199px
- 📱 **모바일**: 767px 이하

### 주요 반응형 기능
- 유연한 그리드 레이아웃
- 터치 친화적인 드래그 앤 드롭
- 모바일 최적화된 네비게이션

## 🚀 성능 최적화

### 이미지 최적화
- Firebase Storage를 통한 효율적인 이미지 관리
- 지연 로딩(Lazy Loading)으로 초기 로딩 속도 향상
- 이미지 압축 및 최적화

### 코드 최적화
- 모듈화된 JavaScript 구조
- 이벤트 위임을 통한 메모리 효율성
- 비동기 처리로 사용자 경험 향상

## 🔒 보안 기능

### 접근 제어
- 관리자 모드 비밀번호 보호
- 세션 기반 관리자 인증
- 업로드 비밀번호 설정 가능

### 데이터 보호
- Firebase 보안 규칙 적용
- 사용자 입력 데이터 검증
- XSS 및 CSRF 공격 방지

## 📊 프로젝트 통계

### 현재 상태
- ✅ **완료**: 기본 갤러리 기능, 관리자 모드, 순서 관리
- 🔄 **진행 중**: 사용자 피드백 반영 및 UI 개선
- 📋 **계획**: 추가 기능 및 성능 최적화

### 기술적 성과
- 🎯 **드래그 앤 드롭**: Sortable.js를 활용한 직관적인 순서 관리
- 🔥 **Firebase 통합**: 실시간 데이터 동기화 및 확장성
- 📱 **반응형 디자인**: 모든 디바이스에서 최적의 사용자 경험

## 🤝 기여하기

### 버그 리포트
1. GitHub Issues에서 새로운 이슈 생성
2. 버그 설명과 재현 단계 상세 작성
3. 브라우저 및 OS 정보 포함

### 기능 제안
1. 새로운 기능 아이디어 제안
2. 사용자 경험 개선 방안 제시
3. UI/UX 디자인 제안

### 코드 기여
1. Fork 후 개발 브랜치 생성
2. 코드 변경사항 구현
3. Pull Request 생성 및 리뷰 요청

## 📞 문의사항

### 연락 방법
- 🐛 **버그 리포트**: [GitHub Issues](https://github.com/username/daebul-exhibition/issues)
- 💡 **기능 제안**: [GitHub Discussions](https://github.com/username/daebul-exhibition/discussions)
- 📧 **이메일**: project-email@example.com

### 지원 정보
- 📚 **문서**: 이 README 및 코드 주석 참조
- 🔧 **기술 지원**: Firebase 및 웹 개발 관련 질문
- 🎨 **디자인 지원**: UI/UX 개선 제안

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

**🎨 Made with ❤️ for Daebul Elementary School Students' Art Gallery**

*브릭 톡톡 전시회는 학생들의 창의성과 상상력을 존중하며, 모든 작품의 저작권은 해당 학생들에게 있습니다.*
