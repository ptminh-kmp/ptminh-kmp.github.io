---
lang: vi
title: "Gitea: Giải Pháp Git Tự Lưu Trữ Tối Ưu - Đánh Giá Hoàn Chỉnh và Hướng Dẫn Thiết Lập"
description: "Khám phá Gitea, nền tảng lưu trữ Git mã nguồn mở với hơn 50k sao GitHub. Tìm hiểu cách tự lưu trữ giải pháp thay thế GitHub của riêng bạn với hướng dẫn cài đặt chi tiết."
published: 2025-08-29
tags: ['open-source', 'self-host', 'git', 'golang', 'devops', 'ci-cd']
category: Self-hosted
author: minhpt
---

# go-gitea/gitea - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/go-gitea/gitea](https://github.com/go-gitea/gitea)
- **Sao:** 50281

## 2. Mô Tả Dự Án

Gitea là một dịch vụ Git tự lưu trữ dễ dàng, được viết bằng Go. Nó cung cấp một nền tảng phát triển phần mềm hoàn chỉnh bao gồm lưu trữ Git, đánh giá mã, cộng tác nhóm, kho lưu trữ gói và khả năng CI/CD. Được thiết kế để nhẹ và dễ triển khai, Gitea cung cấp một giải pháp thay thế hấp dẫn cho các dịch vụ lưu trữ Git thương mại trong khi vẫn cho bạn toàn quyền kiểm soát mã và cơ sở hạ tầng của mình.

## 3. Phần Mềm Này Thay Thế Những Gì?

Gitea là giải pháp thay thế trực tiếp cho:
- GitHub (phiên bản tự lưu trữ)
- GitLab Community Edition
- Bitbucket Server
- Gogs (từ đó Gitea được fork)
- Các giải pháp lưu trữ Git độc quyền khác

## 4. Chức Năng Chính

Gitea cung cấp một bộ tính năng toàn diện bao gồm:

**Lưu trữ Git:**
- Quản lý kho lưu trữ Git đầy đủ
- Hỗ trợ SSH và HTTP/HTTPS
- Quy tắc bảo vệ nhánh
- Webhook và truy cập API

**Công cụ Cộng tác:**
- Theo dõi vấn đề với milestone và nhãn
- Pull request với đánh giá mã
- Hệ thống tài liệu Wiki
- Bảng dự án (kiểu Kanban)

**Tính năng Bổ sung:**
- Kho lưu trữ gói tích hợp (hỗ trợ nhiều định dạng)
- Hệ thống CI/CD tích hợp
- Quản lý người dùng và tổ chức
- Nhiều phương pháp xác thực (OAuth, LDAP, SMTP)
- Giao diện đa ngôn ngữ

## 5. Ưu và Nhược Điểm

**Ưu điểm:**
- Cực kỳ nhẹ và nhanh (được viết bằng Go)
- Tiêu thụ tài nguyên thấp so với các lựa chọn thay thế
- Dễ triển khai và bảo trì
- Cộng đồng tích cực và cập nhật thường xuyên
- Bộ tính năng toàn diện
- Miễn phí và mã nguồn mở
- Hỗ trợ Docker

**Nhược điểm:**
- Hệ sinh thái nhỏ hơn so với GitHub/GitLab
- Ít tích hợp bên thứ ba hơn
- Các tính năng doanh nghiệp có thể yêu cầu cấu hình bổ sung
- Cộng đồng mặc định nhỏ hơn so với các lựa chọn thương mại

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

### Yêu cầu
- Máy chủ Ubuntu 20.04/22.04 LTS
- Tối thiểu 1GB RAM (khuyến nghị 2GB)
- Docker và Docker Compose đã được cài đặt
- Tên miền trỏ đến máy chủ của bạn

### Cài đặt Từng bước

**1. Cập nhật Gói Hệ thống**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Cài đặt Docker**
```bash
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker
```

**3. Tạo Tệp Docker Compose**
Tạo `docker-compose.yml`:
```yaml
version: '3'

services:
  server:
    image: gitea/gitea:latest
    container_name: gitea
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - DB_TYPE=sqlite3
    restart: always
    volumes:
      - ./gitea:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "3000:3000"
      - "2222:22"
```

**4. Triển khai Gitea**
```bash
mkdir gitea
docker-compose up -d
```

**5. Cấu hình Gitea**
Truy cập máy chủ của bạn tại `http://your-server-ip:3000` và hoàn tất thiết lập ban đầu:
- Đặt cơ sở dữ liệu thành SQLite3
- Cấu hình tên miền và cài đặt SSH
- Tạo tài khoản quản trị

**6. Thiết lập Reverse Proxy (Tùy chọn nhưng Khuyến nghị)**
Cài đặt Nginx:
```bash
sudo apt install nginx -y
```

Tạo cấu hình Nginx tại `/etc/nginx/sites-available/gitea`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt site:
```bash
sudo ln -s /etc/nginx/sites-available/gitea /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**7. Chứng chỉ SSL (Khuyến nghị)**
Cài đặt Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Phiên bản Gitea của bạn hiện đã sẵn sàng! Bạn có thể bắt đầu tạo kho lưu trữ, mời thành viên nhóm và tận hưởng giải pháp Git tự lưu trữ của mình.

### Bảo trì
- Sao lưu định kỳ: Sao lưu thư mục `./gitea`
- Cập nhật: `docker-compose pull && docker-compose up -d`
- Giám sát nhật ký: `docker logs gitea`

Gitea cung cấp sự cân bằng tuyệt vời giữa tính năng và hiệu suất, khiến nó trở thành lựa chọn lý tưởng cho các nhóm và cá nhân tìm kiếm giải pháp Git tự lưu trữ.