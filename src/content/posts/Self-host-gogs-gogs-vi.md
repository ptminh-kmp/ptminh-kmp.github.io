---
lang: vi
title: "Gogs: Dịch Vụ Git Tự Lưu Trữ Tối Ưu - Hướng Dẫn Hoàn Chỉnh"
description: "Khám phá Gogs, dịch vụ Git tự lưu trữ nhẹ nhàng, dễ dàng. Tìm hiểu cách triển khai, tính năng, ưu nhược điểm và tại sao nó là giải pháp thay thế hàng đầu cho GitHub."
published: 2025-08-31
tags: ['open-source', 'self-host', 'git', 'golang', 'docker', 'devops']
category: Self-hosted
author: minhpt
---

# gogs/gogs - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/gogs/gogs](https://github.com/gogs/gogs)
- **Sao:** 46802

## 2. Mô Tả Dự Án

Gogs (Go Git Service) là một dịch vụ Git mã nguồn mở, tự lưu trữ được viết bằng Go. Nó cung cấp giải pháp thay thế nhẹ, nhanh và thân thiện với người dùng cho các nền tảng như GitHub và GitLab, với mức sử dụng tài nguyên tối thiểu. Được thiết kế cho sự đơn giản và dễ sử dụng, Gogs cung cấp các công cụ quản lý kho lưu trữ Git, theo dõi vấn đề và cộng tác thiết yếu mà không có sự phức tạp hoặc chi phí của các giải pháp lớn hơn.

## 3. Phần Mềm Này Thay Thế Những Gì?

Gogs là giải pháp thay thế khả thi cho:

- GitHub (tự lưu trữ/Doanh nghiệp)
- GitLab (tự lưu trữ/Community Edition)
- Bitbucket Server
- Gitea (một fork của Gogs với các tính năng bổ sung)

## 4. Chức Năng Chính

Các tính năng chính của Gogs bao gồm:

- Lưu trữ kho lưu trữ Git với hỗ trợ HTTP/SSH
- Theo dõi vấn đề và milestone
- Pull request và đánh giá mã
- Quản lý người dùng và tổ chức
- Webhook và tích hợp
- Wiki tích hợp và trình soạn thảo tệp
- Hỗ trợ đa ngôn ngữ
- Nhẹ và nhanh, ngay cả trên hệ thống tài nguyên thấp

## 5. Ưu và Nhược Điểm

**Ưu điểm:**
- Cực kỳ nhẹ và tiết kiệm tài nguyên
- Thiết lập và cấu hình đơn giản
- Giao diện người dùng trực quan, sạch sẽ
- Cộng đồng tích cực và cập nhật thường xuyên
- Hỗ trợ nhiều cơ sở dữ liệu (SQLite, MySQL, PostgreSQL)
- Hỗ trợ Docker để triển khai dễ dàng

**Nhược điểm:**
- Thiếu một số tính năng nâng cao có trong GitLab (ví dụ: tích hợp CI/CD)
- Hệ sinh thái plugin/tiện ích mở rộng nhỏ hơn so với GitHub/GitLab
- Tự động hóa tích hợp hạn chế so với các lựa chọn thương mại

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

Hướng dẫn này bao gồm việc triển khai Gogs trên máy chủ Ubuntu 22.04 bằng Docker để đơn giản và đáng tin cậy.

### Yêu cầu:
- Máy chủ Ubuntu 22.04
- Docker và Docker Compose đã được cài đặt
- Tên miền trỏ đến máy chủ của bạn (tùy chọn nhưng khuyến nghị cho sản xuất)

### Bước 1: Cài đặt Docker và Docker Compose
Cập nhật hệ thống và cài đặt Docker:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker && sudo systemctl start docker
```

### Bước 2: Tạo Tệp Docker Compose
Tạo thư mục cho Gogs và điều hướng vào đó:
```bash
mkdir gogs && cd gogs
```

Tạo một tệp `docker-compose.yml`:
```yaml
version: '3'

services:
  gogs:
    image: gogs/gogs
    container_name: gogs
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "10022:22"
    volumes:
      - ./data:/data
    environment:
      - USER_UID=1000
      - USER_GID=1000
```

### Bước 3: Triển khai Gogs
Khởi động container với:
```bash
sudo docker-compose up -d
```

### Bước 4: Cấu hình Gogs
Mở trình duyệt và đi đến `http://your-server-ip:3000` (thay thế bằng tên miền của bạn nếu đã cấu hình). Làm theo trình hướng dẫn thiết lập:

1. **Cài đặt Cơ sở dữ liệu:** Sử dụng SQLite3 (mặc định, được lưu trữ trong `/data`).
2. **Cài đặt Chung:** Đặt URL ứng dụng, ví dụ: `http://your-domain.com:3000`.
3. **Tài khoản Quản trị:** Tạo người dùng quản trị.
4. Hoàn tất cài đặt.

### Bước 5 (Tùy chọn): Thiết lập Reverse Proxy (Nginx)
Để sử dụng trong sản xuất, hãy thiết lập Nginx làm reverse proxy. Cài đặt Nginx:
```bash
sudo apt install nginx -y
```

Tạo một tệp cấu hình mới:
```bash
sudo nano /etc/nginx/sites-available/gogs
```

Thêm nội dung sau, thay thế `your-domain.com` bằng tên miền thực tế của bạn:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Kích hoạt site và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/gogs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### Bước 6: Bảo mật với SSL (Tùy chọn nhưng Khuyến nghị)
Sử dụng Let's Encrypt để thêm HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Phiên bản Gogs của bạn hiện đã hoạt động và có thể truy cập một cách an toàn!

Để biết thêm tùy chỉnh, hãy tham khảo [tài liệu Gogs](https://gogs.io/docs) chính thức.