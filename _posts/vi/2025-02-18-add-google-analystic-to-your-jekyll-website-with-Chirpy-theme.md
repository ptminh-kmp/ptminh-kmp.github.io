---
title: Thêm Google Analytics vào trang web Jekyll của bạn bằng theme Chirpy
description: >-
  Hãy cùng tìm hiểu cách thêm Google Analytics vào trang web Jekyll của bạn bằng theme Chirpy. Hướng dẫn này sẽ bao gồm mọi thứ từ việc thiết lập tài khoản Google Analytics đến xác minh mã theo dõi.
author: minhpt
date: 2025-02-18 23:00:00 +0700
categories: [Self-hosted, Blogging]
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted, google-analystic]
---

### Tạo tài khoản Google Analytics (nếu bạn chưa có)

* Truy cập [https://analytics.google.com/](https://www.google.com/search?q=https://analytics.google.com/)
    
* Nhấp vào "Start for free" (hoặc "Sign in" nếu bạn đã có tài khoản).
    
* Làm theo lời nhắc để tạo tài khoản. Bạn sẽ cần một tài khoản Google.
    

### Thiết lập Thuộc tính (Property) cho trang Jekyll của bạn

* Sau khi đăng nhập, bạn có thể sẽ được hướng dẫn qua quy trình thiết lập. Nếu không, nhấp vào "Admin" (biểu tượng bánh răng) ở dưới cùng bên trái.
    
* Trong cột "Account", chọn tài khoản phù hợp (hoặc tạo tài khoản mới).
    
* Trong cột "Property", nhấp vào "Create Property."
    
* Chọn "Web" làm nền tảng.
    
* Điền các chi tiết sau:
    
    * **Website name:** Tên blog của bạn (ví dụ: "My Jekyll Blog").
        
    * **Website URL:** URL blog của bạn (ví dụ: https://yourusername.github.io hoặc tên miền tùy chỉnh của bạn). Đảm bảo chọn https:// (hoặc http:// nếu trang của bạn sử dụng nó).
        
    * **Reporting Time Zone:** Chọn múi giờ của bạn.
        
    * **Currency:** Đơn vị tiền tệ ưa thích của bạn.
        
* Nhấp vào "Create."
    

### Lấy Tracking ID (Measurement ID) của bạn

* Sau khi tạo thuộc tính, bạn sẽ được đưa đến phần "Data Streams". Nhấp vào "Web" để cấu hình luồng dữ liệu cho trang web của bạn.
    
* Trên trang chi tiết Luồng web (Web stream details), bạn sẽ thấy một "Measurement ID" bắt đầu bằng G-. Đây là Tracking ID của bạn. Sao chép ID này. Bạn sẽ cần nó ngay sau đây.
  
### Thêm Tracking ID vào Trang Jekyll của bạn (Theme Chirpy)

Chirpy cung cấp một cách tích hợp Google Analytics đơn giản. Bạn thường sẽ thêm tracking ID vào tệp `_config.yml` của trang web.

* Mở `_config.yml`: Trong thư mục dự án Jekyll của bạn, mở tệp `_config.yml`.
    
* **Thêm Cấu hình Google Analytics:** Thêm các dòng sau vào tệp `_config.yml` của bạn, thay thế `G-XXXXXXXXXX` bằng Measurement ID thực tế của bạn:
    `google_analytics: G-XXXXXXXXXX`

* **Quan trọng đối với Chirpy:** Chirpy sử dụng trực tiếp cài đặt `google_analytics`. Bạn _không_ cần thêm bất kỳ đoạn mã nào khác vào tệp `_layouts/default.html` hoặc các tệp mẫu khác. Chirpy xử lý việc triển khai cho bạn.
    

### Build lại và Triển khai Trang Jekyll của bạn

* Chạy `bundle exec jekyll serve` (hoặc lệnh build Jekyll thông thường của bạn) để build lại trang web với các thay đổi.
    
* Triển khai trang web của bạn lên GitHub Pages (hoặc nơi bạn đang lưu trữ).
    

### Xác minh Mã Theo dõi

* **Truy cập trang web của bạn:** Mở blog của bạn trong trình duyệt web.
    
* **Sử dụng Báo cáo Thời gian thực của Google Analytics:** Quay lại trang tổng quan Google Analytics của bạn. Trong menu bên trái, dưới "Reports", nhấp vào "Realtime" -> "Overview."
    
* **Kiểm tra Hoạt động:** Khi bạn duyệt trang web của mình, bạn sẽ thấy hoạt động của mình trong báo cáo Thời gian thực. Điều này xác nhận rằng mã theo dõi đang hoạt động chính xác. Có thể mất vài phút để dữ liệu hiển thị.
    

### Khắc phục sự cố:

* **Không có dữ liệu hiển thị?**
    
    * Kiểm tra kỹ Measurement ID của bạn trong `_config.yml`. Đảm bảo đó là ID chính xác.
        
    * Đảm bảo bạn đã build lại và triển khai lại trang web sau khi thêm ID.
        
    * Xóa bộ nhớ cache và cookie của trình duyệt.
        
    * Hãy đợi một chút. Báo cáo thời gian thực thường nhanh chóng, nhưng dữ liệu khác có thể mất tới 24 giờ để xuất hiện.
        
    * Kiểm tra bảng điều khiển dành cho nhà phát triển của trình duyệt (thường được mở bằng cách nhấn F12) để tìm bất kỳ lỗi JavaScript nào liên quan đến Google Analytics.
        
* **Sự cố triển khai GitHub Pages?** Đảm bảo cài đặt GitHub Pages của bạn là chính xác và trang web của bạn đang build thành công.
    

### Những lưu ý quan trọng

* **Quyền riêng tư:** Hãy minh bạch với người dùng về việc bạn sử dụng Google Analytics. Cân nhắc thêm chính sách bảo mật vào trang web của bạn.
    
* **GDPR và các quy định khác:** Nhận thức và tuân thủ các quy định bảo mật dữ liệu có liên quan, chẳng hạn như GDPR. Bạn có thể cần định cấu hình Google Analytics để ẩn danh địa chỉ IP hoặc cung cấp cho người dùng các tùy chọn để từ chối theo dõi. Tham khảo tài liệu của Google Analytics để biết chi tiết về việc tuân thủ.
    
Bằng cách làm theo các bước này, bạn sẽ có thể tích hợp thành công Google Analytics vào blog Jekyll của mình bằng theme Chirpy và bắt đầu theo dõi lưu lượng truy cập trang web của bạn.
