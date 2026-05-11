import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from models import Category, Order, OrderItem, Product, User, WishlistItem
from schemas import (
    CartItemInput,
    CategoryCreate,
    ProductCreate,
    ProductUpdate,
    UserCreate,
)


def _load_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "").strip()
    if key:
        return key
    env = os.getenv("ENV", "development").lower()
    if env == "production":
        raise RuntimeError(
            "SECRET_KEY environment variable is required when ENV=production."
        )
    return "dev-secret-change-me-in-production"


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(
        subject: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        payload = {"sub": subject, "exp": expire}
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload.get("sub")
        except JWTError:
            return None


class UserService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_email(self, email: str) -> Optional[User]:
        return self.session.exec(select(User).where(User.email == email)).first()

    def create_user(self, data: UserCreate) -> User:
        user = User(
            email=data.email,
            hashed_password=AuthService.get_password_hash(data.password),
            is_admin=data.is_admin,
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(email)
        if not user or not AuthService.verify_password(password, user.hashed_password):
            return None
        return user


class CategoryService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, data: CategoryCreate) -> Category:
        category = Category(name=data.name)
        self.session.add(category)
        self.session.commit()
        self.session.refresh(category)
        return category

    def get_all(self) -> List[Category]:
        return list(self.session.exec(select(Category)).all())


class ProductService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, data: ProductCreate) -> Product:
        kwargs = data.model_dump(exclude_unset=True, exclude_none=True)
        product = Product(**kwargs)
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        return product

    def get_all(
        self,
        category_id: Optional[int] = None,
        search_query: Optional[str] = None,
    ) -> List[Product]:
        statement = select(Product)
        if category_id is not None:
            statement = statement.where(Product.category_id == category_id)
        if search_query:
            statement = statement.where(Product.name.ilike(f"%{search_query}%"))
        return list(self.session.exec(statement).all())

    def get(self, product_id: int) -> Optional[Product]:
        return self.session.get(Product, product_id)

    def update(self, product_id: int, data: ProductUpdate) -> Optional[Product]:
        product = self.session.get(Product, product_id)
        if product is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        return product

    def delete(self, product_id: int) -> bool:
        product = self.session.get(Product, product_id)
        if product is None:
            return False
        self.session.delete(product)
        self.session.commit()
        return True


class OrderError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class OrderService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_order(self, user_id: int, cart_items: List[CartItemInput]) -> Order:
        if not cart_items:
            raise OrderError("Cart is empty.", status_code=400)

        merged: dict[int, int] = {}
        for item in cart_items:
            merged[item.product_id] = merged.get(item.product_id, 0) + item.quantity

        priced: list[tuple[Product, int, float]] = []
        total = 0.0

        for product_id, quantity in merged.items():
            product = self.session.get(Product, product_id)
            if product is None:
                raise OrderError(
                    f"Product {product_id} no longer exists.", status_code=404
                )
            if product.stock < quantity:
                raise OrderError(
                    f"Insufficient stock for '{product.name}' (have {product.stock}, need {quantity}).",
                    status_code=409,
                )
            priced.append((product, quantity, product.price))
            total += product.price * quantity

        order = Order(user_id=user_id, status="pending", total_price=round(total, 2))
        self.session.add(order)
        self.session.flush()

        for product, quantity, unit_price in priced:
            product.stock -= quantity
            self.session.add(product)
            self.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    price_at_purchase=unit_price,
                )
            )

        order.status = "completed"
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return order

    def list_for_user(self, user_id: int) -> List[Order]:
        statement = (
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
        )
        return list(self.session.exec(statement).all())


class WishlistService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def toggle(self, user_id: int, product_id: int) -> bool:
        """Toggle an item. Returns True if added, False if removed."""
        existing = self.session.exec(
            select(WishlistItem)
            .where(WishlistItem.user_id == user_id)
            .where(WishlistItem.product_id == product_id)
        ).first()
        if existing:
            self.session.delete(existing)
            self.session.commit()
            return False
        item = WishlistItem(user_id=user_id, product_id=product_id)
        self.session.add(item)
        self.session.commit()
        return True

    def get_for_user(self, user_id: int) -> List[Product]:
        statement = (
            select(Product)
            .join(WishlistItem, WishlistItem.product_id == Product.id)
            .where(WishlistItem.user_id == user_id)
            .order_by(WishlistItem.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def product_ids_for_user(self, user_id: int) -> List[int]:
        statement = select(WishlistItem.product_id).where(
            WishlistItem.user_id == user_id
        )
        return list(self.session.exec(statement).all())


class StatsService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def total_revenue(self) -> float:
        orders = self.session.exec(
            select(Order).where(Order.status == "completed")
        ).all()
        return round(sum(order.total_price for order in orders), 2)

    def orders_last_7_days(self) -> List[dict]:
        today = datetime.now(timezone.utc).date()
        window_start = today - timedelta(days=6)
        statement = select(Order).where(Order.status == "completed")
        orders = list(self.session.exec(statement).all())

        buckets: dict[str, dict] = {}
        for i in range(7):
            day = window_start + timedelta(days=i)
            buckets[day.isoformat()] = {
                "date": day.isoformat(),
                "order_count": 0,
                "revenue": 0.0,
            }

        for order in orders:
            created = order.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            day = created.date()
            if day < window_start or day > today:
                continue
            bucket = buckets[day.isoformat()]
            bucket["order_count"] += 1
            bucket["revenue"] += order.total_price

        return [
            {
                "date": b["date"],
                "order_count": b["order_count"],
                "revenue": round(b["revenue"], 2),
            }
            for b in buckets.values()
        ]

    def stock_by_category(self) -> List[dict]:
        categories = list(self.session.exec(select(Category)).all())
        result: List[dict] = []
        for category in categories:
            products = list(
                self.session.exec(
                    select(Product).where(Product.category_id == category.id)
                ).all()
            )
            total = sum(p.stock for p in products)
            result.append(
                {
                    "category_id": category.id,
                    "category_name": category.name,
                    "total_stock": total,
                }
            )

        uncategorized = list(
            self.session.exec(
                select(Product).where(Product.category_id.is_(None))
            ).all()
        )
        if uncategorized:
            result.append(
                {
                    "category_id": None,
                    "category_name": "Uncategorized",
                    "total_stock": sum(p.stock for p in uncategorized),
                }
            )

        return result
