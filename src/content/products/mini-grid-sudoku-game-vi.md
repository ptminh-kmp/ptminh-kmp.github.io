---
title: "MiniGrid: Sudoku Game"
tagline: "Sudoku gọn nhẹ — từ khởi động 4×4 đến bàn cờ 9×9 kinh điển."
description: "Game Sudoku hiện đại, tối giản với ba kích thước bàn cờ 4×4, 6×6, 9×9, độ khó được chấm điểm thật sự đáng tin, thử thách hàng ngày kèm chuỗi ngày chơi, và bảng xếp hạng toàn cầu — chơi offline hoàn toàn, không cần tài khoản."
image: "/images/mini-sudoku/icon.png"
platform: "iOS, Android"
type: "Mobile Game"
techStack:
  - Flutter
  - Riverpod
  - Hive
  - Firebase Auth
  - Cloud Firestore
  - Firebase Remote Config
  - Google AdMob
status: "iOS (Android sắp ra mắt)"
demo: ""
appStoreUrl: "https://apps.apple.com/us/app/minigrid-sudoku-game/id6791644807"
playStoreUrl: ""
category: "Trò chơi"
tags:
  - sudoku
  - puzzle
  - flutter
  - indie dev
  - game
  - rèn luyện trí não
  - game offline
lang: vi
draft: false
---

Hầu hết các app Sudoku đều mặc định bạn có mười lăm phút rảnh để ngồi giải. Còn tôi thì thường không có mười lăm phút — chỉ có đúng khoảng thời gian một tách cà phê, hoặc lúc đứng xếp hàng ở nhà thuốc. Thứ tôi muốn là một app Sudoku có thể co giãn vừa với cả hai khoảng thời gian đó.

Nên thay vì làm thêm một app 9×9 giống hệt những cái đã có, tôi xây một app mà kích thước bàn cờ chính là "núm vặn" độ khó: bàn 4×4 giải xong trong chưa đầy một phút, bàn 6×6 vừa đủ một tách cà phê, và bàn 9×9 đầy đủ cho lúc bạn thực sự có thời gian ngồi nghiền ngẫm.

Đó chính là **MiniGrid: Sudoku Game**.

---

## MiniGrid Làm Được Gì

Chọn một kích thước bàn cờ — 4×4, 6×6, hoặc 9×9 — mỗi kích thước có riêng một chuỗi màn chơi đánh số từ dễ đến khó để bạn chinh phục dần. Vượt qua mỗi màn, bạn nhận được tối đa **3 sao**, tùy vào lượt chơi có "sạch" hay không: không sai, không dùng gợi ý là trọn vẹn 3 sao.

Chạm vào một ô, chạm vào một số. Undo và Redo giúp bạn lùi lại hoặc tiến tới qua từng nước đi, chế độ ghi chú (notes) cho phép bạn note nhanh các số khả dĩ trong một ô thay vì phải điền chắc chắn ngay, và nút xóa dọn sạch một ô bạn vừa đổi ý.

## Độ Khó Được Chấm Điểm Đáng Tin Cậy

Đây là điều làm tôi khó chịu ở phần lớn các bộ tạo đề Sudoku: họ chấm độ khó bằng cách đếm số ô trống. Đó là một thước đo rất tệ — một đề có 40 ô trống có thể cực dễ, còn một đề chỉ 30 ô trống lại có thể buộc bạn phải đoán mò thật sự.

MiniGrid chấm độ khó bằng cách thực sự giải đề theo đúng cách một người chơi sẽ giải, và theo dõi xem cần dùng những kỹ thuật nào:

| Độ khó | Kỹ thuật cần dùng |
| --- | --- |
| **Dễ** | Naked Single, Hidden Single |
| **Trung bình** | + Locked Candidate (pointing pairs) |
| **Khó** | + Naked Pair |
| **Cao thủ** | Các kỹ thuật trên không đủ — cần suy luận thực sự |

Nếu bộ giải phải rơi vào đoán mò, đề đó sẽ không được gắn nhãn "Dễ" chỉ vì tình cờ có nhiều ô gợi ý sẵn. Cái nhãn độ khó trên mỗi màn thực sự có ý nghĩa.

## Gợi Ý, Sai Sót, Và Đôi Khi Là Một Quảng Cáo Có Thưởng

Mỗi màn cho phép bạn sai tối đa 5 lần trước khi thua — hiển thị bằng các trái tim, để bạn luôn biết chính xác mình còn "vốn" bao nhiêu. Bạn cũng có 3 lượt gợi ý miễn phí mỗi màn nếu thực sự bí; xem một đoạn quảng cáo ngắn để nhận thêm gợi ý, hoặc để hồi sinh một màn vừa thua, chơi tiếp mà không cần làm lại từ đầu.

Không có gì trong số này là bắt buộc. Ghi chú, undo, và thang độ khó thường đã đủ để bạn tự gỡ bí mà không cần tốn một lượt gợi ý nào.

## Thử Thách Hàng Ngày & Chuỗi Ngày Chơi

Mỗi ngày, tất cả mọi người đều nhận cùng một đề — được gán một cách xác định trước, nên không có chuyện server tự chọn đề mới hay đề đổi giữa chừng lúc bạn đang chơi. Giải xong, chuỗi ngày chơi (streak) của bạn tăng lên; lỡ bỏ một ngày thì, nếu muốn, xem một quảng cáo có thưởng sẽ cho phép bạn quay lại giải bù đề của hôm qua trước khi chuỗi bị đứt.

Mỗi thử thách hàng ngày có bảng xếp hạng riêng, tách biệt với bảng xếp hạng của các màn thông thường, nên bạn đang thi đấu cùng một đề với tất cả những ai chơi hôm đó.

## Thi Đấu, Hoặc Không

Bạn không bao giờ cần tài khoản để chơi. Tiến trình được lưu ngay trên máy ngay khi bạn thực hiện một nước đi, nên bạn có thể tắt app giữa chừng và mở lại đúng chỗ mình dừng — không có màn hình đăng nhập nào chắn đường cả.

Đăng nhập chỉ cần thiết nếu bạn muốn thành tích của mình xuất hiện trên bảng xếp hạng. Bạn có thể đăng nhập bằng **Google** hoặc **Sign in with Apple**, hoặc giữ ẩn danh với hồ sơ khách (guest) và vẫn leo hạng dưới một cái tên không ai truy ngược được. Bắt đầu ẩn danh rồi sau đó liên kết tài khoản Google hay Apple cũng được — thành tích cũ vẫn giữ nguyên, không mất gì cả.

## Dữ Liệu Của Bạn Nằm Ở Đâu

| | Chi tiết |
| --- | --- |
| **Tiến trình giải đề** | Chỉ lưu trên máy, qua Hive — không bao giờ rời khỏi thiết bị của bạn |
| **Bảng xếp hạng & tài khoản** | Firebase Auth + Firestore — chỉ tạo ra nếu bạn chọn đăng nhập |
| **Cách đăng nhập** | Google, Sign in with Apple, hoặc khách ẩn danh |
| **Quảng cáo** | Google AdMob tiêu chuẩn, chỉ dùng cho gợi ý/hồi sinh tùy chọn |

## Xây Dựng Cho Những Lúc Chơi Nhanh, Hàng Ngày

Giao diện sáng, tối, hoặc theo hệ thống. Âm thanh và rung phản hồi có thể bật/tắt riêng biệt. Ngôn ngữ hiển thị tự động theo máy của bạn — tiếng Anh, tiếng Việt, tiếng Tây Ban Nha, tiếng Đức, và tiếng Bồ Đào Nha đều đã có sẵn, còn thêm ngôn ngữ khác đang được lên kế hoạch.

## Vì Sao Tôi Xây Dựng Nó Theo Cách Này

Dải kích thước bàn cờ tồn tại vì "ngồi xuống giải một đề đàng hoàng" và "tôi chỉ có chín mươi giây" đều là những cách chơi có thật, mà phần lớn app chỉ phục vụ được một trong hai. Bộ chấm độ khó tồn tại vì một màn được dán nhãn "Dễ" mà thực chất đòi hỏi đoán mò là một lời hứa suông với người chơi. Và mọi thứ hoạt động offline theo mặc định vì một trò chơi logic không nên cần một request mạng chỉ để mở lên.

---

## Dùng Thử Ngay

MiniGrid đã chính thức có mặt trên App Store (phiên bản Android sắp ra mắt). Không cần tài khoản để chơi — chỉ cần tải app về và bắt đầu điền số.

Có bug cần báo hay tính năng muốn đề xuất khi app ra mắt? Thông tin liên hệ của tôi sẽ có trong màn hình cài đặt của app ngay từ ngày phát hành. Tôi đọc mọi phản hồi gửi đến.
