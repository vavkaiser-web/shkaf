"""Генерирует тестовые фото вещей для e2e-проверки загрузки и извлечения цвета."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "fixtures")
os.makedirs(OUT, exist_ok=True)


def sweater(path, color=(107, 34, 51), bg=(240, 233, 220)):
    img = Image.new("RGB", (900, 1100), bg)
    d = ImageDraw.Draw(img)
    # тень
    d.ellipse((190, 840, 710, 960), fill=(224, 215, 200))
    # корпус
    d.rounded_rectangle((270, 300, 630, 880), radius=48, fill=color)
    # плечи и рукава
    d.rounded_rectangle((170, 330, 300, 760), radius=52, fill=color)
    d.rounded_rectangle((600, 330, 730, 760), radius=52, fill=color)
    # горловина
    d.ellipse((390, 268, 510, 348), fill=bg)
    d.ellipse((402, 280, 498, 338), fill=(90, 28, 42))
    # манжеты и резинка
    d.rounded_rectangle((258, 840, 642, 890), radius=16, fill=(88, 27, 41))
    d.rounded_rectangle((178, 720, 296, 760), radius=12, fill=(88, 27, 41))
    d.rounded_rectangle((604, 720, 722, 760), radius=12, fill=(88, 27, 41))
    # блик
    d.rounded_rectangle((300, 330, 380, 800), radius=30, fill=(122, 45, 62))
    img.save(path, quality=90)
    print("saved", path)


def trousers(path, color=(30, 42, 68), bg=(236, 231, 222)):
    img = Image.new("RGB", (900, 1100), bg)
    d = ImageDraw.Draw(img)
    d.ellipse((200, 900, 700, 980), fill=(220, 212, 198))
    d.polygon([(320, 220), (580, 220), (640, 920), (470, 920), (450, 520), (430, 920), (260, 920)], fill=color)
    d.rectangle((320, 220, 580, 280), fill=(24, 34, 56))
    d.line((450, 300, 450, 500), fill=(20, 29, 48), width=5)
    d.line((330, 300, 340, 900), fill=(40, 55, 86), width=8)
    d.line((560, 300, 555, 900), fill=(40, 55, 86), width=8)
    img.save(path, quality=90)
    print("saved", path)


if __name__ == "__main__":
    sweater(os.path.join(OUT, "test-sweater.jpg"))
    trousers(os.path.join(OUT, "test-trousers.jpg"))
