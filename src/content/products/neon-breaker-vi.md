---
title: "Brick Breaker: Neon"
tagline: "Game phá gạch kinh điển, làm mới với power-up, ánh neon, và hệ thống lượt chơi không bao giờ thực sự khóa bạn lại."
description: "Game phá gạch phong cách neon với power-up rơi ngẫu nhiên có trọng số (nhân bóng, bóng lửa, khiên chắn, mở rộng thanh đỡ), bộ màn chơi được thiết kế sẵn rồi nối dài vô tận bằng màn chơi sinh ngẫu nhiên, bảng xếp hạng cá nhân + toàn cầu, và 10 ngôn ngữ có sẵn."
image: "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/icon.png"
screenshots:
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/home.png"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/level-select.png"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/gameplay.png"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/pause.png"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/neon-breaker/settings.png"
platform: "iOS, Android"
type: "Mobile Game"
techStack:
  - Flutter
  - Flame
  - Firebase Auth
  - Cloud Firestore
  - Firebase Analytics
  - Firebase Crashlytics
  - Firebase Remote Config
  - Google AdMob
  - Google Sign-In
status: "Sắp ra mắt"
demo: ""
appStoreUrl: "https://apps.apple.com/app/id6804187765"
playStoreUrl: ""
category: "Trò chơi"
tags:
  - phá gạch
  - breakout
  - arcade
  - flutter
  - indie dev
  - game
  - game giải trí
lang: vi
draft: false
---

Ai cũng từng chơi qua một phiên bản nào đó của Breakout — thanh đỡ, quả bóng, một bức tường gạch. Đây là một trong những khuôn mẫu game chưa bao giờ thực sự biến mất, vì vòng lặp lõi của nó đơn giản là *hay*. Tôi không muốn làm lại nó từ đầu. Tôi muốn thêm đủ đồ chơi mới để lần chơi thứ năm ở một màn vẫn thấy khác lần đầu.

Đó chính là **Brick Breaker: Neon**.

---

## Vòng Lặp Lõi, Nhưng Nhiều Chuyện Xảy Ra Hơn

Chạm để bắn bóng ra khỏi thanh đỡ, trượt thanh đỡ để giữ bóng không rơi, phá hết gạch để hoàn thành màn. Phần đó không đổi. Cái đổi là những gì rơi ra từ viên gạch trong lúc bạn chơi: **sao** để tính điểm và tiến trình, một lượt **mở rộng thanh đỡ**, **+3 bóng** hoặc **nhân ba bóng** cùng lúc, một **bóng lửa** xuyên thẳng qua cả hàng gạch thay vì chỉ nảy ra, một **khiên chắn** cứu lấy quả bóng bạn sắp mất, **làm chậm thời gian** khi màn hình rối tung lên, và đôi khi là một **lượt chơi thưởng**.

Power-up rơi theo xác suất có trọng số, không phải lúc nào cũng có — một lượt chơi sạch sẽ, yên tĩnh và một lượt đầy bóng lửa với bóng nhân ba trên cùng một màn có thể trông hoàn toàn khác nhau.

## Màn Chơi Không Bao Giờ Hết

Neon Breaker đi kèm một bộ màn chơi được thiết kế sẵn, rồi tiếp tục nối dài: hết màn cuối cùng do tôi tự tay dựng, lưới chọn màn vẫn kéo dài thêm bằng các màn chơi sinh ngẫu nhiên, nên luôn có một màn tiếp theo thay vì một bức tường ghi chữ "hết rồi".

Mỗi màn vượt qua nhận được tối đa 3 sao tùy vào lượt chơi có "sạch" hay không, hiển thị ngay trên thẻ màn chơi để bạn biết ngay mình đã làm chủ màn nào và màn nào chỉ vừa đủ qua.

## Hệ Thống Lượt Chơi Chạy Theo Đồng Hồ, Không Chạy Theo Bạn

Hết cả 5 lượt chơi, thay vì một bức tường trả phí, bạn chỉ cần chờ — lượt chơi hồi dần theo thời gian chờ ngắn lại khi bạn còn ít lượt hơn (1, 3, 5, 7, 9 phút để hồi đầy trở lại). Không muốn chờ? Xem một đoạn quảng cáo ngắn có thưởng để nhận thêm một lượt và chơi tiếp. Thời gian offline cũng được tính: tắt app một tiếng, lượt chơi đã hồi sẵn khi bạn quay lại, không cần canh giờ.

## Kỷ Lục Cá Nhân Và Bảng Xếp Hạng Toàn Cầu

Bảng xếp hạng chia làm hai tab — kỷ lục cá nhân của bạn theo từng màn, và bảng xếp hạng toàn cầu so với tất cả người chơi khác. Đăng nhập bằng Google hoặc Apple để đưa tên mình lên bảng, hoặc giữ ẩn danh với hồ sơ khách và liên kết tài khoản sau mà không mất gì cả.

## Mười Ngôn Ngữ, Một Bản Cài Đặt Duy Nhất

Giao diện tự động nhận diện ngôn ngữ thiết bị ngay lần mở đầu tiên, với tiếng Anh, tiếng Việt, tiếng Nhật, tiếng Hàn, tiếng Trung, tiếng Tây Ban Nha, tiếng Pháp, tiếng Đức, tiếng Bồ Đào Nha và tiếng Nga đều có sẵn — đổi bất cứ lúc nào trong Cài đặt.

## Vì Sao Tôi Xây Dựng Nó Theo Cách Này

Vòng lặp lõi của Breakout không cần sửa. Thứ nó cần, với tôi, là một lý do để bạn muốn bắn thêm "một quả bóng nữa": đủ độ đa dạng power-up để không lượt chơi nào giống lượt nào, một hệ thống lượt chơi mà một lượt tệ không khóa bạn lại cả ngày, và những màn chơi không bao giờ thực sự hết để luôn có màn tiếp theo để thử.

---

## Dùng Thử Ngay

Brick Breaker: Neon sắp có mặt trên App Store. Không cần tài khoản để chơi — đăng nhập chỉ quan trọng nếu bạn muốn tên mình xuất hiện trên bảng xếp hạng.

Có bug cần báo hay tính năng muốn đề xuất? Thông tin liên hệ của tôi sẽ có trong màn hình Cài đặt của app. Tôi đọc mọi phản hồi gửi đến.
