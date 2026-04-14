---
title: Clear Debt & FIRE
description: Ứng dụng lập kế hoạch trả nợ và tính toán FIRE, xây dựng bằng Flutter từ đầu. Hành trình của tôi, toán học đằng sau, và lý do tôi nghĩ chúng thực sự hữu ích.
image: https://rustfs.minixium.com/minixium-blog-bucket/clear-debt-and-fire/app_icon.png
platform: Mobile App
type: Mobile
techStack:
  - flutter
  - Isar
  - Google Admob
status: Active
demo: ''
category: Mobile App
tags:
  - flutter
  - indie dev
  - tài chính cá nhân
  - FIRE
  - trả nợ
  - mobile app
lang: vi
draft: false
---

Ba năm trước, tôi đang nhìn chằm chằm vào một file Excel với sáu khoản nợ khác nhau ở bốn mức lãi suất khác nhau, cố tính xem nên trả cái nào trước.

Tôi Google "debt payoff app." Tìm được hàng chục kết quả. Tải về ba cái. Hai cái crash. Một cái chưa được cập nhật từ năm 2019 và có giao diện trông như được thiết kế từ thời... rất lâu rồi.

Vậy là tôi làm điều mà các developer hay làm: tự xây dựng cho mình.

Thí nghiệm đó trở thành ứng dụng — **Clear Debt & FIRE** — và khoảng tám tháng cuối tuần. Đây là toàn bộ câu chuyện.
    ---

## Vấn Đề Với Các Ứng Dụng Hiện Có

Tôi sẽ nói thẳng về lý do tôi nghĩ còn chỗ trống trong thị trường này.

Ứng dụng thống trị trong phân khúc này, **Mint**, đã đóng cửa đầu năm 2024, bỏ lại hàng triệu người dùng không có công cụ. Lựa chọn tiếp theo, **YNAB**, tốn $14.99/tháng — thực sự là khá nhiều tiền đối với ai đang vật lộn với nợ. Hầu hết các ứng dụng miễn phí còn lại hoặc bị nhồi nhét quảng cáo hoặc quá đơn giản đến mức gần như vô dụng.

Với FIRE calculator, tình hình còn tệ hơn. **FFCalc**, vốn miễn phí trong nhiều năm, gần đây đã khóa các tính năng cốt lõi sau paywall $2.99/tháng giữa chừng. Review của người dùng nói lên tất cả: _"Hai năm trước app có income input, interest rate, đủ hết. Giờ đòi $2.99/tháng. Thôi tôi tự làm spreadsheet."_

Thị trường cần thứ gì đó thành thật: tính năng cốt lõi miễn phí, không có dark pattern, không cần kết nối ngân hàng.

***

## ClearDebt — Kế Hoạch Trả Nợ Theo Cách Thực Sự Dễ Hiểu

### Nó Làm Gì

Bạn nhập các khoản nợ: tên, số dư, lãi suất, thanh toán tối thiểu. Vậy thôi. ClearDebt tính toán:

- **Ngày thoát nợ** — tháng và năm chính xác bạn sẽ trả hết
- **Tổng tiền lãi phải trả** — và bạn tiết kiệm được bao nhiêu với các chiến lược khác nhau
- **Chi tiết từng tháng** — phải trả bao nhiêu cho khoản nào, tháng này

### Cuộc Tranh Luận Snowball vs Avalanche

Đây là chỗ mà nhiều người có quan điểm rất cứng nhắc. Snowball (trả số dư nhỏ nhất trước) vs Avalanche (trả lãi suất cao nhất trước).

Đây là câu trả lời trung thực về mặt toán học: **Avalanche gần như luôn tiết kiệm tiền hơn.** Nhưng **Snowball có tỷ lệ hoàn thành cao hơn** trong các nghiên cứu thực tế, vì trả hết một khoản nợ nhỏ tạo ra chiến thắng tâm lý giúp mọi người duy trì động lực.

ClearDebt cho bạn thấy cả hai, song song, với con số thực:

```plain
Chiến lược  | Ngày thoát nợ | Tổng tiền lãi
Snowball    | Tháng 3/2028  | $4,847
Avalanche   | Tháng 1/2028  | $3,912
             ↑ Nhanh hơn 2 tháng, tiết kiệm $935
```

Bạn cũng có thể kéo slider để thêm khoản thanh toán hàng tháng và xem cả hai ngày cập nhật theo thời gian thực. Đó là "khoảnh khắc wow" — thấy rằng thêm $100/tháng cắt đi 14 tháng khỏi timeline của bạn.

### Chi Tiết Hàng Tháng

Tính năng tôi tự hào nhất là màn hình chi tiết hàng tháng. Nó trả lời câu hỏi mà tôi không thấy ứng dụng nào khác có thể trả lời rõ ràng:

> _"Tháng này tôi có 18 triệu để dồn vào nợ. Chính xác bao nhiêu đi về đâu?"_

Bạn thấy từng khoản nợ, khoản thanh toán tối thiểu là bao nhiêu, khoản nợ nào nhận được tiền thêm (dựa trên chiến lược bạn chọn), và số dư còn lại sau đó. Không còn mơ hồ.

### Phía Kỹ Thuật

ClearDebt được xây dựng bằng **Flutter**, nghĩa là một codebase cho cả iOS và Android. Engine tính toán là một vòng lặp Dart thuần túy — không cần thư viện toán học bên ngoài, chỉ cần:

```dart
while (balance > 0.01 && month < 360) {
  interest = balance × (apr / 100 / 12);
  payment = min(minPayment, balance + interest);
  balance = max(0, balance + interest - payment);
  // áp extra vào khoản nợ ưu tiên
  month++;
}
```

Đó là toàn bộ thuật toán amortization nợ. Phần còn lại là UI.

Dữ liệu được lưu bằng **Isar** (một database nhúng nhanh) — hoàn toàn trên thiết bị, không cần tài khoản, không có server.

***

## FIREpath — Điều Gì Sẽ Xảy Ra Nếu Bạn Nghỉ Hưu Ở Tuổi 42?

Phong trào FIRE — Financial Independence, Retire Early — có 2.4 triệu người theo dõi trên Reddit và đang tăng. Ý tưởng cốt lõi rất đơn giản:

> **Tiết kiệm và đầu tư đủ để lợi nhuận đầu tư trang trải chi phí sống mãi mãi.**

Quy tắc 4% nói: nếu bạn đầu tư 25 lần chi phí hàng năm, bạn có thể rút 4%/năm mãi mãi. Vậy nếu bạn tiêu $45,000/năm, bạn cần $1,125,000. Ở điểm đó, bạn có thể ngừng làm việc.

FIREpath giúp bạn tìm ra khi nào điều đó xảy ra với bạn.

### 6 Chế Độ FIRE

Đây là điều làm FIREpath khác với một máy tính đơn giản. Thực ra có sáu cách riêng biệt để tiếp cận FIRE:

| Chế độ | Ý nghĩa | Hệ số |
| --- | --- | --- |
| **Traditional** | Nghỉ hưu hoàn toàn, quy tắc 4% | 25× chi phí |
| **Lean FIRE** | Sống tối giản, nghỉ hưu sớm hơn | 20× chi phí |
| **Fat FIRE** | Nghỉ hưu thoải mái, dự phòng lớn hơn | 33× chi phí |
| **Barista FIRE** | Bán nghỉ hưu + làm part-time | Ít hơn — bạn bù đắp phần còn thiếu |
| **Coast FIRE** | Đã đầu tư đủ để "lướt" đến hưu trí | Thay đổi |
| **Slow FIRE** | Tỷ lệ tiết kiệm bình thường, không cực đoan | 25× chi phí |

App tính tất cả sáu cùng lúc và hiển thị so sánh trong một biểu đồ duy nhất.

### Coast FIRE Bị Đánh Giá Thấp

Tính năng yêu thích của tôi là **trình phát hiện Coast FIRE**. Rất nhiều người đã đạt Coast FIRE mà không biết.

Coast FIRE có nghĩa là: _"Tôi đã đầu tư đủ để, không cần thêm một đồng nào, lãi kép sẽ tăng danh mục đầu tư của tôi lên đến FIRE number vào tuổi nghỉ hưu."_

Nếu bạn 35 tuổi với $200,000 đã đầu tư và muốn nghỉ hưu ở 62, Coast number của bạn khoảng $169,000 (giả sử lợi nhuận hàng năm 7%). Bạn đã vượt qua nó rồi. Bạn thực sự có thể dừng đóng góp vào tài khoản hưu trí hôm nay.

FIREpath kiểm tra điều này tự động và gắn cờ nếu bạn đã vượt ngưỡng.

### Kịch Bản Giả Định

Màn hình what-if là nơi mọi người dành nhiều thời gian nhất. Ba thanh trượt:

- **Tỷ lệ tiết kiệm** — từ 10% đến 80%
- **Lợi nhuận hàng năm** — từ 3% (thận trọng) đến 12% (lạc quan)
- **Chi phí hàng năm** — tăng hoặc giảm

Mỗi thay đổi ngay lập tức cập nhật ngày FIRE của bạn. Insight làm hầu hết mọi người ngạc nhiên: **giảm chi phí có sức mạnh gấp đôi so với tăng thu nhập**, vì nó đồng thời giảm FIRE number VÀ tăng tỷ lệ tiết kiệm của bạn.

***

## Sự Kết Hợp Giữa Hai Ứng Dụng

Có một kết nối có chủ ý giữa hai ứng dụng. Hành trình người dùng tự nhiên là:

1. **Bắt đầu với ClearDebt** — xóa nợ, gần như luôn là bước tài chính tốt hơn so với đầu tư (khó đánh bại lãi suất thẻ tín dụng 20%)
2. **Khi đã hết nợ**, ClearDebt hiển thị gợi ý: _"Bạn vừa giải phóng $X/tháng. Xem khi nào bạn có thể FIRE →"_
3. **Chuyển sang FIREpath** — đưa số tiền thanh toán nợ đó vào đầu tư và xem ngày FIRE của bạn tăng tốc

Đó là hai chương của cùng một câu chuyện tài chính.

***

## Những Gì Tôi Sẽ Làm Khác Đi

**Bắt đầu với calculation engine, viết test trước.** Tôi mắc sai lầm khi xây dựng UI trước khi kiểm tra kỹ toán học. Tôi có một bug nhỏ trong logic amortization làm phồng khoản tiết kiệm lãi khoảng 3%. Không phát hiện ra cho đến khi một beta tester kiểm tra lại với spreadsheet.
**Ship xấu hơn, sớm hơn.** Version 1 dành quá nhiều thời gian trong chế độ polish. Không ai quan tâm đến micro-animation của một app họ chưa tải về.
**Keywords quan trọng hơn thiết kế cho khả năng tìm kiếm.** Tôi dành một cuối tuần cho description và keywords trên App Store sau khi launch. Số lượt tải tăng 40% tuần tiếp theo. App không thay đổi. Metadata thay đổi.

***

## Hãy Thử Chúng

**ClearDebt & FIRE** — Miễn phí trên [App Store](#) và [Google Play](#).

Cả hai ứng dụng hoạt động offline, không yêu cầu tài khoản và không chạm vào ngân hàng của bạn. Dữ liệu tài chính của bạn không bao giờ rời khỏi thiết bị.

Nếu bạn đang mang nợ hoặc tự hỏi khi nào có thể nghỉ hưu, tôi hy vọng chúng hữu ích. Và nếu bạn tìm thấy bug hoặc có yêu cầu tính năng, email của tôi có trong app.

***

    _Xây dựng với Flutter 3.19, Riverpod, Isar, fl_chart, và rất nhiều sáng Chủ nhật._
