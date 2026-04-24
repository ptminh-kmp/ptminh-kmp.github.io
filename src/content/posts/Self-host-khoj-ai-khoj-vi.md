---
lang: vi
title: "Khoj AI: Bộ Não Thứ Hai AI Tự Lưu Trữ Của Bạn - Đánh Giá Hoàn Chỉnh"
description: "Khám phá Khoj AI, trợ lý AI mã nguồn mở, tự lưu trữ hoạt động như bộ não thứ hai của bạn, cung cấp khả năng tìm kiếm web và tài liệu, tự động hóa và nghiên cứu chuyên sâu."
published: 2025-09-07
tags: ['open-source', 'self-host', 'ai', 'llm', 'automation', 'docker', 'python', 'privacy']
category: Self-hosted
author: minhpt
---

# khoj-ai/khoj - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- **Sao:** 30783

## 2. Mô Tả Dự Án
Khoj AI là một trợ lý AI mã nguồn mở, tự lưu trữ được thiết kế để hoạt động như "bộ não thứ hai" của bạn. Nó cho phép người dùng truy vấn thông tin từ web hoặc tài liệu cá nhân của họ, xây dựng các tác nhân AI tùy chỉnh, lên lịch tự động hóa và thực hiện nghiên cứu chuyên sâu. Khoj hỗ trợ tích hợp với nhiều LLM cục bộ và trực tuyến, bao gồm GPT, Claude, Gemini, Llama, Qwen và Mistral, khiến nó trở thành giải pháp thay thế linh hoạt và tập trung vào quyền riêng tư cho các công cụ AI thương mại.

## 3. Phần Mềm Này Thay Thế Những Gì?
Khoj AI là giải pháp thay thế mạnh mẽ cho một số công cụ AI thương mại và độc quyền, bao gồm:
- Notion AI
- Evernote với các tính năng AI
- ChatGPT Plus (cho các truy vấn được cá nhân hóa, dựa trên tài liệu)
- Các nền tảng tự động hóa thương mại như Zapier (cho quy trình làm việc dựa trên AI)
- Các công cụ nghiên cứu và quản lý kiến thức độc quyền

## 4. Chức Năng Chính
Khoj AI cung cấp một bộ tính năng mạnh mẽ:
- **Tìm kiếm Tài liệu:** Lập chỉ mục và truy vấn các tài liệu cá nhân của bạn (PDF, markdown, tệp văn bản) để có câu trả lời nhanh chóng.
- **Tích hợp Tìm kiếm Web:** Tìm nạp và tóm tắt thông tin từ web trực tiếp.
- **Tác nhân AI Tùy chỉnh:** Xây dựng và triển khai các tác nhân AI phù hợp cho các nhiệm vụ cụ thể.
- **Lập lịch Tự động hóa:** Thiết lập các tác vụ và quy trình làm việc tự động.
- **Hỗ trợ Đa LLM:** Sử dụng nhiều LLM khác nhau, cả cục bộ và đám mây, đảm bảo tính linh hoạt và quyền riêng tư.
- **Triển khai Tự lưu trữ:** Toàn quyền kiểm soát dữ liệu và cơ sở hạ tầng của bạn.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- **Tập trung vào Quyền riêng tư:** Bản chất tự lưu trữ đảm bảo dữ liệu của bạn vẫn được riêng tư.
- **Hỗ trợ LLM Linh hoạt:** Tương thích với nhiều mô hình AI, cả mã nguồn mở và độc quyền.
- **Tùy chỉnh:** Có thể thích ứng cao cho sử dụng cá nhân hoặc tổ chức.
- **Tiết kiệm Chi phí:** Miễn phí sử dụng và triển khai, tránh phí đăng ký.
- **Cộng đồng Tích cực:** Sự hiện diện mạnh mẽ trên GitHub với phát triển và hỗ trợ liên tục.

**Nhược điểm:**
- **Rào cản Kỹ thuật:** Yêu cầu một số kiến thức kỹ thuật để thiết lập và bảo trì.
- **Tốn nhiều Tài nguyên:** Chạy LLM cục bộ có thể yêu cầu tài nguyên tính toán đáng kể.
- **Tích hợp Sẵn có Hạn chế:** So với các công cụ thương mại, có thể yêu cầu cấu hình thủ công cho một số quy trình làm việc nhất định.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để tự lưu trữ Khoj AI trên máy chủ Ubuntu:

### Yêu cầu
- Ubuntu 22.04 LTS trở lên
- Docker và Docker Compose đã được cài đặt
- Python 3.8+ (nếu tùy chỉnh ngoài Docker)
- Ít nhất 8GB RAM (khuyến nghị 16GB+ cho LLM cục bộ)

### Cài đặt Từng bước
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

3. **Sao chép Kho lưu trữ Khoj:**
   ```bash
   git clone https://github.com/khoj-ai/khoj.git
   cd khoj
   ```

4. **Cấu hình Biến Môi trường:**
   Tạo tệp `.env` trong thư mục gốc của dự án và đặt các biến cần thiết (ví dụ: khóa API cho LLM, đường dẫn lưu trữ):
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Xây dựng và Khởi động với Docker Compose:**
   ```bash
   docker-compose up -d
   ```

6. **Truy cập Khoj AI:**
   Mở trình duyệt và điều hướng đến `http://your-server-ip:8000` để truy cập giao diện Khoj.

7. **Tùy chọn: Thiết lập Reverse Proxy (cho sản xuất):**
   Sử dụng Nginx hoặc Traefik để proxy yêu cầu và kích hoạt HTTPS.

Đối với các cấu hình nâng cao, như tích hợp LLM cụ thể hoặc thiết lập tự động hóa, hãy tham khảo [tài liệu chính thức](https://github.com/khoj-ai/khoj).