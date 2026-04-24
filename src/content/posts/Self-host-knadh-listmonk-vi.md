---
lang: vi
title: "knadh/listmonk: Giải Pháp Quản Lý Bản Tin Tự Lưu Trữ Tối Ưu"
description: "Khám phá knadh/listmonk, trình quản lý bản tin hiệu suất cao, tự lưu trữ với bảng điều khiển hiện đại. Giải pháp thay thế hoàn hảo cho Mailchimp và Sendy."
published: 2025-09-21
tags: ['open-source', 'self-host', 'newsletter', 'mailing-list', 'golang', 'postgresql', 'docker']
category: Self-hosted
author: minhpt
---

# knadh/listmonk - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/knadh/listmonk](https://github.com/knadh/listmonk)
- **Sao:** 17652

## 2. Mô Tả Dự Án
knadh/listmonk là một trình quản lý bản tin và danh sách gửi thư mã nguồn mở mạnh mẽ, được thiết kế cho hiệu suất cao và dễ sử dụng. Được xây dựng dưới dạng ứng dụng nhị phân đơn lẻ, nó cung cấp bảng điều khiển hiện đại, quản lý người đăng ký mạnh mẽ và phân tích chiến dịch toàn diện. Lý tưởng cho các nhà phát triển, nhà tiếp thị và tổ chức muốn kiểm soát hoàn toàn giao tiếp email của họ mà không phụ thuộc vào dịch vụ bên thứ ba.

## 3. Phần Mềm Này Thay Thế Những Gì?
listmonk là giải pháp thay thế hấp dẫn cho một số giải pháp thương mại và mã nguồn mở phổ biến, bao gồm:
- Mailchimp
- Sendy (tự lưu trữ)
- SendGrid (cho các tính năng bản tin cơ bản)
- Mailjet
- ConvertKit (cho các trường hợp sử dụng đơn giản hơn)

## 4. Chức Năng Chính
Các tính năng chính của listmonk bao gồm:
- **Quản lý Người đăng ký:** Nhập, phân khúc và quản lý người đăng ký với các thuộc tính tùy chỉnh.
- **Tạo Chiến dịch:** Thiết kế bản tin đáp ứng bằng trình chỉnh sửa tích hợp hoặc HTML.
- **Tự động hóa:** Lên lịch chiến dịch và thiết lập email kích hoạt.
- **Phân tích:** Theo dõi lượt mở, nhấp, trả lại và hủy đăng ký theo thời gian thực.
- **API & Webhook:** Mở rộng chức năng và tích hợp với các công cụ khác.
- **Mẫu:** Sử dụng mẫu thiết kế sẵn hoặc tạo mẫu tùy chỉnh.
- **Nhị phân Đơn lẻ:** Triển khai dễ dàng mà không có phụ thuộc phức tạp.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- **Tiết kiệm Chi phí:** Không có phí đăng ký; chỉ chi phí máy chủ.
- **Quyền riêng tư & Kiểm soát:** Toàn quyền sở hữu dữ liệu và tùy chỉnh tuân thủ.
- **Hiệu suất Cao:** Xử lý danh sách lớn và khối lượng gửi cao hiệu quả.
- **Giao diện Hiện đại:** Bảng điều khiển trực quan cho cả người dùng kỹ thuật và phi kỹ thuật.
- **Phát triển Tích cực:** Cập nhật thường xuyên và cộng đồng đang phát triển.

**Nhược điểm:**
- **Yêu cầu Tự lưu trữ:** Cần kỹ năng quản lý máy chủ.
- **Hỗ trợ Hạn chế:** Phụ thuộc vào diễn đàn cộng đồng thay vì hỗ trợ chuyên dụng.
- **Tính năng Nâng cao:** Có thể thiếu một số tự động hóa nâng cao so với giải pháp doanh nghiệp.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai listmonk trên máy chủ Ubuntu:

### Yêu cầu
- Ubuntu 20.04 trở lên
- Docker và Docker Compose đã được cài đặt
- PostgreSQL (phiên bản 12 trở lên)
- Có kiến thức cơ bản về terminal

### Bước 1: Cài đặt Docker và Docker Compose
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

### Bước 2: Sao chép Kho lưu trữ listmonk
```bash
git clone https://github.com/knadh/listmonk.git
cd listmonk
```

### Bước 3: Thiết lập PostgreSQL
Tạo cơ sở dữ liệu và người dùng PostgreSQL:
```bash
sudo -u postgres psql
CREATE DATABASE listmonk;
CREATE USER listmonk WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE listmonk TO listmonk;
\q
```

### Bước 4: Cấu hình Biến Môi trường
Chỉnh sửa tệp `config.toml` để cập nhật cài đặt cơ sở dữ liệu và SMTP:
```toml
[app]
address = "0.0.0.0:9000"

[database]
host = "localhost"
port = 5432
user = "listmonk"
password = "your_secure_password"
database = "listmonk"
```

### Bước 5: Chạy với Docker Compose
Sử dụng `docker-compose.yml` được cung cấp:
```bash
docker-compose up -d
```

### Bước 6: Truy cập listmonk
Mở trình duyệt và điều hướng đến `http://your_server_ip:9000`. Thông tin đăng nhập mặc định là:
- Tên đăng nhập: `listmonk`
- Mật khẩu: `listmonk`

Thay đổi chúng ngay sau lần đăng nhập đầu tiên.

### Bước 7: Cấu hình SMTP
Thiết lập máy chủ SMTP của bạn (ví dụ: Amazon SES, SendGrid hoặc Postfix cục bộ) trong bảng quản trị tại Cài đặt > SMTP.

Bạn đã sẵn sàng bắt đầu quản lý bản tin với listmonk! Để biết thêm tùy chỉnh, hãy tham khảo [tài liệu chính thức](https://listmonk.app/docs/).