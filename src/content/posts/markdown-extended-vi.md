---
lang: vi
title: Tính Năng Markdown Mở Rộng
published: 2024-05-01
updated: 2024-11-29
description: 'Đọc thêm về các tính năng Markdown trong Fuwari'
image: ''
tags: [Demo, Example, Markdown, Fuwari]
category: 'Examples'
draft: false 
---

## Thẻ Kho Lưu Trữ GitHub
Bạn có thể thêm các thẻ động liên kết đến kho lưu trữ GitHub, khi trang tải, thông tin kho lưu trữ được lấy từ API GitHub. 

::github{repo="Fabrizz/MMM-OnSpotify"}

Tạo thẻ kho lưu trữ GitHub với mã `::github{repo="<owner>/<repo>"}`.

```markdown
::github{repo="saicaca/fuwari"}
```

## Admonitions

Các loại admonitions sau được hỗ trợ: `note` `tip` `important` `warning` `caution`

:::note
Thông tin nổi bật mà người dùng nên lưu ý, ngay cả khi đọc lướt qua.
:::

:::tip
Thông tin tùy chọn giúp người dùng thành công hơn.
:::

:::important
Thông tin quan trọng cần thiết để người dùng thành công.
:::

:::warning
Nội dung quan trọng yêu cầu sự chú ý ngay lập tức do rủi ro tiềm ẩn.
:::

:::caution
Hậu quả tiêu cực tiềm ẩn của một hành động.
:::

### Cú Pháp Cơ Bản

```markdown
:::note
Thông tin nổi bật mà người dùng nên lưu ý, ngay cả khi đọc lướt qua.
:::

:::tip
Thông tin tùy chọn giúp người dùng thành công hơn.
:::
```

### Tiêu Đề Tùy Chỉnh

Tiêu đề của admonition có thể được tùy chỉnh.

:::note[TIÊU ĐỀ TÙY CHỈNH CỦA TÔI]
Đây là một note với tiêu đề tùy chỉnh.
:::

```markdown
:::note[TIÊU ĐỀ TÙY CHỈNH CỦA TÔI]
Đây là một note với tiêu đề tùy chỉnh.
:::
```

### Cú Pháp GitHub

> [!TIP]
> [Cú pháp GitHub](https://github.com/orgs/community/discussions/16925) cũng được hỗ trợ.

```
> [!NOTE]
> Cú pháp GitHub cũng được hỗ trợ.

> [!TIP]
> Cú pháp GitHub cũng được hỗ trợ.
```