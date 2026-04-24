---
lang: vi
title: "Awesome Self-Hosted: Hướng Dẫn Tài Nguyên Tự Lưu Trữ Mã Nguồn Mở Tối Ưu"
description: "Khám phá awesome-selfhosted/awesome-selfhosted - kho lưu trữ GitHub toàn diện với hơn 243k sao, bao gồm phần mềm miễn phí cho các giải pháp thay thế tự lưu trữ cho các dịch vụ phổ biến."
published: 2025-08-24
tags: ['open-source', 'self-host', 'github', 'free-software', 'server', 'privacy', 'docker', 'devops']
category: Self-hosted
author: minhpt
---

# awesome-selfhosted/awesome-selfhosted - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/awesome-selfhosted/awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted)
- **Sao:** 243297
- **Giấy phép:** Nhiều loại (Danh sách tuyển chọn)
- **Cập nhật Lần cuối:** Tháng 8, 2025

## 2. Mô Tả Dự Án

Awesome Self-Hosted không phải là một ứng dụng phần mềm đơn lẻ mà là một kho lưu trữ GitHub được tuyển chọn tỉ mỉ, phục vụ như thư mục xác định cho phần mềm miễn phí và mã nguồn mở có thể được tự lưu trữ trên máy chủ cá nhân. Bộ sưu tập toàn diện này trải dài trên nhiều danh mục bao gồm công cụ giao tiếp, máy chủ phương tiện, chia sẻ tệp, bộ ứng dụng năng suất và công cụ phát triển. Với hơn 243.000 sao, nó đại diện cho tài nguyên lớn nhất được cộng đồng xác nhận để khám phá các lựa chọn thay thế có thể tự lưu trữ cho các sản phẩm SaaS thương mại.

## 3. Phần Mềm Này Thay Thế Những Gì?

Kho lưu trữ cung cấp các giải pháp thay thế cho nhiều dịch vụ thương mại phổ biến bao gồm:

- **Google Drive/Dropbox:** Nextcloud, ownCloud, Seafile
- **Spotify/Apple Music:** Funkwhale, Airsonic, Navidrome
- **Slack/Discord:** Mattermost, Rocket.Chat, Matrix
- **Trello/Asana:** Wekan, Taiga, Focalboard
- **Netflix/Plex:** Jellyfin, Emby, Plex (giải pháp thay thế mã nguồn mở)
- **Google Docs/Office 365:** OnlyOffice, Collabora Online, Etherpad
- **Twitter/Facebook:** Mastodon, Pleroma, Friendica
- **GitHub/GitLab:** Gitea, Forgejo, GitLab CE

## 4. Chức Năng Chính

Kho lưu trữ hoạt động như một chỉ mục được phân loại với:

- **Danh sách Phân loại:** Được tổ chức thành hơn 40 danh mục từ "Nền tảng Blog" đến "Wiki"
- **Lọc Chất lượng:** Chỉ bao gồm phần mềm được bảo trì tích cực và thực sự có thể tự lưu trữ
- **Thông tin Giấy phép:** Ghi nhãn rõ ràng về giấy phép phần mềm (AGPL, MIT, GPL, v.v.)
- **Chi tiết Công nghệ:** Bao gồm thông tin về các công nghệ yêu cầu (Python, Node.js, Docker, v.v.)
- **Đánh giá Cộng đồng:** Chỉ số chất lượng ngầm thông qua sao GitHub và hoạt động
- **Cập nhật Thường xuyên:** Được duy trì bởi sự đóng góp của cộng đồng và đánh giá định kỳ

## 5. Ưu và Nhược Điểm

**Ưu điểm:**
- 🟢 Bộ sưu tập khổng lồ bao phủ hầu hết mọi nhu cầu tự lưu trữ
- 🟢 Đảm bảo chất lượng được cộng đồng xác nhận
- 🟢 Cập nhật thường xuyên và bổ sung mới
- 🟢 Thông tin giấy phép rõ ràng cho mỗi dự án
- 🟢 Phân loại và khả năng tìm kiếm tuyệt vời
- 🟢 Hoàn toàn miễn phí và mã nguồn mở

**Nhược điểm:**
- 🔴 Có thể gây choáng ngợp cho người mới bắt đầu do số lượng lớn
- 🔴 Không có công cụ cài đặt tích hợp (chỉ là một thư mục)
- 🔴 Chất lượng khác nhau giữa các dự án được liệt kê
- 🔴 Yêu cầu kiến thức kỹ thuật để triển khai giải pháp
- 🔴 Không có hỗ trợ hoặc tài liệu tập trung

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

Vì awesome-selfhosted là một thư mục chứ không phải một ứng dụng đơn lẻ, đây là cách thiết lập một ứng dụng tự lưu trữ điển hình từ danh sách bằng Docker (sử dụng Nextcloud làm ví dụ):

### Yêu cầu
- Máy chủ Ubuntu 22.04 LTS
- Docker và Docker Compose đã được cài đặt
- Tên miền trỏ đến máy chủ của bạn (tùy chọn nhưng khuyến nghị)

### Bước 1: Cài đặt Docker
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose
sudo apt install docker-compose-plugin -y

# Thêm người dùng vào nhóm docker
sudo usermod -aG docker $USER
newgrp docker
```

### Bước 2: Tạo Tệp Docker Compose cho Nextcloud
```bash
mkdir nextcloud && cd nextcloud
nano docker-compose.yml
```

Dán cấu hình sau:
```yaml
version: '3'

services:
  nextcloud:
    image: nextcloud:latest
    restart: always
    ports:
      - 8080:80
    volumes:
      - nextcloud_data:/var/www/html
    environment:
      - MYSQL_HOST=db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=your_secure_password

  db:
    image: mariadb:10.6
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=root_secure_password
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=your_secure_password
    volumes:
      - db_data:/var/lib/mysql

volumes:
  nextcloud_data:
  db_data:
```

### Bước 3: Triển khai Nextcloud
```bash
# Khởi động các container
docker compose up -d

# Kiểm tra trạng thái
docker compose ps
```

### Bước 4: Truy cập và Cấu hình
Mở trình duyệt và điều hướng đến `http://your-server-ip:8080`. Hoàn tất trình hướng dẫn thiết lập bằng cách tạo tài khoản quản trị và cấu hình kết nối cơ sở dữ liệu của bạn.

### Các Cân nhắc Bổ sung
- **Reverse Proxy:** Thiết lập Nginx hoặc Traefik cho SSL và định tuyến tên miền
- **Sao lưu:** Thực hiện sao lưu thường xuyên các ổ đĩa Docker của bạn
- **Cập nhật:** Thường xuyên cập nhật container của bạn với `docker compose pull && docker compose up -d`

Đối với các ứng dụng khác được liệt kê trong awesome-selfhosted, hãy kiểm tra tài liệu của từng dự án để biết các yêu cầu cài đặt cụ thể, vì chúng có thể yêu cầu các công nghệ khác nhau như Node.js, Python hoặc hệ thống cơ sở dữ liệu cụ thể.