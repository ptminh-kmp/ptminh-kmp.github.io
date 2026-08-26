---
title: "Knotweave"
tagline: "Nối từng con số, lấp đầy toàn bộ ô lưới."
description: "Trò chơi giải đố nối số tối giản: nối các con số theo đúng thứ tự bằng một đường đi liền mạch, đi qua tất cả các ô. Hàng trăm màn chơi, Thử thách hàng ngày, bảng xếp hạng toàn cầu và giao diện có thể mở khóa."
image: "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/icon.png"
screenshots:
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/home.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/select-stage.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/gameplay.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/shop.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/daily-challenge.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/win.jpg"
platform: "iOS, Android"
type: "Mobile Game"
techStack:
  - Flutter
  - Provider
  - Firebase Auth
  - Cloud Firestore
  - Firebase Cloud Messaging
  - Cloud Functions
  - Supabase
  - Google AdMob
  - Google Sign-In
status: "Android (iOS sắp ra mắt)"
demo: ""
appStoreUrl: "https://apps.apple.com/app/id6752108828"
playStoreUrl: "https://play.google.com/store/apps/details?id=com.minixium.zip_game"
category: "Games"
tags:
  - puzzle
  - numberlink
  - flutter
  - indie dev
  - mobile game
  - brain training
  - daily challenge
lang: vi
draft: false
---

Hầu hết các trò chơi "nối số" tôi từng chơi đều có chung một vấn đề: ngay khi bạn nối xong các con số theo thứ tự, game đã tính là thắng — dù một nửa bàn cờ vẫn còn trống. Với tôi, đó luôn là một câu đố chưa hoàn chỉnh. Vậy nên tôi làm một trò chơi mà điều đó không được phép xảy ra.

Đó chính là **Knotweave**.

---

## Luật chơi duy nhất

Kéo từ ô **1** sang **2**, rồi **3**, cứ thế tiếp tục — nhưng đường đi của bạn phải đi qua *toàn bộ từng ô* trên bảng lưới thì mới được tính là hoàn thành. Không được bỏ sót ô trống nào, không có đường tắt. Các bức tường giữa một số ô buộc bạn phải đi vòng, và đó chính là lúc câu đố thực sự bắt đầu: những màn chơi sau không khó vì bảng lưới lớn, mà vì thường chỉ có đúng một đường đi khả thi.

## Hàng trăm màn chơi, ba mức độ

Các màn chơi được chia thành ba nhánh **Dễ**, **Trung bình** và **Khó**, mỗi nhánh có tiến trình riêng. Hoàn thành gọn gàng một màn để nhận tối đa **3 sao**; nếu bị kẹt, hệ thống gợi ý tích hợp sẽ chỉ cho bạn nước đi đúng tiếp theo — chỉ cần dùng một sao trong game để kích hoạt, nên gợi ý luôn sẵn sàng mà không cần tốn tiền thật.

## Một câu đố mới mỗi ngày

**Thử thách hàng ngày** mang đến cho tất cả người chơi cùng một câu đố mới mỗi ngày, chia theo cả ba mức độ, với bảng xếp hạng riêng tách biệt khỏi bảng xếp hạng thông thường. Hoàn thành trước khi đồng hồ reset và xem thời gian của bạn so với những người chơi khác hôm nay ra sao.

## Leo hạng trên bảng xếp hạng

Đăng nhập để thời gian tốt nhất của bạn được tính vào **Top 100 toàn cầu**, xếp hạng theo tổng số sao tích lũy. Bạn hoàn toàn có thể chơi mà không cần tài khoản — việc đăng nhập chỉ cần thiết khi bạn muốn tên mình xuất hiện trên bảng xếp hạng.

## Làm mới giao diện bảng lưới

**Cửa hàng** trong game mở khóa các theme hình ảnh khác nhau cho bảng lưới — Lửa, Dung nham, Tuyết, Rừng và nhiều hơn nữa — để câu đố mà bạn đang nhìn lần thứ năm liên tiếp ít nhất cũng có diện mạo khác đi mỗi lần.

## Thiết kế để không làm phiền bạn

Giao diện tươi sáng, nhiều màu sắc và mở nhanh — không hướng dẫn bắt buộc, không yêu cầu đăng nhập ngay từ đầu. Đăng nhập bằng Google, bằng Apple, hoặc chơi ẩn danh với tư cách khách và liên kết tài khoản sau mà không mất tiến trình. Bật nhắc nhở hàng ngày nếu muốn được thông báo khi có thử thách mới, hoặc tắt hoàn toàn thông báo nếu không thích. Hỗ trợ Tiếng Việt và Tiếng Anh.

## Vì sao tôi làm như vậy

Phần lớn các game "numberlink" cho phép bạn thắng ngay khi các con số được nối xong, coi những ô trống chỉ là trang trí. Tôi muốn những ô trống đó phải có ý nghĩa — một câu đố chưa xong khi vẫn còn ô nào đó chưa được tính đến. Mọi thứ khác — hệ thống độ khó, thử thách hàng ngày, các theme — đều tồn tại để cho bạn một lý do quay lại chơi tiếp vào ngày mai.

---

## Trải nghiệm ngay

Knotweave đã có mặt trên [Google Play](https://play.google.com/store/apps/details?id=com.minixium.zip_game), phiên bản iOS sẽ sớm ra mắt trên App Store. Không cần tài khoản để chơi — chỉ cần mở ứng dụng và bắt đầu nối số.

Phát hiện lỗi hay có ý tưởng cho màn chơi mới? Thông tin liên hệ của tôi có trong màn hình Cài đặt của ứng dụng. Tôi đọc tất cả phản hồi.
