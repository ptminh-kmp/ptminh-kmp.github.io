---
lang: vi
title: "TabbyML/tabby: Hướng Dẫn Toàn Diện Về Trợ Lý Lập Trình AI Tự Lưu Trữ"
description: "Khám phá TabbyML/tabby, trợ lý lập trình AI mã nguồn mở, tự lưu trữ với 31.998 sao GitHub. Tìm hiểu cách triển khai và sử dụng như một giải pháp thay thế cho các công cụ thương mại."
published: 2025-09-06
tags: ['open-source', 'self-host', 'AI', 'coding-assistant', 'Docker', 'machine-learning']
category: Self-hosted
author: minhpt
---

# TabbyML/tabby - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/TabbyML/tabby](https://github.com/TabbyML/tabby)
- **Sao:** 31998

## 2. Mô Tả Dự Án

TabbyML/tabby là một trợ lý lập trình AI mã nguồn mở, tự lưu trữ được thiết kế để cung cấp tính năng tự động hoàn thành mã, gợi ý và hỗ trợ theo ngữ cảnh trực tiếp trong môi trường phát triển của bạn. Nó tận dụng các mô hình học máy để hiểu các mẫu mã và cung cấp hỗ trợ thời gian thực, khiến nó trở thành một công cụ mạnh mẽ cho các nhà phát triển muốn nâng cao năng suất mà không phụ thuộc vào các dịch vụ đám mây.

## 3. Phần Mềm Này Thay Thế Những Gì?

TabbyML/tabby là giải pháp thay thế hấp dẫn cho một số trợ lý lập trình AI thương mại và độc quyền, bao gồm:

- GitHub Copilot
- Tabnine (phiên bản Pro/Enterprise)
- Amazon CodeWhisperer
- JetBrains AI Assistant

Bằng cách cung cấp giải pháp tự lưu trữ, nó mang lại khả năng kiểm soát tốt hơn đối với quyền riêng tư dữ liệu, tùy chỉnh và quản lý chi phí so với các dịch vụ đăng ký này.

## 4. Chức Năng Chính

Các tính năng chính của TabbyML/tabby bao gồm:

- **Hoàn thành Mã:** Gợi ý nhạy ngữ cảnh cho các đoạn mã, hàm và biến.
- **Hỗ trợ Đa Ngôn ngữ:** Tương thích với các ngôn ngữ lập trình phổ biến như Python, JavaScript, TypeScript, Java và hơn thế nữa.
- **Huấn luyện Mô hình Tùy chỉnh:** Khả năng tinh chỉnh mô hình trên cơ sở mã của bạn để được hỗ trợ cá nhân hóa.
- **Tích hợp IDE:** Hoạt động với các trình soạn thảo mã chính như VS Code, IntelliJ và các trình khác thông qua tiện ích mở rộng.
- **Quyền riêng tư Trước hết:** Tất cả quá trình xử lý diễn ra trên cơ sở hạ tầng của bạn, đảm bảo mã không bao giờ rời khỏi môi trường của bạn.
- **Kiến trúc Mở rộng:** Hỗ trợ plugin và cấu hình tùy chỉnh cho quy trình làm việc phù hợp.

## 5. Ưu và Nhược Điểm

**Ưu điểm:**
- **Quyền riêng tư Dữ liệu:** Bản chất tự lưu trữ đảm bảo kiểm soát hoàn toàn mã và dữ liệu của bạn.
- **Tiết kiệm Chi phí:** Không có phí đăng ký định kỳ; chi phí thiết lập một lần.
- **Tùy chỉnh:** Tinh chỉnh mô hình để phù hợp với cơ sở mã và phong cách lập trình của bạn.
- **Mã nguồn Mở:** Cải tiến do cộng đồng thúc đẩy và minh bạch.
- **Khả năng Ngoại tuyến:** Hoạt động mà không cần kết nối internet sau khi đã triển khai.

**Nhược điểm:**
- **Độ phức tạp Thiết lập Ban đầu:** Yêu cầu kiến thức kỹ thuật để triển khai và bảo trì.
- **Tốn nhiều Tài nguyên:** Có thể yêu cầu tài nguyên tính toán đáng kể cho suy luận và huấn luyện mô hình.
- **Hiệu suất Tiêu chuẩn Hạn chế:** Có thể cần tinh chỉnh tùy chỉnh để đạt kết quả tối ưu so với các đối thủ đám mây.
- **Hỗ trợ Cộng đồng:** Mặc dù đang phát triển, nhưng có thể không sánh bằng hỗ trợ tức thời của các lựa chọn thương mại.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

Thực hiện theo các bước sau để triển khai TabbyML/tabby trên máy chủ Ubuntu:

### Yêu cầu:
- Ubuntu 20.04 trở lên
- Docker và Docker Compose đã được cài đặt
- Ít nhất 8GB RAM (khuyến nghị 16GB cho hiệu suất tốt hơn)
- Đủ dung lượng lưu trữ cho các tệp mô hình (thay đổi tùy theo kích thước mô hình)

### Cài đặt Từng bước:

1. **Cập nhật Gói Hệ thống:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Cài đặt Docker và Docker Compose:**
   ```bash
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

3. **Tạo Thư mục cho Tabby:**
   ```bash
   mkdir tabby && cd tabby
   ```

4. **Tạo Tệp Docker Compose:**
   Tạo một tệp `docker-compose.yml` với nội dung sau:
   ```yaml
   version: '3.8'

   services:
     tabby:
       image: tabbyml/tabby:latest
       container_name: tabby
       ports:
         - "8080:8080"
       volumes:
         - ./data:/data
       environment:
         - TABBY_HOST=0.0.0.0
       restart: unless-stopped
   ```

5. **Triển khai Tabby:**
   ```bash
   sudo docker-compose up -d
   ```

6. **Xác minh Cài đặt:**
   Kiểm tra xem container có đang chạy không:
   ```bash
   sudo docker ps
   ```
   Truy cập dịch vụ tại `http://your-server-ip:8080` trong trình duyệt của bạn.

7. **Cấu hình IDE của Bạn:**
   Cài đặt tiện ích mở rộng Tabby trong trình soạn thảo mã ưa thích của bạn (ví dụ: VS Code) và trỏ nó đến IP và cổng của máy chủ.

8. **Tải Mô hình (Tùy chọn):**
   Tabby sẽ tải các mô hình mặc định khi chạy lần đầu. Đối với mô hình tùy chỉnh, hãy tham khảo [tài liệu chính thức](https://github.com/TabbyML/tabby).

### Mẹo Khắc phục Sự cố:
- Đảm bảo cổng 8080 được mở trong tường lửa của bạn.
- Kiểm tra nhật ký Docker để tìm lỗi: `sudo docker logs tabby`
- Phân bổ thêm tài nguyên nếu gặp vấn đề về hiệu suất.

Đối với các cấu hình nâng cao và tinh chỉnh mô hình, hãy truy cập [kho lưu trữ GitHub TabbyML/tabby](https://github.com/TabbyML/tabby).