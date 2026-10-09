---
lang: vi
title: "AutoHarness: Lớp Skill Tự Học cho Claude Code"
description: "autoharness của Tigerless Labs cho phép Claude Code tự học skill từ các phiên làm việc thật, gộp các skill trùng lặp, và archive những skill không còn dùng — không cần daemon, không cần benchmark."
published: 2026-10-09
category: AI
tags: ["Claude Code", "AI Agents", "Skills", "Self-learning", "Anthropic", "MCP", "Mã nguồn mở", "AutoHarness"]
author: minhpt
mermaid: true

---

*Mỗi thế hệ model mới, chúng ta lại dựng lại harness bằng tay — prompt, tool, lớp scaffolding biến model thô thành một agent hoạt động được. Model thì tốt lên, còn harness quanh nó thì bị viết lại từ đầu. AutoHarness đặt cược vào một mảnh của bài toán đó: nếu lớp skill có thể tự duy trì chính nó thì sao?*

## AutoHarness là gì?

**autoharness** là một lớp skill tự học cho **Claude Code**, được xây bởi **Tigerless Labs** (giấy phép MIT). Nó quan sát chính những phiên bạn đang làm việc, chắt lọc thành skill, và quản lý cả vòng đời của chúng:

- **Học** skill từ các phiên thật — không cần một vòng thu thập dữ liệu hay replay riêng
- **Gộp** các skill cùng tình huống lại làm một, thay vì xếp chồng các bản gần giống nhau
- **Cập nhật** skill ngay trong lúc dùng (một chỉnh sửa trở thành một bản patch, không phải skill mới)
- **Dọn bỏ** những skill không còn được dùng
- **Chỉ chạm vào skill do chính nó tạo ra** — skill bạn tự viết được giữ nguyên tuyệt đối

Điểm đáng chú ý nhất là con số mở đầu: **cùng model, harness khác — 42% → 78% trên CORE-Bench**. Đây chính là luận điểm "Big Model vs Big Harness" của swyx trong thực tế. Harness làm phần lớn công việc, vậy mà nó vẫn bị dựng lại bằng tay mỗi thế hệ. autoharness đặt cược rằng ít nhất lớp skill có thể tự duy trì.

## Bốn vấn đề nó thực sự giải quyết

Hầu hết ý tưởng "bộ nhớ cho agent" đều chết ở ba lỗi giống nhau: không bao giờ xoá gì, trùng lặp chồng chất, và không có tín hiệu trung thực xem có ích gì không. AutoHarness nói rất rõ về những điều này:

1. **Học từ công việc thật.** Việc suy ngẫm (reflection) kích hoạt sau một ngưỡng số lần gọi tool trong phiên — không theo đồng hồ, không theo những lượt chỉ trò chuyện. Một đoạn làm việc thật sẽ kích hoạt; một cuộc hội thoại thì không.
2. **Gộp thay vì tích trữ.** Một tình huống mới không tự động sinh ra skill mới. Reflector so nó với thư viện hiện có và gộp các skill cùng tình huống làm một — đồng thời ghi lại skill nào đã hấp thụ skill nào, nên một lần gộp không bao giờ bị nhầm thành một cái chết.
3. **Kiểm chứng khi dùng, không theo benchmark.** Một skill tồn tại được nhờ việc nó *được tuân theo* ở các lượt sau (số lần được load trên số request mà nó đã có mặt). Không cần oracle trên đường chạy, không tốn token cho một bài eval riêng.
4. **Luôn để thư viện của nó trong tầm mắt.** Mỗi phiên mở đầu bằng một index đã nhóm của các skill nó viết, nên việc nhớ lại không phụ thuộc vào việc host có tình cờ đề xuất chúng hay không. Cơ chế recall gốc của host vẫn nguyên vẹn; index chỉ được thêm lên trên.

## Nó hoạt động thế nào

AutoHarness chạy như một pipeline bên cạnh Claude Code, và mọi thứ nó làm đều đáp xuống đĩa dưới dạng file thường:

| Thành phần | Vai trò |
|---|---|
| **CAP** (capture) | Ống dẫn do hook: lấy từng lượt, redact khi xuất. Giữ trigger — đếm số lần gọi tool một cách tất định. |
| **REF** (reflect) | Đọc episode, so với index skill, quyết định add / merge / patch / delete. Chỉ đề xuất — không có tool ghi. |
| **promoter** | Người ghi duy nhất. Lint ý định (an toàn, cấu trúc, đầy đủ, chỉ-đồ-tự-viết) rồi rename nguyên tử vào thư mục skill thật. |
| **IDX** (surface) | Dựng index đầu phiên của các skill tự viết, nhóm theo category. |
| **MNG** (lifecycle) | Vòng đời không daemon: tính lại lười biếng mỗi phiên một lần. Xếp hạng skill theo tần suất dùng. |
| **curator** | Lượt chạy toàn thư viện, hiếm hơn — gộp các bản gần trùng dưới một umbrella. |
| **LED** (ledger) | Sidecar append-only cho từng skill: vì sao nó ra đời hay thay đổi, kèm bằng chứng. |

Một skill học được là file `SKILL.md` thường trong `.claude/skills/` — không có gì độc quyền. Bên cạnh nó:

```
.claude/skills/<name>/
  SKILL.md                     # chính skill đó — định dạng native
  .ledger.jsonl                # vì sao ra đời / thay đổi (append-only)
  .sidecar.json                # bộ đếm vòng đời
  references/evidence-*.md     # lát transcript đã redact làm bằng chứng
  scripts/ templates/ ...      # file hỗ trợ tuỳ chọn
```

Phần tôi thích nhất là `.ledger.jsonl`: mỗi lần tạo/cập nhật đều ghi lại tình huống và quyết định kèm con trỏ tới bằng chứng thật (đã redact) — nguyên liệu để dựng benchmark từ dữ liệu dùng thật *nếu sau này bạn muốn*.

## Một skill tồn tại được nhờ gì

Thiết kế vòng đời là chỗ AutoHarness thể hiện quan điểm rõ nhất:

- **Thử việc (probation):** skill mới vẫn được recall bình thường nhưng chưa thể bị archive cho tới khi có đủ mẫu request (100 ở lớp project, 300 ở lớp global).
- **Tốt nghiệp (graduation):** khi đủ chín, skill chỉ bị archive nếu nó *chưa từng được load và chưa từng được view*. "Không có bằng chứng dùng" được coi là khác với "bằng chứng là không dùng".
- **Cạnh tranh sức chứa:** sau khi tốt nghiệp, cách chết duy nhất là hết chỗ — không có gì bị archive cho tới khi pool "chín" của một lớp vượt hạn mức, khi đó các skill có tần suất thấp nhất ra đi trước.
- **Archive, không bao giờ xoá:** skill bị archive là một thư mục được chuyển ra khỏi tầm recall. Chuyển nó lại vào là nó sống dậy, nguyên vẹn lịch sử.

Ba bộ đếm được giữ tách bạch tuyệt đối: một **load** (model thực sự gọi skill — thứ duy nhất mà tỉ lệ sống tính đến), một **view** (một phiên đọc vào thư mục skill — có giá trị nhớ lại, nhưng không phải tuân theo), và một **patch** (skill được cải thiện, nên một load sau đó là "tái dùng sau khi cải tiến").

## Cài đặt và cấu hình

```
/plugin marketplace add tigerless-labs/autoharness
/plugin install autoharness@autoharness
```

Sau đó `/reload-plugins` (hoặc khởi động lại Claude Code). Nó yêu cầu **Python 3.11+ là `python3` trên PATH** và **không có dependency bên thứ ba** — chạy hoàn toàn bằng Python. Mặc định zero config; mọi thứ chỉnh được qua biến môi trường `AUTOHARNESS_*` (nhịp reflection, kích thước index, ngưỡng trưởng thành, hạn mức, thông báo).

Chỉ có đúng một thứ để gọi: **`/learn`** chắt lọc chính phiên bạn đang làm, đi qua đúng chuỗi đề xuất-và-kiểm chứng mà lượt chạy nền dùng.

## So sánh

| | Tăng vô hạn | Tự sửa có cổng offline | Timer + daemon | **autoharness** |
|---|---|---|---|---|
| Chặn biên lớp skill | Không | Có | Có | **Có** |
| Tín hiệu kiểm chứng | Không | Điểm benchmark | Bất hoạt theo đồng hồ | **Tuân theo khi dùng** |
| Bắt đầu lượt học | — | Batch offline | Thời gian rảnh / số ngày | **Công việc trong phiên** |
| Đưa thư viện của nó ra trước model | Không | Không | Có | **Có** |
| Cần benchmark/oracle | Không | Có | Không | **Không** |
| Cần daemon thường trú | Không | Không | Có | **Không** |

## Quan điểm của tôi

AutoHarness thú vị không hẳn vì con số CORE-Bench, mà vì các **ràng buộc thiết kế** của nó. Ba điểm nổi bật:

1. **Tuân theo thay vì benchmark.** Đo sự tồn tại bằng "skill này có thực sự được load khi nó có mặt hay không" là tín hiệu trung thực hơn nhiều so với một điểm số held-out — và không cần oracle.
2. **Vòng đời không daemon.** Mọi thứ tính lại lười biếng ở đầu phiên, nên không có gì thường trú phải trông coi, và một chiếc laptop đóng lại không làm skill của bạn già đi.
3. **Quyền sở hữu nghiêm ngặt.** Quy tắc "chỉ chạm vào thứ tôi viết" chính là thứ khiến nó có thể triển khai được. Một lớp học có thể viết lại skill bạn tự viết là một rủi ro; một lớp không làm được điều đó thì chỉ là một thủ thư hữu ích.

Đây cũng là một mô thức tôi nhận ra từ phía bên kia: runtime trợ lý của tôi cũng có một skill workshop với lượt review bộ sưu tập hàng tuần, viết lại, gộp và loại bỏ chính những skill *nó* tạo ra — và chỉ chạy khi mode tự trị cho phép. AutoHarness là cùng một ý tưởng, thu hẹp cho Claude Code và đẩy xa hơn với ledger, chỉ số tuân theo, và triết lý archive-không-xoá.

Nếu bạn chạy Claude Code hằng ngày và cứ phải dạy lại nó những bài học cũ, đây là thứ đáng xem. Bài kiểm tra thật không phải là benchmark — mà là sau một tháng, thư viện nó viết có trông giống công việc của bạn không.
