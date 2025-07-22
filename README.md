# 🍔 TrackBite Backend

배달 주문 플랫폼 TrackBite의 백엔드 레포지토리입니다.  
Express.js와 MongoDB를 기반으로 RESTful API와 인증, 데이터 처리 기능을 제공합니다.  

> 프론트엔드와 전체 기능 설명은 [프론트 리포지토리](https://github.com/cbk96/track_bite)에서 확인하실 수 있습니다.

<br><br>


## 🛠 주요 기술 스택

| 구분 | 기술 |
|-------------|----------------------------------------|
| 서버 환경 | Node.js, Express.js |
| 데이터베이스 | MongoDB (MongoDB Atlas) |
| 파일 저장소 | Supabase Storage (이미지 저장소) |
| 인증 방식 | JWT + Cookie 기반 인증 |
| 배포 | Render |


<br><br>


## 🔧 주요 기능

- 관리자/고객 역할 기반 인증
- 메뉴, 옵션, 쿠폰 등 CRUD API
- 주문 처리 및 스토어별 통계
- 이미지 업로드용 Supabase 연동
- 영업일/시간 기반 주문 제한 로직
