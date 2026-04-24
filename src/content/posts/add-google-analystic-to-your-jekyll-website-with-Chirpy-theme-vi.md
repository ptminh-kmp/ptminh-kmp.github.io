---
lang: vi
title: Thêm Google Analytics vào Trang Jekyll của bạn sử dụng theme Chirpy
description: >-
  Hãy cùng tìm hiểu cách thêm Google Analytics vào trang Jekyll của bạn với theme Chirpy. Hướng dẫn này sẽ bao gồm mọi thứ từ thiết lập tài khoản Google Analytics đến xác minh mã theo dõi.
author: minhpt
published: 2025-02-18
category: Self-hosted
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted, google-analystic]
---

### Tạo Tài Khoản Google Analytics (nếu bạn chưa có)

* Truy cập [https://analytics.google.com/](https://www.google.com/search?q=https://analytics.google.com/)

* Nhấp "Bắt đầu miễn phí" (hoặc "Đăng nhập" nếu bạn đã có tài khoản).

* Làm theo hướng dẫn để tạo tài khoản. Bạn sẽ cần một tài khoản Google.

### Thiết lập Property cho Trang Jekyll của Bạn

* Sau khi đăng nhập, bạn sẽ được hướng dẫn qua quy trình thiết lập. Nếu không, nhấp "Admin" (biểu tượng bánh răng) ở góc dưới bên trái.

* Trong cột "Account", chọn tài khoản phù hợp (hoặc tạo tài khoản mới).

* Trong cột "Property", nhấp "Create Property."

* Chọn "Web" làm nền tảng.

* Điền các thông tin sau:

  * **Tên trang web:** Tên blog của bạn (ví dụ: "Blog Jekyll Của Tôi").

  * **URL trang web:** URL blog của bạn (ví dụ: <https://yourusername.github.io> hoặc tên miền tùy chỉnh của bạn). Đảm bảo chọn https:// (hoặc http:// nếu trang của bạn sử dụng nó).

  * **Múi giờ Báo cáo:** Chọn múi giờ của bạn.

  * **Tiền tệ:** Đơn vị tiền tệ ưa thích của bạn.

* Nhấp "Create."

### Lấy ID Theo Dõi (Measurement ID)

* Sau khi tạo property, bạn sẽ được đưa đến phần "Data Streams". Nhấp vào "Web" để cấu hình luồng dữ liệu cho trang web của bạn.

* Trên trang chi tiết luồng web, bạn sẽ thấy "Measurement ID" bắt đầu bằng G-. Đây là ID Theo dõi của bạn. Sao chép ID này. Bạn sẽ cần nó ngay sau đây.
  
### Thêm ID Theo Dõi vào Trang Jekyll của Bạn (Theme Chirpy)

Chirpy cung cấp cách tích hợp Google Analytics đơn giản. Bạn thường sẽ thêm ID theo dõi vào tệp \_config.yml của trang.

* Mở \_config.yml: Trong thư mục dự án Jekyll của bạn, mở tệp \_config.yml.

* **Thêm Cấu hình Google Analytics:** Thêm các dòng sau vào tệp \_config.yml của bạn, thay thế G-XXXXXXXXXX bằng Measurement ID thực tế của bạn:
    `google_analytics: G-XXXXXXXXXX`

* **Quan trọng với Chirpy:** Chirpy sử dụng trực tiếp cài đặt google\_analytics. Bạn _không_ cần thêm bất kỳ đoạn mã nào khác vào \_layouts/default.html hoặc các tệp mẫu khác. Chirpy xử lý việc triển khai cho bạn.

### Xây dựng Lại và Triển khai Trang Jekyll

* Chạy bundle exec jekyll serve (hoặc lệnh xây dựng Jekyll thông thường của bạn) để xây dựng lại trang với các thay đổi.

* Triển khai trang của bạn lên GitHub Pages (hoặc bất kỳ nơi nào bạn đang lưu trữ).

### Xác Minh Mã Theo Dõi

* **Truy cập trang web của bạn:** Mở blog của bạn trong trình duyệt web.

* **Sử dụng Báo cáo Thời gian thực của Google Analytics:** Quay lại bảng điều khiển Google Analytics của bạn. Trong menu bên trái, dưới "Reports," nhấp vào "Realtime" -> "Overview."

* **Kiểm tra Hoạt động:** Khi bạn duyệt trang web của mình, bạn sẽ thấy hoạt động của mình trong báo cáo Thời gian thực. Điều này xác nhận mã theo dõi đang hoạt động chính xác. Có thể mất vài phút để dữ liệu hiển thị.

### Khắc phục Sự cố

* **Không có dữ liệu hiển thị?**

  * Kiểm tra kỹ Measurement ID của bạn trong \_config.yml. Đảm bảo đó là ID chính xác.

  * Đảm bảo bạn đã xây dựng lại và triển khai lại trang sau khi thêm ID.

  * Xóa bộ nhớ cache và cookie của trình duyệt.

  * Chờ một chút. Báo cáo thời gian thực thường nhanh, nhưng dữ liệu khác có thể mất đến 24 giờ để xuất hiện.

  * Kiểm tra bảng điều khiển nhà phát triển của trình duyệt (thường mở bằng phím F12) để tìm bất kỳ lỗi JavaScript nào liên quan đến Google Analytics.

* **Sự cố triển khai GitHub Pages?** Đảm bảo cài đặt GitHub Pages của bạn đúng và trang web đang xây dựng thành công.

### Những Lưu Ý Quan Trọng

* **Quyền riêng tư:** Hãy minh bạch với người dùng về việc bạn sử dụng Google Analytics. Cân nhắc thêm chính sách quyền riêng tư vào trang web của bạn.

* **GDPR và các quy định khác:** Nhận thức và tuân thủ các quy định về quyền riêng tư dữ liệu có liên quan, chẳng hạn như GDPR. Bạn có thể cần cấu hình Google Analytics để ẩn danh địa chỉ IP hoặc cung cấp cho người dùng tùy chọn từ chối theo dõi. Tham khảo tài liệu của Google Analytics để biết chi tiết tuân thủ.

Bằng cách làm theo các bước này, bạn sẽ có thể tích hợp thành công Google Analytics vào blog Jekyll của mình bằng theme Chirpy và bắt đầu theo dõi lưu lượng truy cập trang web.