---
lang: vi
title: "ArchiveBox/ArchiveBox: Giải Pháp Lưu Trữ Web Tự Lưu Trữ Tối Ưu"
description: "Khám phá ArchiveBox/ArchiveBox, công cụ mã nguồn mở tự lưu trữ để lưu trữ nội dung web, bao gồm HTML, PDF, phương tiện và hơn thế nữa. Hoàn hảo cho việc bảo quản dữ liệu."
published: 2025-09-14
tags: ['open-source', 'self-host', 'web-archiving', 'docker', 'python', 'data-preservation']
category: Self-hosted
author: minhpt
---

# ArchiveBox/ArchiveBox - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/ArchiveBox/ArchiveBox](https://github.com/ArchiveBox/ArchiveBox)
- **Sao:** 24824

## 2. Mô Tả Dự Án
ArchiveBox là một công cụ lưu trữ web mạnh mẽ, mã nguồn mở, tự lưu trữ được thiết kế để bảo quản nội dung web trong thời gian dài. Nó cho phép người dùng nhập URL, lịch sử trình duyệt, dấu trang hoặc dữ liệu từ các dịch vụ như Pocket và Pinboard, và lưu lại một bản chụp toàn diện bao gồm HTML, JavaScript, PDF, hình ảnh, video và các phương tiện khác. ArchiveBox đảm bảo bạn có một bản sao nội dung web cục bộ, có thể truy cập được, bảo vệ khỏi link rot và xóa nội dung.

## 3. Phần Mềm Này Thay Thế Những Gì?
ArchiveBox là giải pháp thay thế mạnh mẽ cho nhiều giải pháp lưu trữ thương mại và mã nguồn mở, bao gồm:
- Các dịch vụ thương mại như Archive.today và Perma.cc.
- Các công cụ lưu dựa trên trình duyệt như SingleFile hay Save Page WE.
- Các dịch vụ đánh dấu trang đám mây với khả năng lưu trữ hạn chế, như Pocket (phiên bản miễn phí) hoặc Evernote.
- Các tùy chọn tự lưu trữ khác như Wallabag, mặc dù ArchiveBox hỗ trợ nhiều định dạng phương tiện và phạm vi rộng hơn.

## 4. Chức Năng Chính
ArchiveBox nổi bật với các tính năng chính sau:
- **Lưu trữ đa định dạng:** Lưu nội dung ở nhiều định dạng, bao gồm WARC, PDF, ảnh chụp màn hình, DOM và tệp phương tiện.
- **Hỗ trợ đầu vào đa dạng:** Chấp nhận URL từ lịch sử trình duyệt, dấu trang, Pocket, Pinboard và hơn thế nữa.
- **Tự lưu trữ và Truy cập Ngoại tuyến:** Tất cả dữ liệu được lưu trữ cục bộ, đảm bảo quyền riêng tư và khả năng truy cập mà không phụ thuộc vào internet.
- **Lưu trữ Theo lịch và Tăng dần:** Cho phép lưu trữ tự động, định kỳ và cập nhật các kho lưu trữ hiện có.
- **Giao diện Tìm kiếm và Duyệt:** Cung cấp giao diện web thân thiện để tìm kiếm, xem và quản lý nội dung đã lưu trữ.
- **Khả năng Mở rộng:** Hỗ trợ plugin và các phương pháp lưu trữ tùy chỉnh cho các trường hợp sử dụng cụ thể.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- **Mã nguồn mở và Miễn phí:** Không có chi phí bản quyền, với sự minh bạch và hỗ trợ cộng đồng đầy đủ.
- **Lưu trữ Toàn diện:** Chụp được nhiều loại nội dung vượt xa HTML đơn thuần.
- **Quyền riêng tư khi Tự lưu trữ:** Dữ liệu người dùng vẫn được giữ riêng tư và dưới sự kiểm soát của họ.
- **Phát triển Tích cực:** Các bản cập nhật thường xuyên và cộng đồng ngày càng phát triển đảm bảo cải tiến liên tục.
- **Tương thích Đa nền tảng:** Hoạt động trên Linux, macOS và Windows, với hỗ trợ Docker giúp đơn giản hóa việc triển khai.

**Nhược điểm:**
- **Tốn nhiều Tài nguyên:** Lưu trữ số lượng lớn URL có thể yêu cầu dung lượng lưu trữ và sức mạnh xử lý đáng kể.
- **Đường cong Học tập Dốc:** Thiết lập và cấu hình ban đầu có thể khó khăn đối với người dùng không chuyên về kỹ thuật.
- **Phụ thuộc vào Công cụ Bên ngoài:** Dựa vào các công cụ như Chromium, wget và các công cụ khác, có thể cần bảo trì.
- **Lưu trữ Thời gian thực Hạn chế:** Thích hợp nhất cho nhu cầu lưu trữ theo lịch thay vì tức thời.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai ArchiveBox trên máy chủ Ubuntu:

### Yêu cầu:
- Ubuntu 20.04 trở lên.
- Docker và Docker Compose đã được cài đặt.
- Python 3.8+ (tùy chọn, cho thiết lập không dùng Docker).

### Cài đặt Từng bước với Docker (Khuyến nghị):
1. **Cập nhật Gói Hệ thống:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Cài đặt Docker và Docker Compose:**
   ```bash
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable docker && sudo systemctl start docker
   ```

3. **Tạo Thư mục cho ArchiveBox:**
   ```bash
   mkdir ~/archivebox && cd ~/archivebox
   ```

4. **Tải Tệp Docker Compose:**
   ```bash
   curl -O https://raw.githubusercontent.com/ArchiveBox/ArchiveBox/master/docker-compose.yml
   ```

5. **Khởi tạo và Khởi động ArchiveBox:**
   ```bash
   docker-compose run archivebox init --setup
   docker-compose up -d
   ```

6. **Truy cập Giao diện Web:**
   Mở trình duyệt và điều hướng đến `http://your-server-ip:8000` để truy cập giao diện ArchiveBox.

### Thêm URL vào Archive:
- Sử dụng giao diện web để thêm URL thủ công.
- Hoặc sử dụng dòng lệnh:
  ```bash
  docker-compose run archivebox add 'https://example.com'
  ```

### Tùy chọn: Cài đặt Không dùng Docker (Nâng cao):
Nếu bạn muốn thiết lập không dùng Docker, hãy đảm bảo Python 3.8+ đã được cài đặt, sau đó:
```bash
sudo apt install python3-pip python3-venv -y
python3 -m venv archivebox-env
source archivebox-env/bin/activate
pip install archivebox
archivebox init
archivebox manage createsuperuser
archivebox server 0.0.0.0:8000
```

### Mẹo Bảo trì:
- Cập nhật ArchiveBox thường xuyên: `docker-compose pull && docker-compose up -d`.
- Theo dõi dung lượng lưu trữ, vì kho lưu trữ có thể phát triển nhanh chóng.
- Sao lưu thư mục dữ liệu định kỳ.

Để biết thêm chi tiết, hãy tham khảo [tài liệu chính thức của ArchiveBox](https://github.com/ArchiveBox/ArchiveBox/wiki).