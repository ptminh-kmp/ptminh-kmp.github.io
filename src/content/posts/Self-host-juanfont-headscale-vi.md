---
lang: vi
title: "Headscale: Máy Chủ Điều Khiển Tailscale Tự Lưu Trữ Bạn Cần Năm 2025"
description: "Khám phá juanfont/headscale, giải pháp thay thế mã nguồn mở, tự lưu trữ cho máy chủ điều khiển của Tailscale. Tìm hiểu tính năng, cách cài đặt và lợi ích."
published: 2025-09-08
tags: ['open-source', 'self-host', 'vpn', 'wireguard', 'networking', 'devops']
category: Self-hosted
author: minhpt
---

# juanfont/headscale - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/juanfont/headscale](https://github.com/juanfont/headscale)
- **Sao:** 30667

## 2. Mô Tả Dự Án
Headscale là một bản triển khai mã nguồn mở, tự lưu trữ của máy chủ điều khiển Tailscale. Nó cho phép người dùng tạo và quản lý mạng riêng của riêng họ bằng ứng dụng khách Tailscale, mà không phụ thuộc vào cơ sở hạ tầng đám mây của Tailscale. Điều này cung cấp khả năng kiểm soát, quyền riêng tư và tùy chỉnh cao hơn cho các cá nhân và tổ chức muốn triển khai mạng lưới an toàn.

## 3. Phần Mềm Này Thay Thế Những Gì?
Headscale là giải pháp thay thế tự lưu trữ cho:
- Máy chủ điều khiển chính thức của Tailscale (phiên bản SaaS)
- Các giải pháp VPN thương mại như OpenVPN Access Server hoặc dịch vụ được quản lý của WireGuard
- Các giải pháp mạng lưới độc quyền khác yêu cầu phụ thuộc vào đám mây

## 4. Chức Năng Chính
Các tính năng chính của Headscale bao gồm:
- **Quản lý người dùng và máy:** Đăng ký và quản lý người dùng và thiết bị trong mạng của bạn.
- **Danh sách kiểm soát truy cập (ACL):** Xác định các chính sách chi tiết cho lưu lượng mạng.
- **Cấu hình DNS:** Tích hợp cài đặt DNS tùy chỉnh cho mạng riêng của bạn.
- **Hỗ trợ đa nền tảng:** Tương thích với ứng dụng khách Tailscale trên Linux, macOS, Windows, iOS và Android.
- **Điều khiển qua API:** Cung cấp REST API để tự động hóa và tích hợp với các công cụ khác.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- Toàn quyền kiểm soát cơ sở hạ tầng mạng của bạn.
- Quyền riêng tư được nâng cao vì không có dữ liệu nào được gửi đến máy chủ bên thứ ba.
- Tiết kiệm chi phí cho các tổ chức có nhiều thiết bị.
- Cộng đồng mã nguồn mở tích cực với các bản cập nhật thường xuyên.

**Nhược điểm:**
- Yêu cầu kiến thức kỹ thuật để thiết lập và bảo trì.
- Trách nhiệm tự lưu trữ bao gồm bảo mật, cập nhật và sao lưu.
- Thiếu một số tính năng doanh nghiệp có trong các gói trả phí của Tailscale.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai Headscale trên máy chủ Ubuntu:

### Yêu cầu
- Ubuntu 22.04 LTS trở lên
- Docker và Docker Compose đã được cài đặt
- Tên miền trỏ đến IP máy chủ của bạn (tùy chọn nhưng khuyến nghị cho HTTPS)

### Bước 1: Cài đặt Docker và Docker Compose
```bash
sudo apt update && sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

### Bước 2: Tạo Thư mục cho Headscale
```bash
mkdir headscale && cd headscale
```

### Bước 3: Tạo Tệp Docker Compose
Tạo một tệp `docker-compose.yml` với nội dung sau:

```yaml
version: '3.8'
services:
  headscale:
    image: headscale/headscale:latest
    container_name: headscale
    volumes:
      - ./config:/etc/headscale
      - ./data:/var/lib/headscale
    ports:
      - "8080:8080"
    restart: unless-stopped
```

### Bước 4: Tạo Cấu hình
```bash
docker run --rm -it -v $(pwd)/config:/etc/headscale headscale/headscale:latest generate
```

### Bước 5: Chỉnh sửa Cấu hình
Chỉnh sửa `config/config.yaml` để đặt URL máy chủ và các tùy chọn khác. Ví dụ:
```yaml
server_url: http://your-domain.com:8080
```

### Bước 6: Khởi động Headscale
```bash
docker-compose up -d
```

### Bước 7: Tạo Người dùng và Khóa Pre-Auth
```bash
docker exec headscale headscale users create myuser
docker exec headscale headscale preauthkeys create --user myuser --reusable --expiration 24h
```

### Bước 8: Kết nối Ứng dụng khách
Sử dụng khóa pre-auth để kết nối ứng dụng khách Tailscale với máy chủ Headscale của bạn. Ví dụ, trên Linux:
```bash
tailscale up --login-server=http://your-server-ip:8080 --authkey=YOUR_AUTH_KEY
```

Phiên bản Headscale tự lưu trữ của bạn hiện đang chạy! Đối với các cấu hình nâng cao, như HTTPS hoặc thiết lập cơ sở dữ liệu, hãy tham khảo [tài liệu chính thức](https://github.com/juanfont/headscale).