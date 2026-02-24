from PIL import Image, ImageDraw, ImageFont
import os
import sys

# 获取脚本所在目录的父目录（项目根目录）
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)

# 1. 打开现有图片
image_path = os.path.join(project_root, "app", "gallery", "elon.webp")
output_path = os.path.join(project_root, "app", "gallery", "elon_magazine_cover.png")

if not os.path.exists(image_path):
    print(f"错误：找不到图片文件 {image_path}")
    sys.exit(1)

img = Image.open(image_path)
# 如果图片是 RGBA 模式，转换为 RGB
if img.mode == 'RGBA':
    # 创建白色背景
    background = Image.new('RGB', img.size, (255, 255, 255))
    background.paste(img, mask=img.split()[3])  # 使用 alpha 通道作为 mask
    img = background
elif img.mode != 'RGB':
    img = img.convert('RGB')

draw = ImageDraw.Draw(img)

# 2. 设置字体 - 尝试使用系统字体，如果失败则使用默认字体
def get_font(size):
    """尝试加载字体，如果失败则使用默认字体"""
    # Windows 常见字体路径
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/timesbd.ttf",
    ]
    
    # 尝试加载字体文件
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
    
    # 如果都失败，使用默认字体
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

# 字体大小（根据图片尺寸调整）
img_width, img_height = img.size
main_title_font_size = int(img_width * 0.12)  # 主标题 - 更大
main_subtitle_font_size = int(img_width * 0.045)  # 主标题副标题 - 中等
role_title_font_size = int(img_width * 0.035)  # 角色标题 - 中等偏小
description_font_size = int(img_width * 0.022)  # 描述文字 - 很小

main_title_font = get_font(main_title_font_size)
main_subtitle_font = get_font(main_subtitle_font_size)
role_title_font = get_font(role_title_font_size)
description_font = get_font(description_font_size)

# 3. 定义文本内容和位置
main_title = "Elon Musk"
main_subtitle = "Inventor, Provocateur, Contradiction"

# 副标题组合，每个是 (主角色标题, 讽刺副标题, (x, y), title_color, desc_color)
# 位置根据图片尺寸动态调整，避免重叠
# 左边的文字往左移动（x坐标更小），确保不重合主标题区域
# 注意：避免文字挡住人物的衣服（人物通常在中间偏左位置）
subtitles = [
    ("PayPal Founder", "Laughs at the system while rewriting it", 
     (int(img_width * 0.02), None), (60, 80, 120), (100, 100, 120)),        # muted navy - 左边，y位置动态计算
    ("Interstellar Dreamer", "Mars plans, rockets everywhere", 
     (int(img_width * 0.55), int(img_height * 0.28)), (120, 30, 40), (140, 50, 60)),  # deep burgundy - 往下移动
    ("Neural Network Pioneer", "Turns sci-fi into messy reality", 
     (int(img_width * 0.02), int(img_height * 0.52)), (20, 60, 30), (40, 80, 50)),      # dark forest green - 左边，往下移动避免挡住衣服
    ("Father of Six", "Family chaos as daily fuel", 
     (int(img_width * 0.65), int(img_height * 0.48)), (150, 90, 60), (170, 110, 80)),       # warm brown - 往下移动，往右移动很多
    ("Social Media Manipulator", "Tweets like they own the world", 
     (int(img_width * 0.02), int(img_height * 0.75)), (80, 80, 90), (100, 100, 110)),  # slate gray - 左边
    ("AI Commentator", "Tech prophet or wave victim?", 
     (int(img_width * 0.55), int(img_height * 0.75)), (90, 20, 70), (110, 40, 90)),  # deep plum
]

# 4. 绘制主标题（居中，顶部）
main_title_bbox = draw.textbbox((0, 0), main_title, font=main_title_font)
main_title_width = main_title_bbox[2] - main_title_bbox[0]
main_title_x = (img_width - main_title_width) // 2
main_title_y = int(img_height * 0.02)

main_subtitle_bbox = draw.textbbox((0, 0), main_subtitle, font=main_subtitle_font)
main_subtitle_width = main_subtitle_bbox[2] - main_subtitle_bbox[0]
main_subtitle_x = (img_width - main_subtitle_width) // 2
main_subtitle_y = main_title_y + main_title_font_size + 8  # 减小间距，往上移动

# 计算主标题区域结束位置，确保内容标题不重合
main_subtitle_bbox_actual = draw.textbbox((main_subtitle_x, main_subtitle_y), main_subtitle, font=main_subtitle_font)
main_subtitle_bottom = main_subtitle_bbox_actual[3] + 20  # 加上一些间距

# 添加半透明背景以提高可读性（可选）
# 这里先不添加，保持简洁

draw.text((main_title_x, main_title_y), main_title, font=main_title_font, fill=(20, 20, 20))
draw.text((main_subtitle_x, main_subtitle_y), main_subtitle, 
          font=main_subtitle_font, fill=(60, 60, 60))

# 5. 绘制副标题组合 - 角色标题大，描述文字小
for title, subtitle, position, title_color, desc_color in subtitles:
    x, y = position
    
    # 如果y是None，则动态计算位置（确保不重合主标题）
    if y is None:
        y = main_subtitle_bottom
    
    # 绘制角色标题（较大）
    draw.text((x, y), title, font=role_title_font, fill=title_color)
    
    # 计算标题高度，描述文字放在下方（较小）
    title_bbox = draw.textbbox((0, 0), title, font=role_title_font)
    title_height = title_bbox[3] - title_bbox[1]
    
    # 描述文字使用更小的字体和更淡的颜色
    draw.text((x, y + title_height + 8), subtitle, font=description_font, fill=desc_color)

# 6. 保存最终图片
img.save(output_path, "PNG", quality=95)
print(f"✅ 杂志封面已保存到: {output_path}")
print(f"   图片尺寸: {img_width} x {img_height}")
