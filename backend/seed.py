from sqlmodel import Session, select

from database import engine, init_db
from models import Category, Product, User
from services import AuthService


CATEGORIES = [
    "Action",
    "Sci-Fi",
    "Noir Classics",
    "Horror",
]

PRODUCTS = [
    ("The Dark Knight", "Christopher Nolan's definitive Batman saga — chaos meets order in Gotham.", 19.99, 42, "Action",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/qJ2tW6WMUDux911r6m7haRef0WH.jpg"),
    ("Mad Max: Fury Road", "A high-octane post-apocalyptic chase across the Wasteland.", 17.99, 35, "Action",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg"),
    ("John Wick", "A retired hitman returns for vengeance in stylized, choreographed fury.", 15.99, 50, "Action",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg"),
    ("Inception", "A thief who steals corporate secrets through dream-sharing technology.", 21.99, 38, "Sci-Fi",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"),
    ("Blade Runner 2049", "A young blade runner unearths a long-buried secret in a neon-drenched future.", 22.99, 28, "Sci-Fi",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"),
    ("Arrival", "A linguist races to communicate with extraterrestrial visitors before global war erupts.", 18.99, 32, "Sci-Fi",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg"),
    ("Chinatown", "Roman Polanski's neo-noir masterpiece of corruption in 1930s Los Angeles.", 16.99, 22, "Noir Classics",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/dKvWlw1Z8YeYpFmUyDjOpQwSjT9.jpg"),
    ("Double Indemnity", "Billy Wilder's archetypal noir — insurance fraud, murder, and seductive doom.", 14.99, 18, "Noir Classics",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/sNYobgGmpwhpgLh6IcZsAJEDjyV.jpg"),
    ("Hereditary", "Ari Aster's harrowing family horror that unspools into generational dread.", 19.99, 30, "Horror",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/p9ZUzCyy9wRTDuuQexkQ78R2BgF.jpg"),
    ("The Shining", "Stanley Kubrick's chilling adaptation of King's haunted-hotel nightmare.", 17.99, 40, "Horror",
     "https://image.tmdb.org/t/p/w600_and_h900_bestv2/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg"),
]

ADMIN_EMAIL = "admin@dvdvault.dev"
ADMIN_PASSWORD = "AdminPass123!"


def seed() -> None:
    init_db()
    with Session(engine) as session:
        existing = session.exec(select(Category)).first()
        if existing:
            print("Database already seeded — skipping.")
            return

        cat_map: dict[str, Category] = {}
        for name in CATEGORIES:
            category = Category(name=name)
            session.add(category)
            cat_map[name] = category
        session.commit()
        for category in cat_map.values():
            session.refresh(category)

        for name, desc, price, stock, cat_name, image_url in PRODUCTS:
            session.add(
                Product(
                    name=name,
                    description=desc,
                    price=price,
                    stock=stock,
                    image_url=image_url,
                    category_id=cat_map[cat_name].id,
                )
            )

        if not session.exec(select(User).where(User.email == ADMIN_EMAIL)).first():
            session.add(
                User(
                    email=ADMIN_EMAIL,
                    hashed_password=AuthService.get_password_hash(ADMIN_PASSWORD),
                    is_admin=True,
                )
            )

        session.commit()
        print(f"Seeded {len(CATEGORIES)} categories, {len(PRODUCTS)} films.")
        print(f"Admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


if __name__ == "__main__":
    seed()
