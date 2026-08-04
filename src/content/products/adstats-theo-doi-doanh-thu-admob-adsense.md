---
title: "AdStats: Theo dõi Doanh thu"
tagline: "Doanh thu AdMob & AdSense của bạn, chỉ trong một cái nhìn."
description: "Theo dõi doanh thu Google AdMob và AdSense theo thời gian thực, ngay trên điện thoại. Dashboard trực tiếp, so sánh tăng trưởng, widget màn hình chính và chế độ riêng tư — dành cho developer và publisher."
image: "/images/adstats/icon.png"
screenshots:
  - "/images/adstats/screenshot-1.png"
  - "/images/adstats/screenshot-2.png"
  - "/images/adstats/screenshot-3.png"
platform: "iOS, Android"
type: "Mobile App"
techStack:
  - Flutter
  - Firebase Cloud Functions
  - Firestore
  - Hive
  - Google AdMob API
  - Google AdSense API
status: Active
demo: ""
appStoreUrl: "https://apps.apple.com/us/app/adstats-revenue-tracker/id6756091396"
playStoreUrl: "https://play.google.com/store/apps/details?id=com.minixium.adstats_app"
category: "Công cụ Developer"
tags:
  - flutter
  - admob
  - adsense
  - indie dev
  - kiếm tiền online
  - mobile app
  - google ads
lang: vi
draft: false
---

11 giờ đêm. Bạn nằm trên giường, mở app AdMob lên xem doanh thu hôm nay. Ba giây sau bạn đóng lại, mở trình duyệt để check AdSense, vì thu nhập của kênh YouTube đó lại nằm ở một nơi hoàn toàn khác. Hai app, hai lần đăng nhập, hai kiểu biểu đồ khác nhau, và không có một con số duy nhất nào trả lời được câu hỏi: "Tháng này mình đang kiếm được bao nhiêu?"

Tôi làm đúng việc đó mỗi tối. Nên tôi xây cái mà chính tôi muốn dùng: một dashboard duy nhất, cả hai nền tảng, số liệu thật, mất chưa đến ba mươi giây.

Đó chính là **AdStats**.

---

## AdStats Làm Được Gì

Bạn đăng nhập một lần bằng tài khoản Google — tài khoản đã liên kết với AdMob và AdSense của bạn — và AdStats gom tất cả về một màn hình duy nhất:

- **Hôm nay, Hôm qua, Tháng này, Tháng trước** — bốn con số bạn thực sự quan tâm, hiển thị ngay lập tức, không cần lục lọi menu
- **So sánh tăng trưởng** — mỗi kỳ tự động được so sánh với kỳ trước đó, bạn thấy ngay tỷ lệ phần trăm tăng/giảm, không chỉ một con số khô khan
- **Gộp AdMob + AdSense** — thu nhập từ app và thu nhập từ web/YouTube, hợp nhất thành một bức tranh chính xác thay vì hai app rời rạc
- **Chi tiết theo từng app/website** — biết chính xác app nào hay site nào đang gánh doanh thu tháng này
- **Biểu đồ hiệu suất** — Earnings, Ad Requests, Impressions, Match Rate, eCPM cho AdMob; Page Views, Page RPM, Clicks, CPC, CTR cho AdSense — lọc theo hôm nay, 7 ngày, 28 ngày, hoặc chọn khoảng ngày tùy ý

```plain
Hôm nay       $42.18   ↑ 12% so với hôm qua
Tháng này     $891.40  ↑ 8%  so với tháng trước
```

Đó là toàn bộ mô hình sử dụng. Không cần spreadsheet, không xuất file CSV, không chuyển qua chuyển lại giữa hai sản phẩm Google rõ ràng chưa từng được thiết kế để "nói chuyện" với nhau.

---

## Những Tính Năng Khiến Người Dùng Ở Lại

### Widget Màn Hình Chính

Dashboard thì tốt, nhưng widget mới là lý do mọi người thực sự giữ app lại. Thêm widget AdStats vào màn hình chính iOS hoặc Android, và doanh thu hôm nay/hôm qua cứ nằm đó, tự cập nhật mỗi 30 phút. Bạn check thu nhập giống như xem thời tiết — chỉ cần liếc mắt, không cần mở khóa máy.

### Thông Báo Đẩy Hàng Ngày

Mỗi sáng lúc 9:00 AM UTC, AdStats gửi thông báo tóm tắt doanh thu hôm qua. Bạn không cần mở app để biết kết quả — app tự tìm đến bạn.

### Chế Độ Riêng Tư

Đang check số liệu trên laptop ở quán cà phê, hay đưa điện thoại cho ai đó xem screenshot? Một chạm là mọi con số đô la trên màn hình bị làm mờ ngay. Không ai phía sau lưng bạn cần biết chiến lược kiếm tiền của bạn cả.

### Chỉ Dùng API Chính Thức

AdStats xác thực bằng Google OAuth thật và chỉ lấy dữ liệu qua API chính thức của AdMob và AdSense — đúng những API mà Google công khai cho mục đích này. Không scraping, không endpoint không chính thức, không có gì có thể âm thầm hỏng hay gây rủi ro cho tài khoản của bạn.

> AdStats không liên kết, không được xác nhận hay tài trợ bởi Google. Đây là một dashboard độc lập của bên thứ ba, xây dựng trên API công khai chính thức của Google.

---

## Dữ Liệu Của Bạn Thực Sự Nằm Ở Đâu

Điều này với tôi rất quan trọng, vì đó chính xác là điều tôi muốn biết trước khi đăng nhập bằng tài khoản Google của chính mình:

| | Chi tiết |
| --- | --- |
| **Đăng nhập** | Google OAuth — AdStats không bao giờ thấy hay lưu mật khẩu của bạn |
| **Cache trên máy** | Hive, ngay trên thiết bị, TTL 30 phút — mở lại tức thì, không chờ mạng |
| **Cache server** | Firestore, TTL 15 phút — chỉ để đổi thiết bị không phải chờ gọi lại API của Google |
| **Thu thập dữ liệu tài chính** | Không có. Số liệu doanh thu được lấy trực tiếp và cache tạm thời để tăng tốc — AdStats không xây hồ sơ từ doanh thu của bạn |

---

## Vì Sao Tôi Xây Dựng Nó Theo Cách Này

Tôi là kiểu developer check doanh thu thường xuyên hơn mức lành mạnh. Mỗi cú chạm thừa giữa "tôi muốn biết doanh thu" và "tôi đã biết doanh thu" đều là một cú chạm thừa. Nên cả app được thiết kế xoay quanh một nguyên tắc duy nhất: **con số bạn quan tâm không bao giờ nên cách quá một cái liếc mắt.**

Đó cũng là lý do widget xuất hiện gần như trước mọi thứ khác, và thông báo hàng ngày không đợi bạn tự mở app.

Bên dưới là một stack khá "nhàm chán" một cách có chủ đích: **Flutter** cho một codebase chạy cả iOS và Android, **Firebase Cloud Functions** đảm nhận việc gọi API Google thật sự ở phía server (để refresh token của bạn không bao giờ chạm vào server bên thứ ba nào khác ngoài Firebase), và cache hai lớp — **Hive** trên thiết bị, **Firestore** phía sau — để app luôn cảm giác tức thì kể cả khi API gốc không nhanh như vậy.

---

## Dùng Thử Ngay

**AdStats** miễn phí tải về trên cả hai nền tảng:

<div class="not-prose flex flex-wrap gap-3 my-6">
  <a href="https://play.google.com/store/apps/details?id=com.minixium.adstats_app" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:10px;border-radius:12px;background:#000;color:#fff;padding:10px 16px;text-decoration:none;font-weight:600;">
    ▶ Tải trên Google Play
  </a>
  <a href="https://apps.apple.com/us/app/adstats-revenue-tracker/id6756091396" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:10px;border-radius:12px;background:#000;color:#fff;padding:10px 16px;text-decoration:none;font-weight:600;">
     Tải trên App Store
  </a>
</div>

Nếu bạn là developer hay publisher đang chạy Google AdMob hoặc AdSense và đã chán việc mở hai app khác nhau chỉ để trả lời một câu hỏi đơn giản — hôm nay mình kiếm được bao nhiêu — hãy thử xem sao. Không tốn gì để biết cả.

Gặp bug hoặc có đề xuất tính năng? Email liên hệ của tôi có trong màn hình tài khoản của app. Tôi đọc mọi tin nhắn gửi đến.
