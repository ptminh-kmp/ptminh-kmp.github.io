---
lang: vi
title: Ví Dụ Expressive Code
published: 2024-04-10
description: Các khối mã trông như thế nào trong Markdown sử dụng Expressive Code.
tags: [Markdown, Blogging, Demo]
category: Examples
draft: false
---

Ở đây, chúng ta sẽ khám phá cách các khối mã hiển thị bằng [Expressive Code](https://expressive-code.com/). Các ví dụ được cung cấp dựa trên tài liệu chính thức, bạn có thể tham khảo để biết thêm chi tiết.

## Expressive Code

### Tô Màu Cú Pháp

[Tô Màu Cú Pháp](https://expressive-code.com/key-features/syntax-highlighting/)

#### Tô màu cú pháp thông thường

```js
console.log('Mã này được tô màu cú pháp!')
```

#### Hiển thị chuỗi thoát ANSI

```ansi
Màu ANSI:
- Thường: [31mĐỏ[0m [32mXanh lá[0m [33mVàng[0m [34mXanh dương[0m [35mTím[0m [36mXanh cyan[0m
- Đậm:   [1;31mĐỏ[0m [1;32mXanh lá[0m [1;33mVàng[0m [1;34mXanh dương[0m [1;35mTím[0m [1;36mXanh cyan[0m
- Mờ:    [2;31mĐỏ[0m [2;32mXanh lá[0m [2;33mVàng[0m [2;34mXanh dương[0m [2;35mTím[0m [2;36mXanh cyan[0m

256 màu (hiển thị màu 160-177):
[38;5;160m160 [38;5;161m161 [38;5;162m162 [38;5;163m163 [38;5;164m164 [38;5;165m165[0m
[38;5;166m166 [38;5;167m167 [38;5;168m168 [38;5;169m169 [38;5;170m170 [38;5;171m171[0m
[38;5;172m172 [38;5;173m173 [38;5;174m174 [38;5;175m175 [38;5;176m176 [38;5;177m177[0m

Màu RGB đầy đủ:
[38;2;34;139;34mForestGreen - RGB(34, 139, 34)[0m

Định dạng văn bản: [1mĐậm[0m [2mMờ[0m [3mNghiêng[0m [4mGạch chân[0m
```

### Khung Trình Soạn Thảo & Terminal

[Khung Trình Soạn Thảo & Terminal](https://expressive-code.com/key-features/frames/)

#### Khung trình soạn thảo mã

```js title="my-test-file.js"
console.log('Ví dụ thuộc tính Title')
```

---

```html
<!-- src/content/index.html -->
Ví dụ bình luận tên tệp
```

#### Khung terminal

```bash
echo "Khung terminal này không có tiêu đề"
```

---

```powershell title="Ví dụ terminal PowerShell"
Write-Output "Cái này có tiêu đề!"
```

#### Ghi đè loại khung

```sh frame="none"
echo "Nhìn này, không có khung!"
```

---

```ps frame="code" title="PowerShell Profile.ps1"
# Nếu không ghi đè, đây sẽ là khung terminal
function Watch-Tail { Get-Content -Tail 20 -Wait $args }
New-Alias tail Watch-Tail
```

### Đánh Dấu Văn Bản & Dòng

[Đánh Dấu Văn Bản & Dòng](https://expressive-code.com/key-features/text-markers/)

#### Đánh dấu toàn bộ dòng & phạm vi dòng

```js {1, 4, 7-8}
// Dòng 1 - được đánh dấu bằng số dòng
// Dòng 2
// Dòng 3
// Dòng 4 - được đánh dấu bằng số dòng
// Dòng 5
// Dòng 6
// Dòng 7 - được đánh dấu bằng phạm vi "7-8"
// Dòng 8 - được đánh dấu bằng phạm vi "7-8"
```

#### Chọn loại đánh dấu dòng (mark, ins, del)

```js title="line-markers.js" del={2} ins={3-4} {6}
function demo() {
  console.log('dòng này được đánh dấu là đã xóa')
  // Dòng này và dòng tiếp theo được đánh dấu là đã thêm
  console.log('đây là dòng thứ hai được thêm vào')

  return 'dòng này sử dụng loại đánh dấu mặc định trung tính'
}
```

#### Thêm nhãn cho đánh dấu dòng

```jsx {"1":5} del={"2":7-8} ins={"3":10-12}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}
  value={value}
  className={buttonClassName}
  disabled={disabled}
  active={active}
>
  {children &&
    !active &&
    (typeof children === 'string' ? <span>{children}</span> : children)}
</button>
```

#### Thêm nhãn dài trên dòng riêng

```jsx {"1. Cung cấp giá trị prop ở đây:":5-6} del={"2. Xóa trạng thái disabled và active:":8-10} ins={"3. Thêm dòng này để hiển thị children bên trong button:":12-15}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}

  value={value}
  className={buttonClassName}

  disabled={disabled}
  active={active}

>

  {children &&
    !active &&
    (typeof children === 'string' ? <span>{children}</span> : children)}
</button>
```

#### Sử dụng cú pháp giống diff

```diff
+dòng này sẽ được đánh dấu là đã thêm
-dòng này sẽ được đánh dấu là đã xóa
đây là dòng thông thường
```

---

```diff
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
+đây là một tệp diff thực tế
-tất cả nội dung sẽ không bị sửa đổi
không có khoảng trắng nào bị loại bỏ
```

#### Kết hợp tô màu cú pháp với cú pháp giống diff

```diff lang="js"
  function thisIsJavaScript() {
    // Toàn bộ khối này được tô màu như JavaScript,
    // và chúng ta vẫn có thể thêm đánh dấu diff!
-   console.log('Mã cũ cần xóa')
+   console.log('Mã mới sáng bóng!')
  }
```

#### Đánh dấu văn bản riêng lẻ trong dòng

```js "văn bản đã cho"
function demo() {
  // Đánh dấu bất kỳ văn bản nào trong dòng
  return 'Nhiều kết quả khớp của văn bản đã cho được hỗ trợ';
}
```

#### Biểu thức chính quy

```ts /ye[sp]/
console.log('Các từ yes và yep sẽ được đánh dấu.')
```

#### Thoát dấu gạch chéo

```sh /\/ho.*\//
echo "Test" > /home/test.txt
```

#### Chọn loại đánh dấu trong dòng (mark, ins, del)

```js "return true;" ins="đã chèn" del="đã xóa"
function demo() {
  console.log('Đây là các loại đánh dấu đã chèn và đã xóa');
  // Câu lệnh return sử dụng loại đánh dấu mặc định
  return true;
}
```

### Ngắt Dòng Tự Động

[Ngắt Dòng Tự Động](https://expressive-code.com/key-features/word-wrap/)

#### Cấu hình ngắt dòng theo khối

```js wrap
// Ví dụ với ngắt dòng
function getLongString() {
  return 'Đây là một chuỗi rất dài có thể sẽ không vừa với không gian có sẵn trừ khi container cực kỳ rộng'
}
```

---

```js wrap=false
// Ví dụ với wrap=false
function getLongString() {
  return 'Đây là một chuỗi rất dài có thể sẽ không vừa với không gian có sẵn trừ khi container cực kỳ rộng'
}
```

#### Cấu hình thụt lề cho dòng ngắt

```js wrap preserveIndent
// Ví dụ với preserveIndent (được bật mặc định)
function getLongString() {
  return 'Đây là một chuỗi rất dài có thể sẽ không vừa với không gian có sẵn trừ khi container cực kỳ rộng'
}
```

---

```js wrap preserveIndent=false
// Ví dụ với preserveIndent=false
function getLongString() {
  return 'Đây là một chuỗi rất dài có thể sẽ không vừa với không gian có sẵn trừ khi container cực kỳ rộng'
}
```

## Phần Có Thể Thu Gọn

[Phần Có Thể Thu Gọn](https://expressive-code.com/plugins/collapsible-sections/)

```js collapse={1-5, 12-14, 21-24}
// Tất cả mã thiết lập boilerplate này sẽ được thu gọn
import { someBoilerplateEngine } from '@example/some-boilerplate'
import { evenMoreBoilerplate } from '@example/even-more-boilerplate'

const engine = someBoilerplateEngine(evenMoreBoilerplate())

// Phần mã này sẽ hiển thị theo mặc định
engine.doSomething(1, 2, 3, calcFn)

function calcFn() {
  // Bạn có thể có nhiều phần thu gọn
  const a = 1
  const b = 2
  const c = a + b

  // Phần này sẽ vẫn hiển thị
  console.log(`Kết quả tính toán: ${a} + ${b} = ${c}`)
  return c
}

// Tất cả mã này đến cuối khối sẽ được thu gọn lại
engine.closeConnection()
engine.freeMemory()
engine.shutdown({ reason: 'Kết thúc ví dụ mã boilerplate' })
```

## Số Dòng

[Số Dòng](https://expressive-code.com/plugins/line-numbers/)

### Hiển thị số dòng theo khối

```js showLineNumbers
// Khối mã này sẽ hiển thị số dòng
console.log('Lời chào từ dòng 2!')
console.log('Tôi đang ở dòng 3')
```

---

```js showLineNumbers=false
// Số dòng bị tắt cho khối này
console.log('Xin chào?')
console.log('Xin lỗi, bạn có biết tôi đang ở dòng nào không?')
```

### Thay đổi số dòng bắt đầu

```js showLineNumbers startLineNumber=5
console.log('Lời chào từ dòng 5!')
console.log('Tôi đang ở dòng 6')
```
