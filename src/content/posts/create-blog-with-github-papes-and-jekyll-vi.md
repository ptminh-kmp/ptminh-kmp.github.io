---
title: Tạo blog cá nhân với Github Pages và Jekyll sử dụng theme Chirpy
description: >-
  Học cách cài đặt, cấu hình và triển khai theme Chirpy Jekyll cho blog của bạn. Hướng dẫn từng bước này bao gồm Dev Containers, thiết lập gốc, tùy chọn tùy chỉnh và các phương pháp triển khai như GitHub Actions.
author: minhpt
published: 2025-02-03
category: Self-hosted
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted]
lang: vi
---


Hướng dẫn này sẽ hướng dẫn bạn thiết lập và sử dụng theme Chirpy Jekyll cho trang web của bạn.

### 1. Chọn Điểm Bắt Đầu

* **Khuyến nghị:** Sử dụng **Chirpy Starter** để dễ dàng nâng cấp và cấu hình tối thiểu.
  * Trên GitHub, điều hướng đến [Chirpy Starter](https://github.com/cotes2020/chirpy-starter) và nhấp "Use this template."
  * Tạo một kho lưu trữ mới có tên `<tên_người_dùng>.github.io` (thay `<tên_người_dùng>` bằng tên người dùng GitHub thực tế của bạn). Điều này sẽ tự động cấu hình GitHub Pages để lưu trữ trang của bạn.

* **Dành cho Tùy chỉnh Nâng cao:** Fork kho lưu trữ theme chính ([Fork Kho Lưu Trữ Theme](https://tranglc.github.io/posts/getting-started/)).
  * **Lưu ý:** Tùy chọn này dành cho những người thoải mái với việc sửa đổi Jekyll. Bạn sẽ chịu trách nhiệm quản lý các bản cập nhật và xung đột tiềm ẩn.

### 2. Thiết Lập Môi Trường Phát Triển

* **Khuyến nghị (Windows):** Sử dụng **Dev Containers** để có môi trường cách ly và nhất quán.
  * **Cài đặt Docker:**
    * **Windows/macOS:** Cài đặt Docker Desktop từ [Docker](https://www.docker.com/products/docker-desktop/).
    * **Linux:** Cài đặt Docker Engine từ tài liệu chính thức của Docker.
  * **Cài đặt VS Code:** Tải xuống và cài đặt VS Code từ [code.visualstudio.com](https://code.visualstudio.com/).
  * **Cài đặt Extension Dev Containers:** Tìm kiếm "Remote - Containers" trong thị trường extension của VS Code và cài đặt.
  * **Clone vào Container:**
    * **Phương pháp 1 (Docker Desktop):** Mở VS Code và sử dụng lệnh "Clone Repository". Chọn kho lưu trữ mới tạo của bạn. VS Code sẽ hướng dẫn bạn tạo Dev Container và mở dự án bên trong nó.
    * **Phương pháp 2 (Docker Engine):** Clone kho lưu trữ cục bộ. Trong VS Code, mở thư mục và chọn "Reopen in Container." VS Code sẽ tạo và khởi động một container cho dự án của bạn.

* **Thiết lập Gốc (Hệ thống Unix-like):**

  * **Cài đặt Jekyll:** Làm theo hướng dẫn cài đặt Jekyll chính thức: [Jekyll Installation](https://jekyllrb.com/docs/installation/).
  * **Cài đặt Git:** Nếu chưa có, hãy cài đặt Git từ [git-scm.com](https://git-scm.com/).
  * **Clone Kho Lưu Trữ của Bạn:** Sử dụng Git để clone kho lưu trữ đã chọn (Starter hoặc theme đã fork) vào máy cục bộ của bạn.
  * **Khởi tạo (nếu đã fork):** Nếu bạn đã fork theme, chạy `bash tools/init.sh` trong thư mục gốc để khởi tạo kho lưu trữ.
  * **Cài đặt Phụ thuộc:** Chạy `bundle` trong thư mục gốc của kho lưu trữ để cài đặt các gem Ruby cần thiết.

### 3. Chạy Trang Cục Bộ

* **Khởi động Máy Chủ Jekyll:** Thực hiện lệnh sau trong terminal của bạn:

```bash
bundle exec jekyll s
```

* **Truy cập Trang của Bạn:** Mở trình duyệt web và điều hướng đến `http://127.0.0.1:4000/`.

### 4. Tùy Chỉnh

* **Cấu hình:** Chỉnh sửa tệp `_config.yml` để điều chỉnh cài đặt:
  * `url`: URL gốc của trang web của bạn (ví dụ: `https://yourdomain.com`).
  * `title`: Tiêu đề trang web của bạn.
  * `author`: Tên hoặc bút danh của bạn.
  * `avatar`: URL ảnh đại diện của bạn.
  * `timezone`: Múi giờ địa phương của bạn.
  * `lang`: Ngôn ngữ của trang web (ví dụ: `en`, `vi`).
  * **Lưu ý:** Tham khảo tệp `_config.yml` để biết danh sách đầy đủ các tùy chọn có sẵn.

* **Liên hệ Xã hội:**
  * Chỉnh sửa tệp `_data/contact.yml` để bật hoặc tắt các liên kết mạng xã hội (ví dụ: Twitter, GitHub, LinkedIn).
  * Thêm hoặc xóa các tài khoản mạng xã hội khi cần.

* **Kiểu dáng:**
  * Tùy chỉnh bảng định kiểu bằng cách sửa đổi `assets/css/jekyll-theme-chirpy.scss`.
  * Thêm CSS tùy chỉnh của bạn ở cuối tệp để tránh xung đột trong các bản cập nhật theme trong tương lai.

* **Tài nguyên Tĩnh:**
  * **Tùy chỉnh:** Sửa đổi hoặc thay thế các tài nguyên tĩnh hiện có (hình ảnh, JavaScript, v.v.) trong thư mục `assets`.
  * **Tự lưu trữ:**
    * Tham khảo kho lưu trữ `_chirpy-static-assets_` để biết hướng dẫn tự lưu trữ tài nguyên tĩnh nhằm cải thiện hiệu suất và kiểm soát.
    * Cập nhật URL CDN trong `_data/origin/cors.yml` để trỏ đến tài nguyên tự lưu trữ của bạn.

### 5. Triển Khai Trang

* **GitHub Pages với GitHub Actions (Khuyến nghị):**

  * **Đảm bảo Kho lưu trữ Công khai:** Nếu sử dụng gói GitHub miễn phí, kho lưu trữ của bạn phải là công khai.
  * **Tương thích Nền tảng (nếu sử dụng `Gemfile.lock`):** Nếu máy cục bộ của bạn không phải Linux, hãy cập nhật danh sách nền tảng trong `Gemfile.lock` của bạn:

```bash
bundle lock --add-platform x86_64-linux
```

* **Cấu hình GitHub Pages:**
  * Trong kho lưu trữ GitHub của bạn, vào **Settings** -> **Pages**.
  * Trong phần **Source**, chọn **"GitHub Actions"** từ menu thả xuống.

* **Triển khai:** Đẩy các thay đổi của bạn lên GitHub. Quy trình làm việc GitHub Actions sẽ tự động xây dựng và triển khai trang của bạn.

* **Triển khai Thủ công:**

  * **Xây dựng Trang:** Chạy lệnh sau trong terminal của bạn:

```bash
JEKYLL_ENV=production bundle exec jekyll b
```

> **Tải Tệp Lên:** Các tệp trang đã tạo sẽ nằm trong thư mục `_site`. Tải nội dung của thư mục này lên máy chủ web của bạn (ví dụ: sử dụng FTP, SFTP hoặc rsync).
{: .prompt-info }

**Video**

<iframe width="100%" height="468" src="https://www.youtube.com/embed/hKMF9LXlO7w" title="YouTube video player" frameborder="0" allowfullscreen></iframe>

**Những Lưu Ý Quan Trọng**

* **Project Sites:** Nếu bạn đang sử dụng GitHub Project site hoặc tên miền tùy chỉnh, bạn có thể cần điều chỉnh `baseurl` trong `_config.yml`. Ví dụ: nếu tên dự án của bạn là "my-blog," hãy đặt `baseurl: "/my-blog"`.
* **Tham khảo Tài liệu:** Để biết thông tin chi tiết, hãy tham khảo tài liệu chính thức của Chirpy và tài liệu Jekyll.