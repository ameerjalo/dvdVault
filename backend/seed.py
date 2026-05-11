from sqlmodel import Session, select

from database import engine, init_db
from models import Category, Product, User
from services import AuthService


CATEGORIES = [
    "Fiction",
    "Technology",
    "Business",
]

PRODUCTS = [
    ("The Silent Patient", "A psychological thriller about a woman's act of violence.", 14.99, 42, "Fiction",
     "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80"),
    ("Where the Crawdads Sing", "A coming-of-age mystery set in the marshes of North Carolina.", 12.50, 30, "Fiction",
     "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80"),
    ("Project Hail Mary", "A lone astronaut must save humanity from extinction.", 16.75, 25, "Fiction",
     "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80"),
    ("Clean Code", "A handbook of agile software craftsmanship by Robert C. Martin.", 34.99, 60, "Technology",
     "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80"),
    ("Designing Data-Intensive Applications", "Foundations for building reliable, scalable systems.", 49.99, 35, "Technology",
     "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80"),
    ("The Pragmatic Programmer", "Your journey to mastery, 20th anniversary edition.", 39.95, 50, "Technology",
     "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&q=80"),
    ("Fluent Python", "Clear, concise, and effective programming.", 54.99, 20, "Technology",
     "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80"),
    ("Atomic Habits", "An easy & proven way to build good habits and break bad ones.", 18.00, 80, "Business",
     "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80"),
    ("Zero to One", "Notes on startups, or how to build the future.", 22.50, 45, "Business",
     "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80"),
    ("The Lean Startup", "How constant innovation creates radically successful businesses.", 19.99, 38, "Business",
     "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&q=80"),
]

ADMIN_EMAIL = "admin@bytebooks.dev"
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
        print(f"Seeded {len(CATEGORIES)} categories, {len(PRODUCTS)} products.")
        print(f"Admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


if __name__ == "__main__":
    seed()
